const express = require('express');
const router = express.Router();
const database = require('../database/database');
const BBRService = require('../services/BBRapi');
const DAWAService = require('../services/DAWAapi');

// GET /api/properties/lookup?dawaId=...
// Slår en ejendom op via DAWA + BBR og returnerer begge dele samlet
// Gemmer IKKE noget i databasen - bruges til preview
router.get('/lookup', async (req, res) => {
  try {
    const dawaId = req.query.dawaId;

    if (!dawaId) {
      res.status(400).json({ fejl: 'Manglende dawaId' });
      return;
    }

    const dawa = await DAWAService.hentAdresse(dawaId);
    const bbr = await BBRService.hentBBR(dawa);

    res.status(200).json({ dawa: dawa, bbr: bbr });

  } catch (err) {
    console.log('Fejl ved ejendomsopslag:', err.message);
    res.status(502).json({ fejl: `Kunne ikke hente ejendomsdata: ${err.message}` });
  }
});


// GET /api/properties
// Henter alle gemte ejendomsprofiler fra databasen
router.get('/', async (req, res) => {
  try {
    const sqlTekst = `
  SELECT e.ejendomID, e.vejnavn, e.husnummer, e.etage, e.doer, e.postnummer, p.bynavn,
         e.ejendomstype, e.byggeaar, e.boligareal, e.grundareal, e.vaerelser,
         e.oprettet_dato, e.sidste_data_hentning, e.dawaID,
         COUNT(c.caseID) AS antal_cases
  FROM Propalyze.ejendomsprofil e
  JOIN Propalyze.postnummer p ON e.postnummer = p.postnummer
  LEFT JOIN Propalyze.investeringscase c ON e.ejendomID = c.ejendomID
  GROUP BY e.ejendomID, e.vejnavn, e.husnummer, e.etage, e.doer, e.postnummer, p.bynavn,
           e.ejendomstype, e.byggeaar, e.boligareal, e.grundareal, e.vaerelser,
           e.oprettet_dato, e.sidste_data_hentning, e.dawaID
  ORDER BY e.oprettet_dato DESC
`;

    const ejendomme = await database.query(sqlTekst);
    res.status(200).json(ejendomme);

  } catch (err) {
    console.log('Fejl ved hentning af ejendomme:', err.message);
    res.status(500).json({ fejl: err.message });
  }
});


// GET /api/properties/:id
// Henter én gemt ejendomsprofil med koordinater til kortvisning
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;

    const sqlTekst = `
      SELECT e.ejendomID, e.vejnavn, e.husnummer, e.etage, e.doer, e.postnummer, p.bynavn,
             e.ejendomstype, e.byggeaar, e.boligareal, e.grundareal, e.vaerelser, e.dawaID,
             e.koordinat_x, e.koordinat_y
      FROM Propalyze.ejendomsprofil e
      JOIN Propalyze.postnummer p ON e.postnummer = p.postnummer
      WHERE e.ejendomID = @id
    `;

    const rækker = await database.query(sqlTekst, { id: id });

    if (rækker.length === 0) {
      res.status(404).json({ fejl: 'Ejendomsprofil ikke fundet' });
      return;
    }

    const profil = rækker[0];

    const koordinater = profil.koordinat_x !== null && profil.koordinat_y !== null
      ? [profil.koordinat_x, profil.koordinat_y]
      : null;

    res.status(200).json({
      vejnavn: profil.vejnavn,
      husnummer: profil.husnummer,
      etage: profil.etage,
      doer: profil.doer,
      postnummer: profil.postnummer,
      bynavn: profil.bynavn,
      ejendomstype: profil.ejendomstype,
      byggeaar: profil.byggeaar,
      boligareal: profil.boligareal,
      grundareal: profil.grundareal,
      vaerelser: profil.vaerelser,
      koordinater: koordinater
    });

  } catch (err) {
    console.log('Fejl ved hentning af ejendomsprofil:', err.message);
    res.status(500).json({ fejl: err.message });
  }
});


// DELETE /api/properties/:id
// Sletter en ejendomsprofil fra databasen
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    console.log('Sletter ejendom med ID:', id);

    const sqlTekst = `
      DELETE FROM Propalyze.ejendomsprofil
      WHERE ejendomID = @id
    `;

    await database.query(sqlTekst, { id: id });

    res.status(200).json({ besked: 'Ejendomsprofil slettet' });

  } catch (err) {
    console.log('Fejl ved sletning:', err.message);
    res.status(500).json({ fejl: err.message });
  }
});



// POST /api/ejendomme
// Opretter en ny ejendomsprofil med data fra DAWA + BBR
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    console.log('Opretter ejendom:', data);

    // Validér at vi har adressedata
    if (!data.dawaID || !data.vejnavn || !data.husnummer || !data.postnummer || !data.bynavn) {
      res.status(400).json({ fejl: 'Adressedata mangler' });
      return;
    }

    // Validér at vi har ejendomsdata
    if (!data.ejendomstype || !data.byggeaar || !data.boligareal || !data.vaerelser) {
      res.status(400).json({ fejl: 'Ejendomsdata mangler' });
      return;
    }

    // BBR returnerer koordinater som strings i array [x, y] (UTM 32N)
    let koordinatX = null;
    let koordinatY = null;
    if (data.koordinater) {
      if (data.koordinater[0]) {
        koordinatX = parseFloat(data.koordinater[0]);
      }
      if (data.koordinater[1]) {
        koordinatY = parseFloat(data.koordinater[1]);
      }
    }

    await database.query(`
      IF NOT EXISTS (SELECT 1 FROM Propalyze.postnummer WHERE postnummer = @postnummer)
        INSERT INTO Propalyze.postnummer (postnummer, bynavn) VALUES (@postnummer, @bynavn)
    `, { postnummer: data.postnummer, bynavn: data.bynavn });

    const sqlTekst = `
      INSERT INTO Propalyze.ejendomsprofil
        (vejnavn, husnummer, etage, doer, postnummer, ejendomstype,
         byggeaar, boligareal, grundareal, vaerelser, dawaID,
         koordinat_x, koordinat_y, sidste_data_hentning)
      OUTPUT INSERTED.ejendomID
      VALUES
        (@vejnavn, @husnummer, @etage, @doer, @postnummer, @ejendomstype,
         @byggeaar, @boligareal, @grundareal, @vaerelser, @dawaID,
         @koordinat_x, @koordinat_y, GETDATE())
    `;

    const parametre = {
      vejnavn: data.vejnavn,
      husnummer: data.husnummer,
      etage: data.etage,
      doer: data.doer,
      postnummer: data.postnummer,
      ejendomstype: data.ejendomstype,
      byggeaar: data.byggeaar,
      boligareal: data.boligareal,
      grundareal: data.grundareal,
      vaerelser: data.vaerelser,
      dawaID: data.dawaID,
      koordinat_x: koordinatX,
      koordinat_y: koordinatY
    };

    const resultat = await database.query(sqlTekst, parametre);
    const nytID = resultat[0].ejendomID;
    console.log('Ejendom oprettet med ID:', nytID);

    res.status(201).json({
      besked: 'Ejendomsprofil oprettet',
      ejendomID: nytID
    });

  } catch (err) {
    console.log('Fejl ved oprettelse:', err.message);

    // UNIQUE constraint på dawaID fanger duplikater
    if (err.message.includes('UNIQUE')) {
      res.status(409).json({ fejl: 'Denne ejendom er allerede oprettet' });
      return;
    }

    res.status(500).json({ fejl: err.message });
  }
});



// PUT /api/properties/:id
// Opdaterer en eksisterende ejendomsprofil i databasen
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;
    console.log('Opdaterer ejendom med ID:', id);

    // Validér at vi har de nødvendige felter
    if (!data.vejnavn || !data.husnummer || !data.postnummer || !data.bynavn) {
      res.status(400).json({ fejl: 'Adressedata mangler' });
      return;
    }

    if (!data.ejendomstype || !data.byggeaar || !data.boligareal || !data.vaerelser) {
      res.status(400).json({ fejl: 'Ejendomsdata mangler' });
      return;
    }

    await database.query(`
      IF NOT EXISTS (SELECT 1 FROM Propalyze.postnummer WHERE postnummer = @postnummer)
        INSERT INTO Propalyze.postnummer (postnummer, bynavn) VALUES (@postnummer, @bynavn)
    `, { postnummer: data.postnummer, bynavn: data.bynavn });

    const sqlTekst = `
      UPDATE Propalyze.ejendomsprofil
      SET vejnavn = @vejnavn,
          husnummer = @husnummer,
          etage = @etage,
          doer = @doer,
          postnummer = @postnummer,
          ejendomstype = @ejendomstype,
          byggeaar = @byggeaar,
          boligareal = @boligareal,
          grundareal = @grundareal,
          vaerelser = @vaerelser
      WHERE ejendomID = @id
    `;

    const parametre = {
      id: id,
      vejnavn: data.vejnavn,
      husnummer: data.husnummer,
      etage: data.etage,
      doer: data.doer,
      postnummer: data.postnummer,
      ejendomstype: data.ejendomstype,
      byggeaar: data.byggeaar,
      boligareal: data.boligareal,
      grundareal: data.grundareal,
      vaerelser: data.vaerelser
    };

    await database.query(sqlTekst, parametre);

    res.status(200).json({ besked: 'Ejendomsprofil opdateret' });

  } catch (err) {
    console.log('Fejl ved opdatering:', err.message);
    res.status(500).json({ fejl: err.message });
  }
});


// POST /api/ejendomme/:id/opdater-data
// Genhenter BBR-data for en eksisterende ejendomsprofil og opdaterer sidste_data_hentning
router.post('/:id/opdater-data', async (req, res) => {
  try {
    const id = req.params.id;

    const hentSql = `
      SELECT dawaID FROM Propalyze.ejendomsprofil WHERE ejendomID = @id
    `;
    const rækker = await database.query(hentSql, { id: id });

    if (rækker.length === 0) {
      res.status(404).json({ fejl: 'Ejendomsprofil ikke fundet' });
      return;
    }

    const dawaId = rækker[0].dawaID;

    const dawa = await DAWAService.hentAdresse(dawaId);
    const bbr = await BBRService.hentBBR(dawa);

    let koordinatX = null;
    let koordinatY = null;
    if (bbr.koordinater) {
      if (bbr.koordinater[0]) {
        koordinatX = parseFloat(bbr.koordinater[0]);
      }
      if (bbr.koordinater[1]) {
        koordinatY = parseFloat(bbr.koordinater[1]);
      }
    }

    const opdaterSql = `
      UPDATE Propalyze.ejendomsprofil
      SET ejendomstype = @ejendomstype,
          byggeaar = @byggeaar,
          boligareal = @boligareal,
          grundareal = @grundareal,
          vaerelser = @vaerelser,
          koordinat_x = @koordinat_x,
          koordinat_y = @koordinat_y,
          sidste_data_hentning = GETDATE()
      WHERE ejendomID = @id
    `;

    await database.query(opdaterSql, {
      id: id,
      ejendomstype: bbr.ejendomstype,
      byggeaar: bbr.byggeaar,
      boligareal: bbr.boligareal,
      grundareal: bbr.grundareal,
      vaerelser: bbr.vaerelser,
      koordinat_x: koordinatX,
      koordinat_y: koordinatY
    });

    res.status(200).json({ besked: 'BBR-data opdateret' });

  } catch (err) {
    console.log('Fejl ved opdatering af BBR-data:', err.message);
    res.status(500).json({ fejl: err.message });
  }
});


module.exports = router;