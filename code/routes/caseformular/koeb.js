// koeb.js - Routes til køb i investeringscase
// Håndterer oprettelse af købs-oplysninger for en given case

const express = require('express');
const router = express.Router();
const database = require('../../database/database');

// POST /api/koeb
// Gemmer købs-oplysninger for en investeringscase
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    console.log('Opretter køb:', data);

    // Validér at alle påkrævede felter er til stede
    if (!data.caseID || !data.ejendomspris || !data.koeb_omkostninger
        || !data.advokat_udgifter || !data.tinglysning) {
      res.status(400).json({ fejl: 'Manglende felter' });
      return;
    }

    // Parameteriseret query for at undgå SQL injection
    const sqlTekst = `
      INSERT INTO Propalyze.koeb
        (caseID, ejendomspris, koeb_omkostninger, advokat_udgifter,
         tinglysning, koeber_raadgivning)
      OUTPUT INSERTED.koebID
      VALUES
        (@caseID, @ejendomspris, @koeb_omkostninger, @advokat_udgifter,
         @tinglysning, @koeber_raadgivning)
    `;

    const parametre = {
      caseID: data.caseID,
      ejendomspris: data.ejendomspris,
      koeb_omkostninger: data.koeb_omkostninger,
      advokat_udgifter: data.advokat_udgifter,
      tinglysning: data.tinglysning,
      // BIT-felt: konverter true/false til 1/0
      koeber_raadgivning: data.koeber_raadgivning ? 1 : 0
    };

    const resultat = await database.query(sqlTekst, parametre);
    const nytID = resultat[0].koebID;
    console.log('Køb oprettet med ID:', nytID);

    res.status(201).json({ besked: 'Køb gemt', koebID: nytID });

  } catch (err) {
    console.log('Fejl ved oprettelse af køb:', err.message);
    res.status(500).json({ fejl: err.message });
  }
});

module.exports = router;