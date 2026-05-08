const DAWA_BASE = 'https://api.dataforsyningen.dk';

class DAWAService {

  // Returnerer adresseforslag baseret på søgeord
  static async soegAdresser(soegeord) {
    const svar = await fetch(`${DAWA_BASE}/autocomplete?q=${soegeord}`);

    if (!svar.ok) {
      throw new Error('DAWA er ikke tilgængelig');
    }

    return await svar.json();
  }

  // Slår en specifik adresse op via DAWA-id
  // Prøver /adresser først (lejlighed), falder tilbage til /adgangsadresser (hus)
  static async hentAdresse(dawaId) {
    let svar = await fetch(`${DAWA_BASE}/adresser/${dawaId}`);
    let erAdgangsadresse = false;

    if (svar.status === 404) {
      svar = await fetch(`${DAWA_BASE}/adgangsadresser/${dawaId}`);
      erAdgangsadresse = true;
    }

    if (!svar.ok) {
      throw new Error('DAWA kunne ikke finde adressen');
    }

    const raaData = await svar.json();

    let adgangsadresse;
    if (erAdgangsadresse) {
      adgangsadresse = raaData;
    } else {
      adgangsadresse = raaData.adgangsadresse;
    }

    // Hent matrikel-info hvis det findes på adressen
    let matrikelnr = null;
    let ejerlavskode = null;
    if (adgangsadresse.jordstykke) {
      matrikelnr = adgangsadresse.jordstykke.matrikelnr;
      ejerlavskode = adgangsadresse.jordstykke.ejerlav.kode;
    }

    let etage = null;
    let doer = null;
    if (!erAdgangsadresse) {
      etage = raaData.etage;
      doer = raaData.dør;
    }
    // Returnerer et objekt med de relevante adresseoplysninger, der hentes fra DAWA
    return {
      id: raaData.id,
      adgangsadresseid: adgangsadresse.id,
      adresse: raaData.adressebetegnelse,
      vejnavn: adgangsadresse.vejstykke.navn,
      husnummer: adgangsadresse.husnr,
      postnummer: adgangsadresse.postnummer.nr,
      bynavn: adgangsadresse.postnummer.navn,
      etage: etage,
      doer: doer,
      koordinater: adgangsadresse.adgangspunkt.koordinater,
      matrikelnr: matrikelnr,
      ejerlavskode: ejerlavskode
    };
  }
}

module.exports = DAWAService;
