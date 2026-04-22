// front end logik for ejendomssiden
// Laeser dawaId fra URL, henter DAWA+BBR-data fra backend og viser dem

const fejlFelt = document.getElementById('fejl');

// Hent dawaId fra URL'en (?dawaId=...)
const params = new URLSearchParams(window.location.search);
const dawaId = params.get('dawaId');

async function indlaes() {
  if (!dawaId) {
    fejlFelt.textContent = 'Ingen adresse valgt.';
    return;
  }

  try {
    const svar = await fetch('/api/properties/lookup?dawaId=' + dawaId);

    if (!svar.ok) {
      const fejl = await svar.json().catch(function() { return {}; });
      fejlFelt.textContent = 'Fejl: ' + (fejl.fejl || 'kunne ikke hente data');
      return;
    }

    const data = await svar.json();
    vis(data.dawa, data.bbr);

  } catch (fejl) {
    console.log('Fejl ved indlaesning:', fejl);
    fejlFelt.textContent = 'Kunne ikke hente ejendomsdata.';
  }
}

// Udfylder felterne i DOM'en med data fra DAWA og BBR
function vis(dawa, bbr) {
  document.getElementById('vejnavn').textContent = dawa.vejnavn;
  document.getElementById('husnummer').textContent = dawa.husnummer;
  document.getElementById('postnummer').textContent = dawa.postnummer;
  document.getElementById('bynavn').textContent = dawa.bynavn;
  document.getElementById('dawaID').textContent = dawa.id;
  document.getElementById('ejendomstype').textContent = bbr.ejendomstype;
  document.getElementById('byggeaar').textContent = bbr.byggeaar;
  document.getElementById('vaerelser').textContent = bbr.vaerelser;
}

indlaes();
