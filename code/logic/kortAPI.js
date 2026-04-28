const DATAFORSYNINGEN_BASE = 'https://api.dataforsyningen.dk';

class KortApi {

  static async hentKort(lag, x, y) {
    const bbox = (x - 50) + ',' + (y - 25) + ',' + (x + 50) + ',' + (y + 25);
    const token = process.env.DATAFORSYNINGEN_TOKEN;

    let url;

    if (lag === 'luftfoto') {
      url = DATAFORSYNINGEN_BASE + '/orto_foraar_DAF'
        + '?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0'
        + '&LAYERS=orto_foraar&STYLES=&CRS=EPSG:25832'
        + '&BBOX=' + bbox
        + '&WIDTH=600&HEIGHT=400&FORMAT=image/jpeg'
        + '&token=' + token;
    } else {
      url = DATAFORSYNINGEN_BASE + '/wms/MatGaeldendeOgForeloebigWMS_DAF'
        + '?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0'
        + '&LAYERS=MatrikelSkel_Gaeldende&STYLES=&CRS=EPSG:25832'
        + '&BBOX=' + bbox
        + '&WIDTH=600&HEIGHT=400&FORMAT=image/png'
        + '&token=' + token
        + '&TRANSPARENT=TRUE';
    }

    const svar = await fetch(url);

    if (!svar.ok) {
      throw new Error('Kortservice svarede med ' + svar.status);
    }

    const buffer = Buffer.from(await svar.arrayBuffer());
    const contentType = svar.headers.get('content-type');

    return { buffer, contentType };
  }
}

module.exports = KortApi;
