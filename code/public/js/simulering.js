// simulering.js - Frontend-logik for simulering af investeringscase
// Henter case-data fra backend og beregner nøgletal år for år

// Hent caseID fra URL'en
const params = new URLSearchParams(window.location.search);
const caseID = params.get('caseID');

if (!caseID) {
  document.getElementById('fejl').textContent = 'Ingen investeringscase valgt.';
}

// Holder case-data når de er hentet
let caseData = null;

// Hent case-data fra backend når siden loader
async function hentCaseData() {
  try {
    const svar = await fetch('/api/cases/' + caseID + '/data');

    if (!svar.ok) {
      document.getElementById('fejl').textContent = 'Kunne ikke hente case-data';
      return;
    }

    caseData = await svar.json();
    visParametre();

  } catch (fejl) {
    console.log('Fejl ved hentning:', fejl);
    document.getElementById('fejl').textContent = 'Kunne ikke kontakte serveren';
  }
}

// Viser et overblik over case-parametrene
function visParametre() {
  if (!caseData || !caseData.finansiering || !caseData.koeb) {
    document.getElementById('fejl').textContent = 'Case mangler køb eller finansiering';
    return;
  }

  const k = caseData.koeb;
  const f = caseData.finansiering;

  document.getElementById('parametre_liste').innerHTML =
    '<p><strong>Ejendomspris:</strong> ' + k.ejendomspris.toLocaleString('da-DK') + ' kr.</p>'
    + '<p><strong>Lånebeløb:</strong> ' + f.laanebeloeb.toLocaleString('da-DK') + ' kr.</p>'
    + '<p><strong>Rente:</strong> ' + f.rente + '%</p>'
    + '<p><strong>Løbetid:</strong> ' + f.loebetid_aar + ' år</p>'
    + '<p><strong>Lånetype:</strong> ' + f.laanetype + '</p>';

  document.getElementById('parametre_sektion').style.display = 'block';
}

// Annuitetsformlen - beregner månedlig ydelse
// M = L * (r * (1+r)^n) / ((1+r)^n - 1)
function beregnMaanedligYdelse(laanebeloeb, renteAarlig, loebetidAar) {
  const r = renteAarlig / 100 / 12;
  const n = loebetidAar * 12;

  if (r === 0) return laanebeloeb / n;

  return laanebeloeb * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

// Beregner resterende gæld efter et givent antal måneder
// Restgæld = L * ((1+r)^n - (1+r)^t) / ((1+r)^n - 1)
// L = lånebeløb, r = månedlig rente, n = total måneder, t = betalte måneder
function beregnRestgaeld(laanebeloeb, renteAarlig, loebetidAar, betalteAar) {
  const r = renteAarlig / 100 / 12;
  const n = loebetidAar * 12;
  const t = betalteAar * 12;

  if (r === 0) return Math.max(0, laanebeloeb - (laanebeloeb / n) * t);

  // Hvis lånet er udløbet
  if (betalteAar >= loebetidAar) return 0;

  return laanebeloeb * (Math.pow(1 + r, n) - Math.pow(1 + r, t)) / (Math.pow(1 + r, n) - 1);
}

// Beregner samlet månedlig driftsudgift
function beregnMaanedligDrift() {
  let maanedlig = 0;

  for (const u of caseData.udgifter) {
    if (u.frekvens === 'maanedlig') {
      maanedlig += parseFloat(u.beloeb);
    } else {
      maanedlig += parseFloat(u.beloeb) / 12;
    }
  }

  return maanedlig;
}

// Kører simuleringen og viser resultat i tabellen
document.getElementById('start_simulering_knap').addEventListener('click', function() {
  if (!caseData || !caseData.finansiering || !caseData.koeb) {
    document.getElementById('fejl').textContent = 'Manglende data - kan ikke simulere';
    return;
  }

  const periode = parseInt(document.getElementById('periode').value);
  const vaerdistigning = parseFloat(document.getElementById('vaerdistigning').value) / 100;

  if (periode < 30) {
    document.getElementById('fejl').textContent = 'Perioden skal være mindst 30 år';
    return;
  }

  const f = caseData.finansiering;
  const k = caseData.koeb;

  const laanebeloeb = parseFloat(f.laanebeloeb);
  const rente = parseFloat(f.rente);
  const loebetidAar = parseInt(f.loebetid_aar);
  const ejendomspris = parseFloat(k.ejendomspris);

  // Månedlig låneydelse (fast for annuitetslån)
  const maanedligYdelse = beregnMaanedligYdelse(laanebeloeb, rente, loebetidAar);

  // Månedlig driftsudgift
  const maanedligDrift = beregnMaanedligDrift();

  // Månedlig lejeindtægt (hvis udlejning er aktivt)
  let maanedligLeje = 0;
  let maanedligUdlejningUdgift = 0;
  if (caseData.udlejning && caseData.udlejning.udlejning_status) {
    maanedligLeje = parseFloat(caseData.udlejning.maanedlig_husleje);
    maanedligUdlejningUdgift = parseFloat(caseData.udlejning.maanedlig_udgifter);
  }

  // Byg tabellen
  const tbody = document.getElementById('simulering_tbody');
  tbody.innerHTML = '';

  for (let aar = 1; aar <= periode; aar++) {
    // Ejendomsværdi stiger med den forventede procent hvert år
    const ejendomsvaerdi = ejendomspris * Math.pow(1 + vaerdistigning, aar);

    // Restgæld efter dette år
    const gaeld = beregnRestgaeld(laanebeloeb, rente, loebetidAar, aar);

    // Egenkapital = ejendomsværdi minus restgæld
    const egenkapital = ejendomsvaerdi - gaeld;

    // Renoveringsudgift dette år
    let aarligRenovering = 0;
    for (const r of caseData.renoveringer) {
      if (parseInt(r.planlagt_aar) === (new Date().getFullYear() + aar - 1)) {
        aarligRenovering += parseFloat(r.renovering_omkostninger);
      }
    }

    // Cashflow dette år
    // = lejeindtægt - låneydelse - driftsudgifter - renoveringsudgifter
    const aarligCashflow = (maanedligLeje - maanedligUdlejningUdgift - maanedligYdelse - maanedligDrift) * 12 - aarligRenovering;

    // Tilføj række til tabellen
    const rad = document.createElement('tr');
    rad.innerHTML = '<td>' + aar + '</td>'
      + '<td>' + Math.round(ejendomsvaerdi).toLocaleString('da-DK') + ' kr.</td>'
      + '<td>' + Math.round(gaeld).toLocaleString('da-DK') + ' kr.</td>'
      + '<td>' + Math.round(egenkapital).toLocaleString('da-DK') + ' kr.</td>'
      + '<td>' + Math.round(aarligCashflow).toLocaleString('da-DK') + ' kr.</td>';

    tbody.appendChild(rad);
  }

  document.getElementById('resultat_sektion').style.display = 'block';
});

// Kør når siden loader
hentCaseData();