const express = require('express');
const router = express.Router();
const database = require('../database/database');

// Opretter en ny investeringscase for en ejendom ved at gemme data i databasen
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
        (ejendomID, navn, beskrivelse)
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


// Opretter en kopi af en eksisterende investeringscase, ved at hente data fra databasen om den originale case, og opretter en ny case med samme data
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
       VALUES (@ejendomsID, @navn, @beskrivelse)`,
      {
        ejendomsID: c.ejendomID,
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


// Henter alle investeringscases. Bruges til oversigt
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



// Henter alle investeringscases for en given ejendomsprofil. Bruges når man skal vise cases relateret til en specifik ejendom
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
      WHERE ejendomID = @ejendomsID
      ORDER BY start_dato DESC
    `;

    const resultat = await database.query(sqlTekst, { ejendomsID: ejendomsID });
    res.status(200).json(resultat);

  } catch (err) {
    console.log('Fejl ved hentning af cases:', err.message);
    res.status(500).json({ fejl: err.message });
  }
});

// Sletter en investeringscase - fjerner også tilknyttede data, hvis der er nogen, ved hjælp af ON DELETE CASCADE i databasen
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


// Opdaterer en eksisterende investeringscase, ved at ændre navn og beskrivelse
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