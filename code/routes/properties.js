// properties.js - Routes til ejendomsprofiler
// Håndterer CRUD for ejendomme i Propalyze.ejendomsprofil

const express = require('express');
const router = express.Router();
const database = require('../database/database');

// POST /api/properties
// Opretter en ny ejendomsprofil med data fra DAWA + manuelle felter
router.post('/', async (req, res) => {
  try {
    // Hent alle felter fra request body
    const data = req.body;
    console.log('Opretter ejendom:', data);

    // Validering: tjek at alle påkrævede felter er der
    // Vi tjekker eksplicit for hver - så vi kan give præcise fejlbeskeder
    if (!data.vejnavn || !data.husnummer || !data.postnummer || !data.bynavn) {
      res.status(400).json({ fejl: 'Adresse-felter er påkrævede' });
      return;
    }

    if (!data.ejendomstype) {
      res.status(400).json({ fejl: 'Ejendomstype er påkrævet' });
      return;
    }

    if (!data.byggeaar || !data.boligareal || !data.grundareal || !data.vaerelser) {
      res.status(400).json({ fejl: 'Byggeår, areal og værelser er påkrævede' });
      return;
    }

    // Tjek at numeriske felter giver mening
    // Database har CHECK constraints, men vi vil gerne fange det her med en pænere fejl
    if (data.byggeaar < 1000 || data.byggeaar > 2100) {
      res.status(400).json({ fejl: 'Byggeår skal være mellem 1000 og 2100' });
      return;
    }

    if (data.boligareal <= 0 || data.grundareal <= 0 || data.vaerelser <= 0) {
      res.status(400).json({ fejl: 'Areal og værelser skal være positive tal' });
      return;
    }

    // Bemærk: vi bruger parameteriserede queries (@navn) for at undgå SQL injection
    // Hvert @-navn matcher en nøgle i parametre-objektet vi sender med
    const sqlTekst = `
      INSERT INTO Propalyze.ejendomsprofil
        (vejnavn, husnummer, postnummer, bynavn, ejendomstype,
         byggeaar, boligareal, grundareal, vaerelser, dawaID, sidste_data_hentning)
      OUTPUT INSERTED.ejendomID
      VALUES
        (@vejnavn, @husnummer, @postnummer, @bynavn, @ejendomstype,
         @byggeaar, @boligareal, @grundareal, @vaerelser, @dawaID, GETDATE())
    `;

    const parametre = {
      vejnavn: data.vejnavn,
      husnummer: data.husnummer,
      postnummer: data.postnummer,
      bynavn: data.bynavn,
      ejendomstype: data.ejendomstype,
      byggeaar: data.byggeaar,
      boligareal: data.boligareal,
      grundareal: data.grundareal,
      vaerelser: data.vaerelser,
      dawaID: data.dawaID
    };

    const resultat = await database.query(sqlTekst, parametre);

    // OUTPUT INSERTED.ejendomID giver os det auto-genererede ID retur
    const nytID = resultat[0].ejendomID;
    console.log(`Ejendom oprettet med ID ${nytID}`);

    res.status(201).json({
      besked: 'Ejendomsprofil oprettet',
      ejendomID: nytID
    });

  } catch (err) {
    console.log('Fejl ved oprettelse af ejendom:', err.message);

    // Hvis dawaID allerede findes, returnerer SQL en fejl pga UNIQUE constraint
    // Vi tjekker fejlbeskeden og giver en pænere besked til brugeren
    if (err.message.includes('UNIQUE')) {
      res.status(409).json({ fejl: 'Denne ejendom er allerede oprettet' });
      return;
    }

    res.status(500).json({ fejl: err.message });
  }
});

module.exports = router;