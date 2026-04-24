// udlejning.js - Routes til udlejning i investeringscase
// Håndterer oprettelse af udlejningsoplysninger for en given case

const express = require('express');
const router = express.Router();
const database = require('../../database/database');

// POST /api/udlejning
// Gemmer udlejningsoplysninger for en investeringscase
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    console.log('Opretter udlejning:', data);

    if (!data.caseID) {
      res.status(400).json({ fejl: 'Manglende caseID' });
      return;
    }

    const sqlTekst = `
      INSERT INTO Propalyze.udlejning
        (caseID, udlejning_status, maanedlig_husleje, maanedlig_udgifter)
      OUTPUT INSERTED.udlejningsID
      VALUES
        (@caseID, @udlejning_status, @maanedlig_husleje, @maanedlig_udgifter)
    `;

    const parametre = {
      caseID: data.caseID,
      // BIT-felt: konverter true/false til 1/0
      udlejning_status: data.udlejning_status ? 1 : 0,
      // Hvis ejendommen ikke udlejes sættes beløbene til 0
      maanedlig_husleje: data.maanedlig_husleje || 0,
      maanedlig_udgifter: data.maanedlig_udgifter || 0
    };

    const resultat = await database.query(sqlTekst, parametre);
    const nytID = resultat[0].udlejningsID;
    console.log('Udlejning oprettet med ID:', nytID);

    res.status(201).json({ besked: 'Udlejning gemt', udlejningsID: nytID });

  } catch (err) {
    console.log('Fejl ved oprettelse af udlejning:', err.message);
    res.status(500).json({ fejl: err.message });
  }
});

module.exports = router;