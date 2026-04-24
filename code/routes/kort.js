// kort.js - Route til kortvisning via Dataforsyningen WMS
// Modtager UTM-koordinater fra BBR og proxyer WMS-kald

const express = require('express');
const router = express.Router();

// GET /api/kort?lag=luftfoto&x=538374&y=6221406
router.get('/', async (req, res) => {
  const lag = req.query.lag;
  const x = parseFloat(req.query.x);
  const y = parseFloat(req.query.y);

  if (!lag || isNaN(x) || isNaN(y)) {
    res.status(400).json({ fejl: 'Manglende lag, x eller y parameter' });
    return;
  }

  // Beregn bbox: et område på 300m x 200m rundt om ejendommen
  const bbox = (x - 50) + ',' + (y - 25) + ',' + (x + 50) + ',' + (y + 25);

  try {
    let url;

    if (lag === 'luftfoto') {
      url = 'https://api.dataforsyningen.dk/orto_foraar_DAF'
        + '?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0'
        + '&LAYERS=orto_foraar&STYLES=&CRS=EPSG:25832'
        + '&BBOX=' + bbox
        + '&WIDTH=600&HEIGHT=400&FORMAT=image/jpeg'
        + '&token=' + process.env.DATAFORSYNINGEN_TOKEN;
    } else {
      url = 'https://api.dataforsyningen.dk/wms/MatGaeldendeOgForeloebigWMS_DAF'
        + '?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0'
        + '&LAYERS=MatrikelSkel_Gaeldende&STYLES=&CRS=EPSG:25832'
        + '&BBOX=' + bbox
        + '&WIDTH=600&HEIGHT=400&FORMAT=image/png'
        + '&token=' + process.env.DATAFORSYNINGEN_TOKEN
        + '&TRANSPARENT=TRUE';
    }

    const response = await fetch(url);

    if (!response.ok) {
      res.status(502).json({ fejl: 'Kortservice svarede med ' + response.status });
      return;
    }

    // Send billedet videre til frontend med korrekt content-type
    const buffer = await response.arrayBuffer();
    res.set('Content-Type', response.headers.get('content-type'));
    res.send(Buffer.from(buffer));

  } catch (err) {
    console.log('Kort fejl:', err.message);
    res.status(500).json({ fejl: err.message });
  }
});

module.exports = router;