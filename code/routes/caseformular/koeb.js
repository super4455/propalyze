const express = require('express');
const router = express.Router();
const database = require('../../database/database');

// POST /api/koeb
// Gemmer købs-oplysninger for en investeringscase
// Kaldes fra: case-formular.js:490 (gemSomNy — opretter køb efter casen er oprettet)
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

    // BIT-felt: konverter true/false til 1/0
    let koeber_raadgivning = 0;
    if (data.koeber_raadgivning) {
      koeber_raadgivning = 1;
    }

    const parametre = {
      caseID: data.caseID,
      ejendomspris: data.ejendomspris,
      koeb_omkostninger: data.koeb_omkostninger,
      advokat_udgifter: data.advokat_udgifter,
      tinglysning: data.tinglysning,
      koeber_raadgivning: koeber_raadgivning
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


// PUT /api/koeb/:caseID
// Opdaterer købsoplysninger for en eksisterende case
// Kaldes fra: case-formular.js:580 (gemSomOpdatering — rediger-tilstand)
router.put('/:caseID', async (req, res) => {
  try {
    const data = req.body;
    const caseID = req.params.caseID;

    if (!data.ejendomspris || !data.koeb_omkostninger || !data.advokat_udgifter || !data.tinglysning) {
      res.status(400).json({ fejl: 'Manglende felter' });
      return;
    }

    let koeber_raadgivning = 0;
    if (data.koeber_raadgivning) {
      koeber_raadgivning = 1;
    }

    await database.query(
      `UPDATE Propalyze.koeb
       SET ejendomspris = @ejendomspris,
           koeb_omkostninger = @koeb_omkostninger,
           advokat_udgifter = @advokat_udgifter,
           tinglysning = @tinglysning,
           koeber_raadgivning = @koeber_raadgivning
       WHERE caseID = @caseID`,
      {
        caseID: caseID,
        ejendomspris: data.ejendomspris,
        koeb_omkostninger: data.koeb_omkostninger,
        advokat_udgifter: data.advokat_udgifter,
        tinglysning: data.tinglysning,
        koeber_raadgivning: koeber_raadgivning
      }
    );

    res.status(200).json({ besked: 'Køb opdateret' });

  } catch (err) {
    console.log('Fejl ved opdatering af køb:', err.message);
    res.status(500).json({ fejl: err.message });
  }
});



module.exports = router;