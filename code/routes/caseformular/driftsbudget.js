// driftsbudget.js - Routes til driftsbudget i investeringscase
// Håndterer oprettelse af driftsbudget samt udgifter og indtægter
// Struktur: investeringscase → driftsbudget → udgifter/indtægter

const express = require('express');
const router = express.Router();
const database = require('../../database/database');

// POST /api/driftsbudget
// Opretter et driftsbudget for en investeringscase
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    console.log('Opretter driftsbudget:', data);

    if (!data.caseID) {
      res.status(400).json({ fejl: 'Manglende caseID' });
      return;
    }

    const sqlTekst = `
      INSERT INTO Propalyze.driftsbudget (caseID)
      OUTPUT INSERTED.driftsbudgetID
      VALUES (@caseID)
    `;

    const resultat = await database.query(sqlTekst, { caseID: data.caseID });
    const nytID = resultat[0].driftsbudgetID;
    console.log('Driftsbudget oprettet med ID:', nytID);

    res.status(201).json({ besked: 'Driftsbudget oprettet', driftsbudgetID: nytID });

  } catch (err) {
    console.log('Fejl ved oprettelse af driftsbudget:', err.message);
    res.status(500).json({ fejl: err.message });
  }
});

// POST /api/driftsbudget/udgift
// Tilføjer en udgift til et driftsbudget
router.post('/udgift', async (req, res) => {
  try {
    const data = req.body;
    console.log('Opretter udgift:', data);

    if (!data.driftsbudgetID || !data.kategori || !data.beloeb || !data.frekvens) {
      res.status(400).json({ fejl: 'Manglende felter' });
      return;
    }

    const sqlTekst = `
      INSERT INTO Propalyze.udgift
        (driftsbudgetID, kategori, beloeb, frekvens)
      OUTPUT INSERTED.udgiftID
      VALUES
        (@driftsbudgetID, @kategori, @beloeb, @frekvens)
    `;

    const parametre = {
      driftsbudgetID: data.driftsbudgetID,
      kategori: data.kategori,
      beloeb: data.beloeb,
      frekvens: data.frekvens
    };

    const resultat = await database.query(sqlTekst, parametre);
    const nytID = resultat[0].udgiftID;
    console.log('Udgift oprettet med ID:', nytID);

    res.status(201).json({ besked: 'Udgift gemt', udgiftID: nytID });

  } catch (err) {
    console.log('Fejl ved oprettelse af udgift:', err.message);
    res.status(500).json({ fejl: err.message });
  }
});

// POST /api/driftsbudget/indtaegt
// Tilføjer en indtægt til et driftsbudget
router.post('/indtaegt', async (req, res) => {
  try {
    const data = req.body;
    console.log('Opretter indtægt:', data);

    if (!data.driftsbudgetID || !data.kategori || !data.beloeb || !data.frekvens) {
      res.status(400).json({ fejl: 'Manglende felter' });
      return;
    }

    const sqlTekst = `
      INSERT INTO Propalyze.indtaegt
        (driftsbudgetID, kategori, beloeb, frekvens)
      OUTPUT INSERTED.indtaegtID
      VALUES
        (@driftsbudgetID, @kategori, @beloeb, @frekvens)
    `;

    const parametre = {
      driftsbudgetID: data.driftsbudgetID,
      kategori: data.kategori,
      beloeb: data.beloeb,
      frekvens: data.frekvens
    };

    const resultat = await database.query(sqlTekst, parametre);
    const nytID = resultat[0].indtaegtID;
    console.log('Indtægt oprettet med ID:', nytID);

    res.status(201).json({ besked: 'Indtægt gemt', indtaegtID: nytID });

  } catch (err) {
    console.log('Fejl ved oprettelse af indtægt:', err.message);
    res.status(500).json({ fejl: err.message });
  }
});


// PUT /api/driftsbudget/:caseID
// Erstatter alle udgifter og indtægter for en case
router.put('/:caseID', async (req, res) => {
  try {
    const caseID = req.params.caseID;
    const udgifter = req.body.udgifter;
    const indtaegter = req.body.indtaegter;

    // Find driftsbudgetID for denne case
    const driftsbudget = await database.query(
      'SELECT driftsbudgetID FROM Propalyze.driftsbudget WHERE caseID = @caseID',
      { caseID: caseID }
    );

    if (driftsbudget.length === 0) {
      res.status(404).json({ fejl: 'Driftsbudget ikke fundet' });
      return;
    }

    const driftsbudgetID = driftsbudget[0].driftsbudgetID;

    // Slet eksisterende udgifter og indtægter
    await database.query(
      'DELETE FROM Propalyze.udgift WHERE driftsbudgetID = @id',
      { id: driftsbudgetID }
    );

    await database.query(
      'DELETE FROM Propalyze.indtaegt WHERE driftsbudgetID = @id',
      { id: driftsbudgetID }
    );

    // Indsæt nye udgifter
    for (const u of udgifter) {
      await database.query(
        `INSERT INTO Propalyze.udgift (driftsbudgetID, kategori, beloeb, frekvens)
         VALUES (@driftsbudgetID, @kategori, @beloeb, @frekvens)`,
        {
          driftsbudgetID: driftsbudgetID,
          kategori: u.kategori,
          beloeb: u.beloeb,
          frekvens: u.frekvens
        }
      );
    }

    // Indsæt nye indtægter
    for (const i of indtaegter) {
      await database.query(
        `INSERT INTO Propalyze.indtaegt (driftsbudgetID, kategori, beloeb, frekvens)
         VALUES (@driftsbudgetID, @kategori, @beloeb, @frekvens)`,
        {
          driftsbudgetID: driftsbudgetID,
          kategori: i.kategori,
          beloeb: i.beloeb,
          frekvens: i.frekvens
        }
      );
    }

    res.status(200).json({ besked: 'Driftsbudget opdateret' });

  } catch (err) {
    console.log('Fejl ved opdatering af driftsbudget:', err.message);
    res.status(500).json({ fejl: err.message });
  }
});


module.exports = router;