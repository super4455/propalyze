// Frontend-logik for ejendomssiden
// Henter DAWA+BBR-data fra backend, viser dem, viser begge kort, og lader brugeren gemme

const fejlFelt = document.getElementById('fejl');
const gemKnap = document.getElementById('gem_knap');
const besked = document.getElementById('besked');

const params = new URLSearchParams(window.location.search);
const dawaId = params.get('dawaId');

let ejendom = null;

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

function vis(dawa, bbr) {
  ejendom = { dawa: dawa, bbr: bbr };

  document.getElementById('adresse').textContent = dawa.adresse;
  document.getElementById('ejendomstype').textContent = bbr.ejendomstype || '—';
  document.getElementById('byggeaar').textContent = bbr.byggeaar || '—';
  document.getElementById('boligareal').textContent = bbr.boligareal ? bbr.boligareal + ' m²' : '—';
  document.getElementById('grundareal').textContent = bbr.grundareal ? bbr.grundareal + ' m²' : '—';
  document.getElementById('vaerelser').textContent = bbr.vaerelser || '—';
  document.getElementById('antalEtager').textContent = bbr.antalEtager || '—';

  gemKnap.style.display = 'block';

  // Vis begge kort automatisk når data er klar
  visKort('luftfoto', 'luftfoto_billede', 'luftfoto_loading');
  visKort('matrikel', 'matrikel_billede', 'matrikel_loading');
}

// Henter og viser ét kortbillede fra vores backend
function visKort(lag, billedeId, loadingId) {
  const billede = document.getElementById(billedeId);
  const loading = document.getElementById(loadingId);

  // Tjek at vi har koordinater fra BBR
  if (!ejendom || !ejendom.bbr.koordinater) {
    loading.textContent = 'Koordinater ikke tilgængelige';
    return;
  }

  // Koordinaterne er allerede UTM fra BBR - send direkte
  const x = ejendom.bbr.koordinater[0];
  const y = ejendom.bbr.koordinater[1];

  const url = '/api/kort?lag=' + lag + '&x=' + x + '&y=' + y;

  // Sæt billedets src direkte - browseren henter det selv
  billede.src = url;

  billede.onload = function() {
    loading.style.display = 'none';
    billede.style.display = 'block';
  };

  billede.onerror = function() {
    loading.textContent = 'Kunne ikke hente ' + lag;
  };
}

// === GEM EJENDOMSPROFIL ===

gemKnap.addEventListener('click', gemEjendom);

async function gemEjendom() {
  const data = {
    dawaID: ejendom.dawa.id,
    vejnavn: ejendom.dawa.vejnavn,
    husnummer: ejendom.dawa.husnummer,
    postnummer: ejendom.dawa.postnummer,
    bynavn: ejendom.dawa.bynavn,
    ejendomstype: ejendom.bbr.ejendomstype,
    byggeaar: ejendom.bbr.byggeaar,
    boligareal: ejendom.bbr.boligareal,
    grundareal: ejendom.bbr.grundareal || 0,
    vaerelser: ejendom.bbr.vaerelser
  };

  console.log('Gemmer ejendom:', data);

  try {
    const svar = await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const resultat = await svar.json();

    if (svar.ok) {
      besked.textContent = 'Ejendomsprofil gemt! Gå tilbage til forsiden for at se den.';
      besked.className = 'succes';
      gemKnap.disabled = true;
    } else {
      besked.textContent = 'Fejl: ' + resultat.fejl;
      besked.className = 'fejl';
    }

  } catch (fejl) {
    console.log('Netvaerksfejl:', fejl);
    besked.textContent = 'Kunne ikke kontakte serveren';
    besked.className = 'fejl';
  }
}

indlaes();