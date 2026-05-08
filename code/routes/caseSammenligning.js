const express = require('express');
const router = express.Router();
const database = require('../database/database');
const LaaneBeregner = require('../logic/laan');
const CashflowBeregner = require('../logic/cashflow');

// Sammenligner flere investeringscases, baseret på deres nøgletal
router.get('/sammenlign', async (req, res) => {
  try {
    const idsTekst = req.query.ids;

    if (!idsTekst) {
      res.status(400).json({ fejl: 'Ingen case-ID\'er angivet' });
      return;
    }

    // Split "1,2,3" til [1, 2, 3] og fjern ugyldige værdier
    const idsTekstListe = idsTekst.split(',');
    const ids = [];

    for (const idTekst of idsTekstListe) {
      const id = parseInt(idTekst);
      if (!isNaN(id)) {
        ids.push(id);
      }
    }

    if (ids.length < 2) {
      res.status(400).json({ fejl: 'Vælg mindst to cases for at sammenligne' });
      return;
    }

    // Hent nøgletal for hver case
    const resultater = [];

    for (const caseID of ids) {
      // Hent case-navn
      const cases = await database.query(
        `SELECT c.caseID, c.navn, c.beskrivelse,
                e.vejnavn, e.husnummer, p.bynavn
         FROM Propalyze.investeringscase c
         JOIN Propalyze.ejendomsprofil e ON c.ejendomID = e.ejendomID
         JOIN Propalyze.postnummer p ON e.postnummer = p.postnummer
         WHERE c.caseID = @caseID`,
        { caseID: caseID }
      );

      if (cases.length === 0) continue;

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

      // Hent driftsudgifter - summer alle til månedlig total
      const driftsbudget = await database.query(
        'SELECT * FROM Propalyze.driftsbudget WHERE caseID = @caseID',
        { caseID: caseID }
      );

      let maanedligDrift = 0;
      if (driftsbudget.length > 0) {
        const udgifter = await database.query(
          'SELECT * FROM Propalyze.udgift WHERE driftsbudgetID = @id',
          { id: driftsbudget[0].driftsbudgetID }
        );
        const indtaegter = await database.query(
          'SELECT * FROM Propalyze.indtaegt WHERE driftsbudgetID = @id',
          { id: driftsbudget[0].driftsbudgetID }
        );
        maanedligDrift = CashflowBeregner.beregnMaanedligIndtaegt(indtaegter);
        maanedligDrift -= CashflowBeregner.beregnMaanedligDriftsomkostning(udgifter);
      }

      // Hent udlejning
      const udlejning = await database.query(
        'SELECT * FROM Propalyze.udlejning WHERE caseID = @caseID',
        { caseID: caseID }
      );

      // Beregn månedlig ydelse for år 1 og total rente over hele løbetiden.
      // Bruger LaaneBeregner så alle lånetyper og afdragsfrihed håndteres korrekt
      let maanedligYdelse = 0;
      let totalRente = 0;
      if (finansiering.length > 0) {
        const f = finansiering[0];
        const afdragsfri = f.afdragsfriaar || 0;

        maanedligYdelse = LaaneBeregner.beregnYdelse(f.laanebeloeb, f.rente, f.loebetid_aar, afdragsfri, f.laanetype, 0);
        totalRente = LaaneBeregner.beregnTotalRente(f.laanebeloeb, f.rente, f.loebetid_aar, afdragsfri, f.laanetype);
      }

      let maanedligLeje;
      if (udlejning.length > 0 && udlejning[0].udlejning_status) {
        maanedligLeje = udlejning[0].maanedlig_husleje;
      } else {
        maanedligLeje = 0;
      }

      // Hent køb-værdier hvis køb findes
      let ejendomspris = null;
      if (koeb.length > 0) {
        ejendomspris = koeb[0].ejendomspris;
      }

      // Hent finansieringsværdier hvis finansiering findes
      let laanebeloeb = null;
      let rente = null;
      let loebetid_aar = null;
      let laanetype = null;
      if (finansiering.length > 0) {
        laanebeloeb = finansiering[0].laanebeloeb;
        rente = finansiering[0].rente;
        loebetid_aar = finansiering[0].loebetid_aar;
        laanetype = finansiering[0].laanetype;
      }

      // Saml nøgletal for denne case
      resultater.push({
        caseID: caseID,
        navn: cases[0].navn,
        ejendom: `${cases[0].vejnavn} ${cases[0].husnummer}, ${cases[0].bynavn}`,
        ejendomspris: ejendomspris,
        laanebeloeb: laanebeloeb,
        rente: rente,
        loebetid_aar: loebetid_aar,
        laanetype: laanetype,
        maanedlig_ydelse: Math.round(maanedligYdelse),
        total_rente: Math.round(totalRente),
        maanedlig_drift: Math.round(maanedligDrift),
        maanedlig_leje: Math.round(maanedligLeje)
      });
    }

    res.status(200).json(resultater);

  } catch (err) {
    console.log('Fejl ved sammenligning:', err.message);
    res.status(500).json({ fejl: err.message });
  }
});


module.exports = router;
