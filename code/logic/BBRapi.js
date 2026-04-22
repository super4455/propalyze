// logic/bbr.js
// Henter ejendomsdata fra BBR via Datafordeleren
// Credentials læses fra process.env (sat af dotenv i config.js)

console.log('BBR bruger:', process.env.BBR_USERNAME);
console.log('BBR password:', process.env.BBR_PASSWORD ? 'sat' : 'MANGLER');

const BBR_BASE = 'https://services.datafordeler.dk/BBR/BBRPublic/1/rest';

// Oversætter BBR's anvendelseskoder til læsbar tekst
const EJENDOMSTYPER = {
  '110': 'Stuehus til landbrug',
  '120': 'Fritliggende enfamiliehus',
  '130': 'Række/kæde/dobbelthus',
  '140': 'Etagebolig/lejlighed',
  '150': 'Kollegium',
  '160': 'Døgninstitution',
  '190': 'Anden boligtype',
  '510': 'Sommerhus'
};

// Hjælpefunktion: kalder et BBR-endpoint og returnerer JSON
async function kaldBBR(endpoint, parametre) {
  const brugernavn = process.env.BBR_USERNAME;
  const kodeord = process.env.BBR_PASSWORD;

  // Byg URL med credentials og Format=JSON
  let url = BBR_BASE + '/' + endpoint
    + '?username=' + brugernavn
    + '&password=' + kodeord
    + '&Format=JSON';

  // Tilføj ekstra parametre til URL'en
  for (const noegle in parametre) {
    url = url + '&' + noegle + '=' + parametre[noegle];
  }

  console.log('Kalder BBR:', endpoint);

  const svar = await fetch(url);

  if (!svar.ok) {
    throw new Error('BBR ' + endpoint + ' fejlede med status ' + svar.status);
  }

  const tekst = await svar.text();

  try {
    return JSON.parse(tekst);
  } catch (fejl) {
    console.error('BBR svarede ikke med JSON:', tekst.substring(0, 200));
    throw new Error('BBR svarede ikke med gyldigt JSON');
  }
}

// Finder den primære bygning fra et array af bygninger
// Vælger den med størst boligareal (typisk hovedbygningen, ikke garagen)
function findPrimaerBygning(bygninger) {
  if (bygninger.length === 0) {
    throw new Error('Ingen bygninger fundet på adressen');
  }

  if (bygninger.length === 1) {
    return bygninger[0];
  }

  // Sortér efter boligareal, størst først
  bygninger.sort(function(a, b) {
    const arealA = a.byg039BygningensSamledeBoligAreal || 0;
    const arealB = b.byg039BygningensSamledeBoligAreal || 0;
    return arealB - arealA;
  });

  return bygninger[0];
}

// Strategi for huse: start med bygning, hent derefter enhed
async function hentHusData(adgangsadresseId) {
  // Trin 1: Hent bygning via husnummer (adgangsadresse-ID)
  const bygninger = await kaldBBR('bygning', {
    Husnummer: adgangsadresseId
  });

  const bygning = findPrimaerBygning(bygninger);
  console.log('Fandt bygning:', bygning.id_lokalId);

  // Trin 2: Hent enhed via bygnings-ID for at få værelser
  let vaerelser = null;
  try {
    const enheder = await kaldBBR('enhed', {
      Bygning: bygning.id_lokalId
    });

    if (enheder.length > 0) {
      vaerelser = enheder[0].enh031AntalVærelser;
    }
  } catch (fejl) {
    console.log('Kunne ikke hente enhed for hus:', fejl.message);
  }

  return { bygning: bygning, vaerelser: vaerelser };
}

// Strategi for lejligheder: start med enhed, hent derefter bygning
async function hentLejlighedData(adresseId) {
  // Trin 1: Hent enhed via adresse-ID (inkl. etage/dør)
  const enheder = await kaldBBR('enhed', {
    AdresseIdentificerer: adresseId
  });

  if (enheder.length === 0) {
    throw new Error('Ingen enhed fundet på adressen');
  }

  const enhed = enheder[0];
  const vaerelser = enhed.enh031AntalVærelser;
  console.log('Fandt enhed:', enhed.id_lokalId);

  // Trin 2: Hent bygning via enhedens bygnings-reference
  let bygning = null;
  try {
    const bygninger = await kaldBBR('bygning', {
      id: enhed.bygning
    });

    if (bygninger.length > 0) {
      bygning = bygninger[0];
    }
  } catch (fejl) {
    console.log('Kunne ikke hente bygning for lejlighed:', fejl.message);
  }

  return { bygning: bygning, vaerelser: vaerelser, enhed: enhed };
}

// Hovedfunktion: vælger strategi baseret på DAWA-data og sammensætter resultat
// dawaData = det fulde DAWA-objekt (data-delen fra autocomplete-forslaget)
async function hentBBR(dawaData) {
  // Afgør om det er hus eller lejlighed via etage-feltet
  // Høne-æg problem: vi kender ikke BBR-typen før vi kalder BBR,
  // men vi skal vide typen for at vælge endpoint.
  // Løsning: brug DAWA's etage-felt som heuristik
  const erLejlighed = dawaData.etage !== null;

  let bygning;
  let vaerelser;

  if (erLejlighed) {
    console.log('Strategi: lejlighed (etage:', dawaData.etage + ')');
    const data = await hentLejlighedData(dawaData.id);
    bygning = data.bygning;
    vaerelser = data.vaerelser;
  } else {
    console.log('Strategi: hus (ingen etage)');
    const data = await hentHusData(dawaData.adgangsadresseid);
    bygning = data.bygning;
    vaerelser = data.vaerelser;
  }

  // Oversæt ejendomstype fra BBR-kode til tekst
  let ejendomstype = 'Ukendt';
  if (bygning) {
    const typeKode = bygning.byg021BygningensAnvendelse;
    ejendomstype = EJENDOMSTYPER[typeKode] || 'Ukendt type (' + typeKode + ')';
  }

  // Sammensæt det endelige resultat
  const resultat = {
    ejendomstype: ejendomstype,
    byggeaar: bygning ? bygning.byg026Opførelsesår : null,
    boligareal: bygning ? (bygning.byg039BygningensSamledeBoligAreal || bygning.byg038SamletBygningsareal) : null,
    
    
    //grundareal skal kaldes fra matrikel api og finde via jordstykke id
    grundareal: bygning ? bygning.byg038SamletBygningsareal : null,
    vaerelser: vaerelser,
    ekstra: {
      antalEtager: bygning ? bygning.byg054AntalEtager : null,
      bebyggetAreal: bygning ? bygning.byg041BebyggetAreal : null,
      bygningsId: bygning ? bygning.id_lokalId : null
    }
  };

  console.log('BBR-data samlet:', resultat);
  return resultat;
}

module.exports = { hentBBR };