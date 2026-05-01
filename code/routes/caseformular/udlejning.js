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

    // BIT-felt: konverter true/false til 1/0
    let udlejning_status = 0;
    if (data.udlejning_status) {
      udlejning_status = 1;
    }

    const parametre = {
      caseID: data.caseID,
      udlejning_status: udlejning_status,
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

// PUT /api/udlejning/:caseID
// Opdaterer udlejningsoplysninger for en eksisterende case
router.put('/:caseID', async (req, res) => {
  try {
    const data = req.body;
    const caseID = req.params.caseID;

    let udlejning_status = 0;
    if (data.udlejning_status) {
      udlejning_status = 1;
    }

    await database.query(
      `UPDATE Propalyze.udlejning
       SET udlejning_status = @udlejning_status,
           maanedlig_husleje = @maanedlig_husleje,
           maanedlig_udgifter = @maanedlig_udgifter
       WHERE caseID = @caseID`,
      {
        caseID: caseID,
        udlejning_status: udlejning_status,
        maanedlig_husleje: data.maanedlig_husleje || 0,
        maanedlig_udgifter: data.maanedlig_udgifter || 0
      }
    );

    res.status(200).json({ besked: 'Udlejning opdateret' });

  } catch (err) {
    console.log('Fejl ved opdatering af udlejning:', err.message);
    res.status(500).json({ fejl: err.message });
  }
});


module.exports = router;