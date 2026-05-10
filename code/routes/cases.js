const express = require('express');
const router = express.Router();
const database = require('../database/database');

// Opretter en ny investeringscase for en ejendom (kun navn + beskrivelse — øvrige data sendes til /api/koeb mv. bagefter)
// Kaldes fra: case-formular.js:476 (gemSomNy — første kald i opret-flowet)
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    console.log('Opretter investeringscase:', data);

    // Validér input
    if (!data.ejendomID) {
      res.status(400).json({ fejl: 'EjendomID mangler' });
      return;
    }

    if (!data.navn) {
      res.status(400).json({ fejl: 'Navn er påkrævet' });
      return;
    }

    const sqlTekst = `
      INSERT INTO Propalyze.investeringscase
        (ejendomID, navn, beskrivelse)
      OUTPUT INSERTED.caseID
      VALUES
        (@ejendomID, @navn, @beskrivelse)
    `;

    const parametre = {
      ejendomID: data.ejendomID,
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


// Duplikerer en eksisterende case — henter alle data og indsætter dem som en ny case med "Kopi af " foran navnet
// Kaldes fra: app.js:474 ("Duplikér"-knappen i case-listen for en ejendom)
router.post('/:id/dupliker', async (req, res) => {
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
      `INSERT INTO Propalyze.investeringscase (ejendomID, navn, beskrivelse)
       OUTPUT INSERTED.caseID
       VALUES (@ejendomID, @navn, @beskrivelse)`,
      {
        ejendomID: c.ejendomID,
        navn: `Kopi af ${c.navn}`,
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


// Henter alle investeringscases på tværs af ejendomme — bruges til sammenligningssiden
// Kaldes fra: sammenligning.js:16 (fyldte case-listen med checkbokse)
router.get('/alle', async (req, res) => {
  try {
    const sqlTekst = `
      SELECT c.caseID, c.navn, c.beskrivelse, c.start_dato,
             e.vejnavn, e.husnummer, p.bynavn
      FROM Propalyze.investeringscase c
      JOIN Propalyze.ejendomsprofil e ON c.ejendomID = e.ejendomID
      JOIN Propalyze.postnummer p ON e.postnummer = p.postnummer
      ORDER BY c.start_dato DESC
    `;

    const resultat = await database.query(sqlTekst, {});
    res.status(200).json(resultat);

  } catch (err) {
    console.log('Fejl ved hentning af alle cases:', err.message);
    res.status(500).json({ fejl: err.message });
  }
});



// Henter alle investeringscases for en given ejendomsprofil
// Kaldes fra: app.js:430 (visCases — listen af cases inde i ejendomsmodalen)
router.get('/', async (req, res) => {
  try {
    const ejendomID = req.query.ejendomID;

    if (!ejendomID) {
      res.status(400).json({ fejl: 'Manglende ejendomID' });
      return;
    }

    const sqlTekst = `
      SELECT caseID, navn, beskrivelse, start_dato
      FROM Propalyze.investeringscase
      WHERE ejendomID = @ejendomID
      ORDER BY start_dato DESC
    `;

    const resultat = await database.query(sqlTekst, { ejendomID: ejendomID });
    res.status(200).json(resultat);

  } catch (err) {
    console.log('Fejl ved hentning af cases:', err.message);
    res.status(500).json({ fejl: err.message });
  }
});

// Sletter en investeringscase (ON DELETE CASCADE fjerner også køb, finansiering, drift mv.)
// Kaldes fra: app.js:496 ("Slet case"-knappen i case-listen)
router.delete('/:id', async (req, res) => {
  try {
    const caseID = req.params.id;
    console.log('Sletter case:', caseID);

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