const express = require('express');
const router = express.Router();
const DAWAService = require('../services/DAWAapi');

// GET /api/adresser/search?q=jagtvej
router.get('/search', async (req, res) => {
  try {
    const soegeord = req.query.q;

    if (!soegeord || soegeord.length < 2) {
      res.status(400).json({ fejl: 'Søgeord skal være mindst 2 tegn' });
      return;
    }

    const forslag = await DAWAService.soegAdresser(soegeord);
    res.status(200).json(forslag);

  } catch (err) {
    console.log('Fejl ved adressesøgning:', err.message);
    res.status(502).json({ fejl: err.message });
  }
});

module.exports = router;
