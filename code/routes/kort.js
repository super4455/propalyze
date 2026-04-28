const express = require('express');
const router = express.Router();
const KortApi = require('../logic/kortAPI');

router.get('/', async (req, res) => {
  const lag = req.query.lag;
  const x = parseFloat(req.query.x);
  const y = parseFloat(req.query.y);

  if (!lag || isNaN(x) || isNaN(y)) {
    res.status(400).json({ fejl: 'Manglende lag, x eller y parameter' });
    return;
  }

  try {
    const { buffer, contentType } = await KortApi.hentKort(lag, x, y);
    res.set('Content-Type', contentType);
    res.send(buffer);
  } catch (err) {
    console.log('Kort fejl:', err.message);
    res.status(502).json({ fejl: err.message });
  }
});

module.exports = router;
