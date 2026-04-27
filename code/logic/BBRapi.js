// BBRapi.js
// Henter ejendomsdata fra BBR via Datafordeleren

const BBR_BASE = 'https://services.datafordeler.dk/BBR/BBRPublic/1/rest';

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
      console.log('Strategi: lejlighed (etage:', dawaData.etage + ')');
      url = BBR_BASE + '/enhed'
        + '?username=' + brugernavn
        + '&password=' + kodeord
        + '&Format=JSON'
        + '&AdresseIdentificerer=' + dawaData.id;
    } else {
      console.log('Strategi: hus (ingen etage)');
      url = BBR_BASE + '/bygning'
        + '?username=' + brugernavn
        + '&password=' + kodeord
        + '&Format=JSON'
        + '&Husnummer=' + dawaData.adgangsadresseid;
    }

    // Kald 1: Hent data fra BBR
    const svar = await fetch(url);

    if (!svar.ok) {
      throw new Error('BBR fejlede med status ' + svar.status);
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
    }

    console.log('BBR-data samlet:', resultat);
    return resultat;
  }

  // Henter data for en lejlighed — kræver et ekstra kald for bygningsdata
  static async hentLejlighedsData(enhed, brugernavn, kodeord) {
    const typeKode = enhed.enh020EnhedensAnvendelse;

    const resultat = {
      ejendomstype: EJENDOMSTYPER[typeKode] || 'Ukendt type (' + typeKode + ')',
      boligareal: enhed.enh026EnhedensSamledeAreal,
      vaerelser: enhed.enh031AntalVærelser,
      byggeaar: null,
      grundareal: null,
      antalEtager: null,
      koordinater: null
    };

    // Kald 2: Hent bygning for byggeår, grundareal, etager og koordinater
    const bygUrl = BBR_BASE + '/bygning'
      + '?username=' + brugernavn
      + '&password=' + kodeord
      + '&Format=JSON'
      + '&id=' + enhed.bygning;

    const bygSvar = await fetch(bygUrl);
    if (bygSvar.ok) {
      const bygData = JSON.parse(await bygSvar.text());
      if (bygData.length > 0) {
        const byg = bygData[0];
        resultat.byggeaar = byg.byg026Opførelsesår;
        resultat.grundareal = byg.byg038SamletBygningsareal;
        resultat.antalEtager = byg.byg054AntalEtager;
        resultat.koordinater = byg.byg404Koordinat
          .replace('POINT(', '').replace(')', '').split(' ');
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

    const resultat = {
      ejendomstype: EJENDOMSTYPER[typeKode] || 'Ukendt type (' + typeKode + ')',
      byggeaar: bygning.byg026Opførelsesår,
      boligareal: bygning.byg039BygningensSamledeBoligAreal || bygning.byg038SamletBygningsareal,
      grundareal: bygning.byg038SamletBygningsareal,
      vaerelser: null,
      antalEtager: bygning.byg054AntalEtager,
      koordinater: bygning.byg404Koordinat
        .replace('POINT(', '').replace(')', '').split(' ')
    };

    // Kald 2: Hent enhed for antal værelser
    const enhUrl = BBR_BASE + '/enhed'
      + '?username=' + brugernavn
      + '&password=' + kodeord
      + '&Format=JSON'
      + '&Bygning=' + bygning.id_lokalId;

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
