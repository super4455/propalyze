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
    const adgangsadresse = erAdgangsadresse ? raaData : raaData.adgangsadresse;

    return {
      id: raaData.id,
      adgangsadresseid: adgangsadresse.id,
      adresse: raaData.adressebetegnelse,
      vejnavn: adgangsadresse.vejstykke.navn,
      husnummer: adgangsadresse.husnr,
      postnummer: adgangsadresse.postnummer.nr,
      bynavn: adgangsadresse.postnummer.navn,
      etage: erAdgangsadresse ? null : raaData.etage,
      doer: erAdgangsadresse ? null : raaData.dør,
      koordinater: adgangsadresse.adgangspunkt.koordinater,
      matrikelnr: adgangsadresse.jordstykke ? adgangsadresse.jordstykke.matrikelnr : null,
      ejerlavskode: adgangsadresse.jordstykke ? adgangsadresse.jordstykke.ejerlav.kode : null
    };
  }
}

module.exports = DAWAService;
