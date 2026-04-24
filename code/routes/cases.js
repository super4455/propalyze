// cases.js - Routes til investeringscases
// Håndterer oprettelse af cases knyttet til en ejendomsprofil

const express = require('express');
const router = express.Router();
const database = require('../database/database');

// POST /api/cases
// Opretter en ny investeringscase for en ejendom
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    console.log('Opretter investeringscase:', data);

    // Validér input
    if (!data.ejendomsID) {
      res.status(400).json({ fejl: 'EjendomsID mangler' });
      return;
    }

    if (!data.navn) {
      res.status(400).json({ fejl: 'Navn er påkrævet' });
      return;
    }

    const sqlTekst = `
      INSERT INTO Propalyze.investeringscase
        (ejendomsID, navn, beskrivelse)
      OUTPUT INSERTED.caseID
      VALUES
        (@ejendomsID, @navn, @beskrivelse)
    `;

    const parametre = {
      ejendomsID: data.ejendomsID,
      navn: data.navn,
      beskrivelse: data.beskrivelse || ''
    };

    const resultat = await database.query(sqlTekst, parametre);
    const nytID = resultat[0].caseID;
    console.log('Case oprettet med ID:', nytID);

    res.status(201).json({
      besked: 'Investeringscase oprettet',
      caseID: nytID
    });

  } catch (err) {
    console.log('Fejl ved oprettelse af case:', err.message);
    res.status(500).json({ fejl: err.message });
  }
});

// GET /api/cases/:id/data
// Henter alle data for en investeringscase til brug i simulering
// Returnerer case, køb, finansiering, renoveringer, driftsbudget og udlejning
router.get('/:id/data', async (req, res) => {
  try {
    const caseID = req.params.id;
    console.log('Henter data for case:', caseID);

    // Hent selve casen
    const caseSvar = await database.query(
      'SELECT * FROM Propalyze.investeringscase WHERE caseID = @caseID',
      { caseID: caseID }
    );

    if (caseSvar.length === 0) {
      res.status(404).json({ fejl: 'Case ikke fundet' });
      return;
    }

    // Hent køb
    const koeb = await database.query(
      'SELECT * FROM Propalyze.koeb WHERE caseID = @caseID',
      { caseID: caseID }
    );

    // Hent finansiering
    const finansiering = await database.query(
      'SELECT * FROM Propalyze.finansiering WHERE caseID = @caseID',
      { caseID: caseID }
    );

    // Hent renoveringer
    const renoveringer = await database.query(
      'SELECT * FROM Propalyze.renovering WHERE caseID = @caseID',
      { caseID: caseID }
    );

    // Hent driftsbudget og dets udgifter/indtægter
    const driftsbudget = await database.query(
      'SELECT * FROM Propalyze.driftsbudget WHERE caseID = @caseID',
      { caseID: caseID }
    );

    let udgifter = [];
    let indtaegter = [];

    if (driftsbudget.length > 0) {
      const driftsbudgetID = driftsbudget[0].driftsbudgetID;

      udgifter = await database.query(
        'SELECT * FROM Propalyze.udgift WHERE driftsbudgetID = @driftsbudgetID',
        { driftsbudgetID: driftsbudgetID }
      );

      indtaegter = await database.query(
        'SELECT * FROM Propalyze.indtaegt WHERE driftsbudgetID = @driftsbudgetID',
        { driftsbudgetID: driftsbudgetID }
      );
    }

    // Hent udlejning
    const udlejning = await database.query(
      'SELECT * FROM Propalyze.udlejning WHERE caseID = @caseID',
      { caseID: caseID }
    );

    // Returner alt samlet
    res.status(200).json({
      investeringscase: caseSvar[0],
      koeb: koeb[0] || null,
      finansiering: finansiering[0] || null,
      renoveringer: renoveringer,
      udgifter: udgifter,
      indtaegter: indtaegter,
      udlejning: udlejning[0] || null
    });

  } catch (err) {
    console.log('Fejl ved hentning af case data:', err.message);
    res.status(500).json({ fejl: err.message });
  }
});


// GET /api/cases?ejendomsID=X
// Henter alle investeringscases for en given ejendomsprofil
router.get('/', async (req, res) => {
  try {
    const ejendomsID = req.query.ejendomsID;

    if (!ejendomsID) {
      res.status(400).json({ fejl: 'Manglende ejendomsID' });
      return;
    }

    const sqlTekst = `
      SELECT caseID, navn, beskrivelse, start_dato
      FROM Propalyze.investeringscase
      WHERE ejendomsID = @ejendomsID
      ORDER BY start_dato DESC
    `;

    const resultat = await database.query(sqlTekst, { ejendomsID: ejendomsID });
    res.status(200).json(resultat);

  } catch (err) {
    console.log('Fejl ved hentning af cases:', err.message);
    res.status(500).json({ fejl: err.message });
  }
});

// DELETE /api/cases/:id
// Sletter en investeringscase og alle tilknyttede data
// Rækkefølgen er vigtig - FK-afhængige tabeller slettes først
router.delete('/:id', async (req, res) => {
  try {
    const caseID = req.params.id;
    console.log('Sletter case:', caseID);

    // Hent driftsbudgetID så vi kan slette udgifter og indtægter
    const driftsbudget = await database.query(
      'SELECT driftsbudgetID FROM Propalyze.driftsbudget WHERE caseID = @caseID',
      { caseID: caseID }
    );

    // Slet udgifter og indtægter hvis driftsbudget eksisterer
    if (driftsbudget.length > 0) {
      const driftsbudgetID = driftsbudget[0].driftsbudgetID;

      await database.query(
        'DELETE FROM Propalyze.udgift WHERE driftsbudgetID = @driftsbudgetID',
        { driftsbudgetID: driftsbudgetID }
      );

      await database.query(
        'DELETE FROM Propalyze.indtaegt WHERE driftsbudgetID = @driftsbudgetID',
        { driftsbudgetID: driftsbudgetID }
      );
    }

    // Slet de resterende FK-tabeller
    await database.query('DELETE FROM Propalyze.driftsbudget WHERE caseID = @caseID', { caseID: caseID });
    await database.query('DELETE FROM Propalyze.koeb WHERE caseID = @caseID', { caseID: caseID });
    await database.query('DELETE FROM Propalyze.finansiering WHERE caseID = @caseID', { caseID: caseID });
    await database.query('DELETE FROM Propalyze.renovering WHERE caseID = @caseID', { caseID: caseID });
    await database.query('DELETE FROM Propalyze.udlejning WHERE caseID = @caseID', { caseID: caseID });

    // Slet selve casen til sidst
    await database.query(
      'DELETE FROM Propalyze.investeringscase WHERE caseID = @caseID',
      { caseID: caseID }
    );

    res.status(200).json({ besked: 'Investeringscase slettet' });

  } catch (err) {
    console.log('Fejl ved sletning af case:', err.message);
    res.status(500).json({ fejl: err.message });
  }
});



module.exports = router;