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


// POST /api/cases/:id/duplikoer
// Opretter en komplet kopi af en eksisterende investeringscase
// Kopierer: case, køb, finansiering, renovering, driftsbudget, udgifter, indtægter, udlejning
router.post('/:id/duplikoer', async (req, res) => {
  try {
    const originalID = req.params.id;
    console.log('Duplikerer case:', originalID);

    // Hent den originale case
    const original = await database.query(
      'SELECT * FROM Propalyze.investeringscase WHERE caseID = @caseID',
      { caseID: originalID }
    );

    if (original.length === 0) {
      res.status(404).json({ fejl: 'Case ikke fundet' });
      return;
    }

    const c = original[0];

    // Opret ny case med samme data - tilføj "Kopi af" til navn
    const nyCase = await database.query(
      `INSERT INTO Propalyze.investeringscase (ejendomsID, navn, beskrivelse)
       OUTPUT INSERTED.caseID
       VALUES (@ejendomsID, @navn, @beskrivelse)`,
      {
        ejendomsID: c.ejendomsID,
        navn: 'Kopi af ' + c.navn,
        beskrivelse: c.beskrivelse
      }
    );

    const nytCaseID = nyCase[0].caseID;

    // Kopier køb
    const koeb = await database.query(
      'SELECT * FROM Propalyze.koeb WHERE caseID = @caseID',
      { caseID: originalID }
    );

    if (koeb.length > 0) {
      const k = koeb[0];
      await database.query(
        `INSERT INTO Propalyze.koeb
           (caseID, ejendomspris, koeb_omkostninger, advokat_udgifter, tinglysning, koeber_raadgivning)
         VALUES (@caseID, @ejendomspris, @koeb_omkostninger, @advokat_udgifter, @tinglysning, @koeber_raadgivning)`,
        {
          caseID: nytCaseID,
          ejendomspris: k.ejendomspris,
          koeb_omkostninger: k.koeb_omkostninger,
          advokat_udgifter: k.advokat_udgifter,
          tinglysning: k.tinglysning,
          koeber_raadgivning: k.koeber_raadgivning
        }
      );
    }

    // Kopier finansiering
    const finansiering = await database.query(
      'SELECT * FROM Propalyze.finansiering WHERE caseID = @caseID',
      { caseID: originalID }
    );

    if (finansiering.length > 0) {
      const f = finansiering[0];
      await database.query(
        `INSERT INTO Propalyze.finansiering
           (caseID, laanebeloeb, rente, loebetid_aar, afdragsfriaar, laanetype)
         VALUES (@caseID, @laanebeloeb, @rente, @loebetid_aar, @afdragsfriaar, @laanetype)`,
        {
          caseID: nytCaseID,
          laanebeloeb: f.laanebeloeb,
          rente: f.rente,
          loebetid_aar: f.loebetid_aar,
          afdragsfriaar: f.afdragsfriaar,
          laanetype: f.laanetype
        }
      );
    }

    // Kopier renoveringer (kan være flere)
    const renoveringer = await database.query(
      'SELECT * FROM Propalyze.renovering WHERE caseID = @caseID',
      { caseID: originalID }
    );

    for (const r of renoveringer) {
      await database.query(
        `INSERT INTO Propalyze.renovering
           (caseID, type_renovering, renovering_omkostninger, planlagt_aar)
         VALUES (@caseID, @type_renovering, @renovering_omkostninger, @planlagt_aar)`,
        {
          caseID: nytCaseID,
          type_renovering: r.type_renovering,
          renovering_omkostninger: r.renovering_omkostninger,
          planlagt_aar: r.planlagt_aar
        }
      );
    }

    // Kopier driftsbudget med udgifter og indtægter
    const driftsbudget = await database.query(
      'SELECT * FROM Propalyze.driftsbudget WHERE caseID = @caseID',
      { caseID: originalID }
    );

    if (driftsbudget.length > 0) {
      const nytDb = await database.query(
        `INSERT INTO Propalyze.driftsbudget (caseID)
         OUTPUT INSERTED.driftsbudgetID
         VALUES (@caseID)`,
        { caseID: nytCaseID }
      );

      const nytDbID = nytDb[0].driftsbudgetID;
      const gammelDbID = driftsbudget[0].driftsbudgetID;

      // Kopier udgifter
      const udgifter = await database.query(
        'SELECT * FROM Propalyze.udgift WHERE driftsbudgetID = @id',
        { id: gammelDbID }
      );

      for (const u of udgifter) {
        await database.query(
          `INSERT INTO Propalyze.udgift (driftsbudgetID, kategori, beloeb, frekvens)
           VALUES (@driftsbudgetID, @kategori, @beloeb, @frekvens)`,
          {
            driftsbudgetID: nytDbID,
            kategori: u.kategori,
            beloeb: u.beloeb,
            frekvens: u.frekvens
          }
        );
      }

      // Kopier indtægter
      const indtaegter = await database.query(
        'SELECT * FROM Propalyze.indtaegt WHERE driftsbudgetID = @id',
        { id: gammelDbID }
      );

      for (const i of indtaegter) {
        await database.query(
          `INSERT INTO Propalyze.indtaegt (driftsbudgetID, kategori, beloeb, frekvens)
           VALUES (@driftsbudgetID, @kategori, @beloeb, @frekvens)`,
          {
            driftsbudgetID: nytDbID,
            kategori: i.kategori,
            beloeb: i.beloeb,
            frekvens: i.frekvens
          }
        );
      }
    }

    // Kopier udlejning
    const udlejning = await database.query(
      'SELECT * FROM Propalyze.udlejning WHERE caseID = @caseID',
      { caseID: originalID }
    );

    if (udlejning.length > 0) {
      const u = udlejning[0];
      await database.query(
        `INSERT INTO Propalyze.udlejning
           (caseID, udlejning_status, maanedlig_husleje, maanedlig_udgifter)
         VALUES (@caseID, @udlejning_status, @maanedlig_husleje, @maanedlig_udgifter)`,
        {
          caseID: nytCaseID,
          udlejning_status: u.udlejning_status,
          maanedlig_husleje: u.maanedlig_husleje,
          maanedlig_udgifter: u.maanedlig_udgifter
        }
      );
    }

    console.log('Case duplikeret - nyt ID:', nytCaseID);
    res.status(201).json({ besked: 'Case duplikeret', nytCaseID: nytCaseID });

  } catch (err) {
    console.log('Fejl ved duplikering:', err.message);
    res.status(500).json({ fejl: err.message });
  }
});


// GET /api/cases/alle
// Henter alle investeringscases på tværs af alle ejendomsprofiler
router.get('/alle', async (req, res) => {
  try {
    const sqlTekst = `
      SELECT c.caseID, c.navn, c.beskrivelse, c.start_dato,
             e.vejnavn, e.husnummer, e.bynavn
      FROM Propalyze.investeringscase c
      JOIN Propalyze.ejendomsprofil e ON c.ejendomsID = e.ejendomID
      ORDER BY c.start_dato DESC
    `;

    const resultat = await database.query(sqlTekst, {});
    res.status(200).json(resultat);

  } catch (err) {
    console.log('Fejl ved hentning af alle cases:', err.message);
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

// GET /api/cases/sammenlign?ids=1,2,3
// Henter nøgletal for flere cases til sammenligning
// ids er kommaseparerede caseID'er i query-parameteret
router.get('/sammenlign', async (req, res) => {
  try {
    const idsTekst = req.query.ids;

    if (!idsTekst) {
      res.status(400).json({ fejl: 'Ingen case-ID\'er angivet' });
      return;
    }

    // Split "1,2,3" til [1, 2, 3] og fjern ugyldige værdier
    const ids = idsTekst.split(',')
      .map(function(id) { return parseInt(id); })
      .filter(function(id) { return !isNaN(id); });

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
                e.vejnavn, e.husnummer, e.bynavn
         FROM Propalyze.investeringscase c
         JOIN Propalyze.ejendomsprofil e ON c.ejendomsID = e.ejendomID
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

        for (const u of udgifter) {
          if (u.frekvens === 'maanedlig') {
            maanedligDrift += parseFloat(u.beloeb);
          } else {
            maanedligDrift += parseFloat(u.beloeb) / 12;
          }
        }
      }

      // Hent udlejning
      const udlejning = await database.query(
        'SELECT * FROM Propalyze.udlejning WHERE caseID = @caseID',
        { caseID: caseID }
      );

      // Beregn månedlig ydelse med annuitetsformlen
      let maanedligYdelse = 0;
      let totalRente = 0;
      if (finansiering.length > 0) {
        const f = finansiering[0];
        const r = parseFloat(f.rente) / 100 / 12;
        const n = parseInt(f.loebetid_aar) * 12;
        const L = parseFloat(f.laanebeloeb);

        if (r === 0) {
          maanedligYdelse = L / n;
        } else {
          maanedligYdelse = L * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        }

        totalRente = (maanedligYdelse * n) - L;
      }

      // Beregn månedligt cashflow
      const maanedligLeje = udlejning.length > 0 && udlejning[0].udlejning_status
        ? parseFloat(udlejning[0].maanedlig_husleje)
        : 0;

      const udlejningUdgifter = udlejning.length > 0 && udlejning[0].udlejning_status
        ? parseFloat(udlejning[0].maanedlig_udgifter)
        : 0;

      const cashflow = maanedligLeje - udlejningUdgifter - maanedligYdelse - maanedligDrift;

      // Saml nøgletal for denne case
      resultater.push({
        caseID: caseID,
        navn: cases[0].navn,
        ejendom: cases[0].vejnavn + ' ' + cases[0].husnummer + ', ' + cases[0].bynavn,
        ejendomspris: koeb.length > 0 ? parseFloat(koeb[0].ejendomspris) : null,
        laanebeloeb: finansiering.length > 0 ? parseFloat(finansiering[0].laanebeloeb) : null,
        rente: finansiering.length > 0 ? parseFloat(finansiering[0].rente) : null,
        loebetid_aar: finansiering.length > 0 ? parseInt(finansiering[0].loebetid_aar) : null,
        laanetype: finansiering.length > 0 ? finansiering[0].laanetype : null,
        maanedlig_ydelse: Math.round(maanedligYdelse),
        total_rente: Math.round(totalRente),
        maanedlig_drift: Math.round(maanedligDrift),
        maanedlig_leje: Math.round(maanedligLeje),
        maanedlig_cashflow: Math.round(cashflow)
      });
    }

    res.status(200).json(resultater);

  } catch (err) {
    console.log('Fejl ved sammenligning:', err.message);
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


// PUT /api/cases/:id
// Opdaterer navn og beskrivelse for en investeringscase
router.put('/:id', async (req, res) => {
  try {
    const data = req.body;
    const caseID = req.params.id;

    if (!data.navn) {
      res.status(400).json({ fejl: 'Navn er påkrævet' });
      return;
    }

    await database.query(
      `UPDATE Propalyze.investeringscase
       SET navn = @navn, beskrivelse = @beskrivelse
       WHERE caseID = @caseID`,
      {
        caseID: caseID,
        navn: data.navn,
        beskrivelse: data.beskrivelse || ''
      }
    );

    res.status(200).json({ besked: 'Case opdateret' });

  } catch (err) {
    console.log('Fejl ved opdatering af case:', err.message);
    res.status(500).json({ fejl: err.message });
  }
});



module.exports = router;