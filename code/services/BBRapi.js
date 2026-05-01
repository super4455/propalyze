const BBR_BASE = 'https://services.datafordeler.dk/BBR/BBRPublic/1/rest';
const MAT_BASE = 'https://services.datafordeler.dk/Matriklen2/Matrikel/2.0.0/rest';

const EJENDOMSTYPER = {
  // Helårsbeboelse
  '110': 'Stuehus til landbrugsejendom',
  '120': 'Fritliggende enfamiliehus',
  '121': 'Sammenbygget enfamiliehus',
  '122': 'Fritliggende enfamiliehus i tæt-lav bebyggelse',
  '130': 'Række-, kæde-, eller dobbelthus (udfases)',
  '131': 'Række-, kæde- og klyngehus',
  '132': 'Dobbelthus',
  '140': 'Etagebolig, flerfamiliehus eller to-familiehus',
  '150': 'Kollegium',
  '160': 'Boligbygning til døgninstitution',
  '185': 'Anneks i tilknytning til helårsbolig',
  '190': 'Anden bygning til helårsbeboelse',
  // Kontor, handel og lager
  '321': 'Bygning til kontor',
  '322': 'Bygning til detailhandel',
  '323': 'Bygning til lager',
  '324': 'Butikscenter',
  '325': 'Tankstation',
  '329': 'Anden bygning til kontor, handel og lager',
  // Serviceerhverv
  '331': 'Hotel, kro eller konferencecenter med overnatning',
  '332': 'Bed & breakfast mv.',
  '333': 'Restaurant, café og konferencecenter uden overnatning',
  '334': 'Privat servicevirksomhed som frisør, vaskeri, netcafé mv.',
  '339': 'Anden bygning til serviceerhverv',
  // Ferie og fritid
  '510': 'Sommerhus',
  '521': 'Feriecenter, center til campingplads mv.',
  '522': 'Bygning med ferielejligheder til erhvervsmæssig udlejning',
  '523': 'Bygning med ferielejligheder til eget brug',
  '529': 'Anden bygning til ferieformål',
  '531': 'Klubhus i forbindelse med fritid og idræt',
  '540': 'Kolonihavehus',
  '585': 'Anneks i tilknytning til fritids- og sommerhus',
  '590': 'Anden bygning til fritidsformål',
  // Småbygninger
  '910': 'Garage',
  '920': 'Carport',
  '930': 'Udhus',
  '940': 'Drivhus',
  '950': 'Fritliggende overdækning',
  '960': 'Fritliggende udestue',
};

class BBRService {

  // Henter og returnerer BBR-data for en given DAWA-adresse
  // Vælger automatisk strategi baseret på om adressen er en lejlighed eller et hus
  static async hentBBR(dawaData) {
    const brugernavn = process.env.BBR_USERNAME;
    const kodeord = process.env.BBR_PASSWORD;

    // Afgør om det er hus eller lejlighed ud fra etage-feltet
    const erLejlighed = dawaData.etage !== null;

    // Byg URL baseret på boligtype
    let url;
    if (erLejlighed) {
      console.log(`Strategi: lejlighed (etage: ${dawaData.etage})`);
      url = `${BBR_BASE}/enhed?username=${brugernavn}&password=${kodeord}&Format=JSON&AdresseIdentificerer=${dawaData.id}`;
    } else {
      console.log('Strategi: hus (ingen etage)');
      url = `${BBR_BASE}/bygning?username=${brugernavn}&password=${kodeord}&Format=JSON&Husnummer=${dawaData.adgangsadresseid}`;
    }

    // Kald 1: Hent data fra BBR
    const svar = await fetch(url);

    if (!svar.ok) {
      throw new Error(`BBR fejlede med status ${svar.status}`);
    }

    const tekst = await svar.text();
    let data;

    try {
      data = JSON.parse(tekst);
    } catch (fejl) {
      throw new Error('BBR svarede ikke med gyldigt JSON');
    }

    if (data.length === 0) {
      throw new Error('Ingen data fundet på adressen');
    }

    // Saml resultat baseret på boligtype
    let resultat;

    if (erLejlighed) {
      resultat = await BBRService.hentLejlighedsData(data[0], brugernavn, kodeord);
    } else {
      resultat = await BBRService.hentHusData(data, brugernavn, kodeord);
      resultat.grundareal = await BBRService.hentGrundareal(dawaData.matrikelnr, dawaData.ejerlavskode, brugernavn, kodeord);
    }

    console.log('BBR-data samlet:', resultat);
    return resultat;
  }

  static async hentGrundareal(matrikelnr, ejerlavskode, brugernavn, kodeord) {
    if (!matrikelnr || !ejerlavskode) return null;

    const url = `${MAT_BASE}/SamletFastEjendom?username=${brugernavn}&password=${kodeord}&Format=JSON&Ejerlavskode=${ejerlavskode}&Matrikelnr=${encodeURIComponent(matrikelnr)}`;
 
    const svar = await fetch(url);
    if (!svar.ok) {
      console.log('Matriklen2 fejlede med status', svar.status);
      return null;
    }

    const data = JSON.parse(await svar.text());
    const features = data.features || [];
    if (features.length === 0) return null;

    const jordstykker = features[0].properties.jordstykke || [];
    console.log('Matriklen2 jordstykke:', JSON.stringify(jordstykker));

    // Slå arealet op trin-for-trin og bevar null hvis nogen led mangler
    let areal = null;
    if (jordstykker[0] && jordstykker[0].properties) {
      areal = jordstykker[0].properties.registreretAreal;
    }
    return areal || null;
  }

  // Henter data for en lejlighed — kræver et ekstra kald for bygningsdata
  static async hentLejlighedsData(enhed, brugernavn, kodeord) {
    const typeKode = enhed.enh020EnhedensAnvendelse;

    const resultat = {
      ejendomstype: EJENDOMSTYPER[typeKode] || `Ukendt type (${typeKode})`,
      boligareal: enhed.enh026EnhedensSamledeAreal,
      vaerelser: enhed.enh031AntalVærelser,
      byggeaar: null,
      grundareal: null,
      antalEtager: null,
      koordinater: null
    };

    // Kald 2: Hent bygning for byggeår, grundareal, etager og koordinater
    const bygUrl = `${BBR_BASE}/bygning?username=${brugernavn}&password=${kodeord}&Format=JSON&id=${enhed.bygning}`;

    const bygSvar = await fetch(bygUrl);
    if (bygSvar.ok) {
      const bygData = JSON.parse(await bygSvar.text());
      if (bygData.length > 0) {
        const byg = bygData[0];
        resultat.byggeaar = byg.byg026Opførelsesår;
        resultat.antalEtager = byg.byg054AntalEtager;
        // Konverter "POINT(x y)" til ["x", "y"]
        let koordinatTekst = byg.byg404Koordinat;
        koordinatTekst = koordinatTekst.replace('POINT(', '');
        koordinatTekst = koordinatTekst.replace(')', '');
        resultat.koordinater = koordinatTekst.split(' ');
      }
    }

    return resultat;
  }

  // Henter data for et hus — kræver et ekstra kald for antal værelser
  static async hentHusData(data, brugernavn, kodeord) {
    // Vælg den med størst boligareal hvis der er flere bygninger
    data.sort(function(a, b) {
      const arealA = a.byg039BygningensSamledeBoligAreal || 0;
      const arealB = b.byg039BygningensSamledeBoligAreal || 0;
      return arealB - arealA;
    });

    const bygning = data[0];
    const typeKode = bygning.byg021BygningensAnvendelse;

    // Konverter "POINT(x y)" til ["x", "y"], eller null hvis koordinat mangler
    let koordinater = null;
    if (bygning.byg404Koordinat) {
      let koordinatTekst = bygning.byg404Koordinat;
      koordinatTekst = koordinatTekst.replace('POINT(', '');
      koordinatTekst = koordinatTekst.replace(')', '');
      koordinater = koordinatTekst.split(' ');
    }

    const resultat = {
      ejendomstype: EJENDOMSTYPER[typeKode] || `Ukendt type (${typeKode})`,
      byggeaar: bygning.byg026Opførelsesår,
      boligareal: bygning.byg039BygningensSamledeBoligAreal || bygning.byg038SamletBygningsareal,
      grundareal: null,
      vaerelser: null,
      antalEtager: bygning.byg054AntalEtager,
      koordinater: koordinater,
    };

    // Kald 2: Hent enhed for antal værelser
    const enhUrl = `${BBR_BASE}/enhed?username=${brugernavn}&password=${kodeord}&Format=JSON&Bygning=${bygning.id_lokalId}`;

    const enhSvar = await fetch(enhUrl);
    if (enhSvar.ok) {
      const enhData = JSON.parse(await enhSvar.text());
      if (enhData.length > 0) {
        resultat.vaerelser = enhData[0].enh031AntalVærelser;
      }
    }

    return resultat;
  }
}

module.exports = BBRService;
