const express = require('express');
const router = express.Router();
const database = require('../database/database');
const InvesteringsBeregner = require('../logic/InvesteringsBeregner');

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

// GET /api/cases/:id/simuler?periode=X&vaerdistigning=Y
// Kører år-for-år simulering med brugerens valgte periode og værdistigning
// periode angives i antal år (min 30), vaerdistigning i procent (f.eks. 2 for 2%)
router.get('/:id/simuler', async (req, res) => {
  try {
    const caseID = req.params.id;
    const periode = parseInt(req.query.periode);
    const vaerdistigning = parseFloat(req.query.vaerdistigning) / 100;

    if (!periode || periode < 30) {
      res.status(400).json({ fejl: 'periode skal være mindst 30 år' });
      return;
    }

    if (isNaN(vaerdistigning)) {
      res.status(400).json({ fejl: 'vaerdistigning skal være et tal' });
      return;
    }

    const caseSvar = await database.query(
      'SELECT * FROM Propalyze.investeringscase WHERE caseID = @caseID',
      { caseID: caseID }
    );

    if (caseSvar.length === 0) {
      res.status(404).json({ fejl: 'Case ikke fundet' });
      return;
    }

    const koeb = await database.query(
      'SELECT * FROM Propalyze.koeb WHERE caseID = @caseID',
      { caseID: caseID }
    );

    const finansiering = await database.query(
      'SELECT * FROM Propalyze.finansiering WHERE caseID = @caseID',
      { caseID: caseID }
    );

    if (koeb.length === 0 || finansiering.length === 0) {
      res.status(400).json({ fejl: 'Case mangler køb eller finansiering' });
      return;
    }

    const renoveringer = await database.query(
      'SELECT * FROM Propalyze.renovering WHERE caseID = @caseID',
      { caseID: caseID }
    );

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

    const udlejning = await database.query(
      'SELECT * FROM Propalyze.udlejning WHERE caseID = @caseID',
      { caseID: caseID }
    );

    const beregner = new InvesteringsBeregner(
      finansiering[0],
      koeb[0],
      udgifter,
      indtaegter,
      renoveringer,
      udlejning[0] || null
    );

    beregner.beregnDrift();
    beregner.simuler(periode, vaerdistigning);

    res.status(200).json(beregner.hentResultater());

  } catch (err) {
    console.log('Fejl ved simulering:', err.message);
    res.status(500).json({ fejl: err.message });
  }
});


module.exports = router;
