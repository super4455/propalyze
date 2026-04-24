// renovering.js - Routes til renovering i investeringscase
// Håndterer oprettelse af renoveringsplaner for en given case
// En case kan have flere renoveringer

const express = require('express');
const router = express.Router();
const database = require('../../database/database');

// POST /api/renovering
// Gemmer én renovering for en investeringscase
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    console.log('Opretter renovering:', data);

    // Validér at alle påkrævede felter er til stede
    if (!data.caseID || !data.type_renovering
        || !data.renovering_omkostninger || !data.planlagt_aar) {
      res.status(400).json({ fejl: 'Manglende felter' });
      return;
    }

    // Parameteriseret query for at undgå SQL injection
    const sqlTekst = `
      INSERT INTO Propalyze.renovering
        (caseID, type_renovering, renovering_omkostninger, planlagt_aar)
      OUTPUT INSERTED.renoveringID
      VALUES
        (@caseID, @type_renovering, @renovering_omkostninger, @planlagt_aar)
    `;

    const parametre = {
      caseID: data.caseID,
      type_renovering: data.type_renovering,
      renovering_omkostninger: data.renovering_omkostninger,
      planlagt_aar: data.planlagt_aar
    };

    const resultat = await database.query(sqlTekst, parametre);
    const nytID = resultat[0].renoveringID;
    console.log('Renovering oprettet med ID:', nytID);

    res.status(201).json({ besked: 'Renovering gemt', renoveringID: nytID });

  } catch (err) {
    console.log('Fejl ved oprettelse af renovering:', err.message);
    res.status(500).json({ fejl: err.message });
  }
});

module.exports = router;