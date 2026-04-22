// properties.js - Routes til ejendomsprofiler
// Håndterer opslag (DAWA+BBR) og CRUD for ejendomme

const express = require('express');
const router = express.Router();
const database = require('../database/database');
const { hentBBR } = require('../logic/BBRapi');

// GET /api/properties/lookup?dawaId=...
// Slår en ejendom op via DAWA + BBR og returnerer begge dele samlet
// Gemmer IKKE noget i databasen - bruges til preview
router.get('/lookup', async (req, res) => {
  try {
    const dawaId = req.query.dawaId;

    if (!dawaId) {
      res.status(400).json({ fejl: 'Manglende dawaId' });
      return;
    }

    // Slå adressen op i DAWA. Prøv /adresser først (specifik adresse
    // med etage/dør), fald tilbage til /adgangsadresser (hus-niveau).
    let dawaSvar = await fetch('https://api.dataforsyningen.dk/adresser/' + dawaId);
    let erAdgangsadresse = false;

    if (dawaSvar.status === 404) {
      dawaSvar = await fetch('https://api.dataforsyningen.dk/adgangsadresser/' + dawaId);
      erAdgangsadresse = true;
    }

    if (!dawaSvar.ok) {
      res.status(502).json({ fejl: 'DAWA kunne ikke finde adressen' });
      return;
    }

    const dawaRaa = await dawaSvar.json();
    const adgangsadresse = erAdgangsadresse ? dawaRaa : dawaRaa.adgangsadresse;

    const dawa = {
      id: dawaRaa.id,
      adgangsadresseid: adgangsadresse.id,
      vejnavn: adgangsadresse.vejstykke.navn,
      husnummer: adgangsadresse.husnr,
      postnummer: adgangsadresse.postnummer.nr,
      bynavn: adgangsadresse.postnummer.navn,
      etage: erAdgangsadresse ? null : dawaRaa.etage
    };

    console.log('Slår ejendom op. Etage:', dawa.etage);

    // Hent BBR-data med den rigtige strategi (hus vs. lejlighed)
    const bbr = await hentBBR(dawa);

    res.status(200).json({ dawa: dawa, bbr: bbr });

  } catch (err) {
    console.log('Fejl ved ejendomsopslag:', err.message);
    res.status(502).json({ fejl: 'Kunne ikke hente ejendomsdata: ' + err.message });
  }
});

// POST /api/properties
// Opretter en ny ejendomsprofil med data fra DAWA + BBR
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    console.log('Opretter ejendom:', data);

    // Validér at vi har adressedata
    if (!data.dawaID || !data.vejnavn || !data.husnummer || !data.postnummer || !data.bynavn) {
      res.status(400).json({ fejl: 'Adressedata mangler' });
      return;
    }

    // Validér at vi har ejendomsdata
    if (!data.ejendomstype || !data.byggeaar || !data.boligareal || !data.vaerelser) {
      res.status(400).json({ fejl: 'Ejendomsdata mangler' });
      return;
    }

    // Parameteriseret query for at undgå SQL injection
    const sqlTekst = `
      INSERT INTO Propalyze.ejendomsprofil
        (vejnavn, husnummer, postnummer, bynavn, ejendomstype,
         byggeaar, boligareal, grundareal, vaerelser, dawaID, sidste_data_hentning)
      OUTPUT INSERTED.ejendomID
      VALUES
        (@vejnavn, @husnummer, @postnummer, @bynavn, @ejendomstype,
         @byggeaar, @boligareal, @grundareal, @vaerelser, @dawaID, GETDATE())
    `;

    const parametre = {
      vejnavn: data.vejnavn,
      husnummer: data.husnummer,
      postnummer: data.postnummer,
      bynavn: data.bynavn,
      ejendomstype: data.ejendomstype,
      byggeaar: data.byggeaar,
      boligareal: data.boligareal,
      grundareal: data.grundareal || 0,
      vaerelser: data.vaerelser,
      dawaID: data.dawaID
    };

    const resultat = await database.query(sqlTekst, parametre);
    const nytID = resultat[0].ejendomID;
    console.log('Ejendom oprettet med ID:', nytID);

    res.status(201).json({
      besked: 'Ejendomsprofil oprettet',
      ejendomID: nytID
    });

  } catch (err) {
    console.log('Fejl ved oprettelse:', err.message);

    // UNIQUE constraint på dawaID fanger duplikater
    if (err.message.includes('UNIQUE')) {
      res.status(409).json({ fejl: 'Denne ejendom er allerede oprettet' });
      return;
    }

    res.status(500).json({ fejl: err.message });
  }
});

module.exports = router;