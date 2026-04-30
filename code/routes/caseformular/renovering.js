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


// PUT /api/renovering/:caseID
// Erstatter alle renoveringer for en case - sletter eksisterende og indsætter nye
router.put('/:caseID', async (req, res) => {
  try {
    const caseID = req.params.caseID;
    const renoveringer = req.body.renoveringer;

    // Slet alle eksisterende renoveringer for denne case
    await database.query(
      'DELETE FROM Propalyze.renovering WHERE caseID = @caseID',
      { caseID: caseID }
    );

    // Indsæt de nye
    for (const r of renoveringer) {
      await database.query(
        `INSERT INTO Propalyze.renovering
           (caseID, type_renovering, renovering_omkostninger, planlagt_aar)
         VALUES (@caseID, @type_renovering, @renovering_omkostninger, @planlagt_aar)`,
        {
          caseID: caseID,
          type_renovering: r.type_renovering,
          renovering_omkostninger: r.renovering_omkostninger,
          planlagt_aar: r.planlagt_aar
        }
      );
    }

    res.status(200).json({ besked: 'Renoveringer opdateret' });

  } catch (err) {
    console.log('Fejl ved opdatering af renovering:', err.message);
    res.status(500).json({ fejl: err.message });
  }
});


module.exports = router;