const express = require('express');
const router = express.Router();
const KortApi = require('../services/kortAPI');

// Returnerer et kortbillede (PNG) fra Dataforsyningen for et givet lag og koordinat
// Kaldes fra: ejendomsinfo.js:98 og app.js:263 (img.src på kortbilleder ved ejendomsvisning)
router.get('/', async (req, res) => {
  const lag = req.query.lag;
  const x = parseFloat(req.query.x);
  const y = parseFloat(req.query.y);

  if (!lag || isNaN(x) || isNaN(y)) {
    res.status(400).json({ fejl: 'Manglende lag, x eller y parameter' });
    return;
  }

  try {
    // hentKort returnerer billedet som rå bytes (buffer) plus billedformat (fx "image/png").
    // Content-Type-headeren skal sættes manuelt så browseren ved at det er et billede og ikke tekst/JSON.
    const { buffer, contentType } = await KortApi.hentKort(lag, x, y);
    res.set('Content-Type', contentType);
    res.send(buffer);
  } catch (err) {
    console.log('Kort fejl:', err.message);
    res.status(502).json({ fejl: err.message });
  }
});

module.exports = router;
