// finansiering.js - Routes til finansiering i investeringscase
// Håndterer oprettelse af låneoplysninger for en given case

const express = require('express');
const router = express.Router();
const database = require('../../database/database');

// POST /api/finansiering
// Gemmer finansieringsoplysninger for en investeringscase
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    console.log('Opretter finansiering:', data);

    // Validér at alle påkrævede felter er til stede
    if (!data.caseID || !data.laanebeloeb || !data.rente
        || !data.loebetid_aar || !data.laanetype) {
      res.status(400).json({ fejl: 'Manglende felter' });
      return;
    }

    // Parameteriseret query for at undgå SQL injection
    const sqlTekst = `
      INSERT INTO Propalyze.finansiering
        (caseID, laanebeloeb, rente, loebetid_aar, afdragsfriaar, laanetype)
      OUTPUT INSERTED.finansieringID
      VALUES
        (@caseID, @laanebeloeb, @rente, @loebetid_aar, @afdragsfriaar, @laanetype)
    `;

    const parametre = {
      caseID: data.caseID,
      laanebeloeb: data.laanebeloeb,
      rente: data.rente,
      loebetid_aar: data.loebetid_aar,
      // Afdragsfri periode er valgfri - default 0
      afdragsfriaar: data.afdragsfriaar || 0,
      laanetype: data.laanetype
    };

    const resultat = await database.query(sqlTekst, parametre);
    const nytID = resultat[0].finansieringID;
    console.log('Finansiering oprettet med ID:', nytID);

    res.status(201).json({ besked: 'Finansiering gemt', finansieringID: nytID });

  } catch (err) {
    console.log('Fejl ved oprettelse af finansiering:', err.message);
    res.status(500).json({ fejl: err.message });
  }
});

module.exports = router;