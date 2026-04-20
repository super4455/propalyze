// addresses.js - Routes til adressesoegning
// Bruger DAWA (Danmarks Adressers Web API) til at slå adresser op

const express = require('express');
const router = express.Router();

// GET /api/addresses/search?q=jagtvej
// Returnerer en liste af adresseforslag fra DAWA
router.get('/search', async (req, res) => {
  try {
    // Hent søgeord fra URL'en (?q=...)
    const soegeord = req.query.q;
    console.log(`Søger efter: ${soegeord}`);

    // Tjek at brugeren har skrevet et søgeord
    if (!soegeord) {
      res.status(400).json({ fejl: 'Manglende søgeord' });
      return;
    }

    // Tjek at søgeordet er længere end 1 tegn
    if (soegeord.length < 2) {
      res.status(400).json({ fejl: 'Søgeord skal vaere mindst 2 tegn' });
      return;
    }

    // Byg URL og kald DAWA
    const dawaUrl = `https://api.dataforsyningen.dk/autocomplete?q=${soegeord}`;
    const dawaSvar = await fetch(dawaUrl);
    console.log(dawaSvar)

    // Tjek om DAWA svarede ok
    if (!dawaSvar.ok) {
      res.status(502).json({ fejl: 'DAWA er ikke tilgængelig' });
      return;
    }

    // Konverter svar til JSON og send tilbage til klient
    const forslag = await dawaSvar.json();
    res.status(200).json(forslag);

  } catch (err) {
    // Fanger uventede fejl (fx hvis DAWA er helt nede)
    console.log(`Fejl: ${err.message}`);
    res.status(500).json({ fejl: err.message });
  }
});

module.exports = router;