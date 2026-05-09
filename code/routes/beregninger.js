const express = require('express');
const router = express.Router();
const LaaneBeregner = require('../logic/laan');
const CashflowBeregner = require('../logic/cashflow');

// Beregner månedlig ydelse og total renteomkostning baseret på lånedetaljer
// Kaldes fra: case-formular.js (live preview i trin 2)
router.post('/ydelse', (req, res) => {
  const { laanebeloeb, rente, loebetid_aar, afdragsfriaar, laanetype } = req.body;

  if (!laanebeloeb || !loebetid_aar || !laanetype) {
    res.status(400).json({ fejl: 'Manglende felter' });
    return;
  }

  const maanedligYdelse = LaaneBeregner.beregnYdelse(laanebeloeb, rente, loebetid_aar, afdragsfriaar || 0, laanetype, 0);
  const totalRente = LaaneBeregner.beregnTotalRente(laanebeloeb, rente, loebetid_aar, afdragsfriaar || 0, laanetype);

  res.status(200).json({
    maanedligYdelse: Math.round(maanedligYdelse),
    totalRente: Math.max(0, Math.round(totalRente))
  });
});

// Beregner månedlige og årlige driftstotaler for udgifter og indtægter
// Kaldes fra: case-formular.js (live preview i trin 4)
router.post('/drift', (req, res) => {
  const { udgifter, indtaegter } = req.body;

  if (!Array.isArray(udgifter) || !Array.isArray(indtaegter)) {
    res.status(400).json({ fejl: 'udgifter og indtaegter skal være arrays' });
    return;
  }

  const maanedligUdgift = CashflowBeregner.beregnMaanedligDriftsomkostning(udgifter);
  const maanedligIndtaegt = CashflowBeregner.beregnMaanedligIndtaegt(indtaegter);

  res.status(200).json({
    maanedligUdgift: Math.round(maanedligUdgift),
    aarligUdgift: Math.round(maanedligUdgift * 12),
    maanedligIndtaegt: Math.round(maanedligIndtaegt),
    aarligIndtaegt: Math.round(maanedligIndtaegt * 12)
  });
});

module.exports = router;
