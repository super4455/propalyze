const DATAFORSYNINGEN_BASE = 'https://api.dataforsyningen.dk';

class KortApi {
  // Henter et kortbillede fra Dataforsyningen og returnerer det som binær data klar til at sende videre til browseren.
  static async hentKort(lag, x, y) {
    // Definerer det område på kortet der hentes ud — 100 meter bredt og 50 meter højt centreret på ejendommen
    const bbox = `${x - 50},${y - 25},${x + 50},${y + 25}`;

    // Token til Dataforsyningens API hentes fra .env
    const token = process.env.DATAFORSYNINGEN_TOKEN;

    let url;

    // To forskellige WMS-tjenester afhængigt af om brugeren vil se luftfoto eller matrikelkort
    if (lag === 'luftfoto') {
      // Ortofoto fra forår (JPEG — ingen gennemsigtighed nødvendig)
      url = `${DATAFORSYNINGEN_BASE}/orto_foraar_DAF?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=orto_foraar&STYLES=&CRS=EPSG:25832&BBOX=${bbox}&WIDTH=600&HEIGHT=400&FORMAT=image/jpeg&token=${token}`;
    } else {
      // Matrikelskel (PNG med TRANSPARENT=TRUE så grundens grænser kan lægges oven på et andet kort)
      url = `${DATAFORSYNINGEN_BASE}/wms/MatGaeldendeOgForeloebigWMS_DAF?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=MatrikelSkel_Gaeldende&STYLES=&CRS=EPSG:25832&BBOX=${bbox}&WIDTH=600&HEIGHT=400&FORMAT=image/png&token=${token}&TRANSPARENT=TRUE`;
    }

    const svar = await fetch(url);

    if (!svar.ok) {
      throw new Error(`Kortservice svarede med ${svar.status}`);
    }

    // arrayBuffer() er den web-standard svaret kommer som; Express forventer en Node.js Buffer, så vi konverterer
    const buffer = Buffer.from(await svar.arrayBuffer());

    // Content-Type læses fra svaret (image/jpeg eller image/png) så routen kan sende den videre uændret
    const contentType = svar.headers.get('content-type');

    return { buffer, contentType };
  }
}

module.exports = KortApi;
