// investeringscase.js - Frontend-logik for 5-trins investeringscase formular
// Al data gemmes lokalt i variabler og sendes samlet til databasen ved afslutning
// Navn, beskrivelse og ejendomsID hentes fra sessionStorage (sat af app.js)

// Hent case-info fra sessionStorage
const ejendomsID = parseInt(sessionStorage.getItem('ejendomsID'));
const caseNavn = sessionStorage.getItem('caseNavn');
const caseBeskrivelse = sessionStorage.getItem('caseBeskrivelse');

if (!ejendomsID) {
  document.getElementById('fejl').textContent = 'Ingen ejendom valgt.';
}

// === LOKALE VARIABLER ===
// Ingenting sendes til databasen før brugeren afslutter trin 5

let koebData = null;
let finansieringData = null;
let renoveringer = [];
let udgifter = [];
let indtaegter = [];

// === NAVIGATION ===

function visTrin(nummer) {
  for (let i = 1; i <= 5; i++) {
    document.getElementById('trin' + i).style.display = 'none';
  }
  document.getElementById('trin' + nummer).style.display = 'block';
  document.getElementById('trin_indikator').textContent = 'Trin ' + nummer + ' af 5';
}

document.getElementById('forrige_trin2').addEventListener('click', function() { visTrin(1); });
document.getElementById('forrige_trin3').addEventListener('click', function() { visTrin(2); });
document.getElementById('forrige_trin4').addEventListener('click', function() { visTrin(3); });
document.getElementById('forrige_trin5').addEventListener('click', function() { visTrin(4); });

// === TRIN 1: KØB ===

function opdaterKoebOverblik() {
  const ejendomspris = parseFloat(document.getElementById('ejendomspris').value) || 0;
  const koebOmkostninger = parseFloat(document.getElementById('koeb_omkostninger').value) || 0;
  const advokatUdgifter = parseFloat(document.getElementById('advokat_udgifter').value) || 0;
  const tinglysning = parseFloat(document.getElementById('tinglysning').value) || 0;

  const samlet = ejendomspris + koebOmkostninger + advokatUdgifter + tinglysning;
  document.getElementById('samlet_koeb').textContent = samlet.toLocaleString('da-DK') + ' kr.';
}

document.getElementById('ejendomspris').addEventListener('input', opdaterKoebOverblik);
document.getElementById('koeb_omkostninger').addEventListener('input', opdaterKoebOverblik);
document.getElementById('advokat_udgifter').addEventListener('input', opdaterKoebOverblik);
document.getElementById('tinglysning').addEventListener('input', opdaterKoebOverblik);

// Gem køb lokalt - ingen database kald
document.getElementById('gem_koeb_knap').addEventListener('click', function() {
  const ejendomspris = parseFloat(document.getElementById('ejendomspris').value);
  const koebOmkostninger = parseFloat(document.getElementById('koeb_omkostninger').value);
  const advokatUdgifter = parseFloat(document.getElementById('advokat_udgifter').value);
  const tinglysning = parseFloat(document.getElementById('tinglysning').value);
  const besked = document.getElementById('koeb_besked');

  if (!ejendomspris || !koebOmkostninger || !advokatUdgifter || !tinglysning) {
    besked.textContent = 'Alle felter skal udfyldes';
    besked.className = 'fejl';
    return;
  }

  koebData = {
    ejendomspris: ejendomspris,
    koeb_omkostninger: koebOmkostninger,
    advokat_udgifter: advokatUdgifter,
    tinglysning: tinglysning,
    koeber_raadgivning: document.getElementById('koeber_raadgivning').checked
  };

  besked.textContent = 'Køb registreret';
  besked.className = 'succes';
  visTrin(2);
});

// === TRIN 2: FINANSIERING ===

// Annuitetsformlen: M = L * (r * (1+r)^n) / ((1+r)^n - 1)
// L = lånebeløb, r = månedlig rente, n = antal måneder
function beregnMaanedligYdelse(laanebeloeb, renteAarlig, loebetidAar) {
  if (!laanebeloeb || !renteAarlig || !loebetidAar) return 0;

  const r = renteAarlig / 100 / 12;
  const n = loebetidAar * 12;

  if (r === 0) return laanebeloeb / n;

  return Math.round(laanebeloeb * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
}

function opdaterFinansieringOverblik() {
  const laanebeloeb = parseFloat(document.getElementById('laanebeloeb').value) || 0;
  const rente = parseFloat(document.getElementById('rente').value) || 0;
  const loebetidAar = parseInt(document.getElementById('loebetid_aar').value) || 0;

  const maanedligYdelse = beregnMaanedligYdelse(laanebeloeb, rente, loebetidAar);
  const totalRente = (maanedligYdelse * loebetidAar * 12) - laanebeloeb;

  document.getElementById('maanedlig_ydelse').textContent =
    maanedligYdelse.toLocaleString('da-DK') + ' kr.';
  document.getElementById('total_rente').textContent =
    Math.max(0, Math.round(totalRente)).toLocaleString('da-DK') + ' kr.';
}

document.getElementById('laanebeloeb').addEventListener('input', opdaterFinansieringOverblik);
document.getElementById('rente').addEventListener('input', opdaterFinansieringOverblik);
document.getElementById('loebetid_aar').addEventListener('input', opdaterFinansieringOverblik);

// Gem finansiering lokalt - ingen database kald
document.getElementById('gem_finansiering_knap').addEventListener('click', function() {
  const laanebeloeb = parseFloat(document.getElementById('laanebeloeb').value);
  const rente = parseFloat(document.getElementById('rente').value);
  const loebetidAar = parseInt(document.getElementById('loebetid_aar').value);
  const afdragsfriaar = parseInt(document.getElementById('afdragsfriaar').value) || 0;
  const laanetype = document.getElementById('laanetype').value;
  const besked = document.getElementById('finansiering_besked');

  if (!laanebeloeb || !rente || !loebetidAar || !laanetype) {
    besked.textContent = 'Udfyld alle felter undtagen afdragsfri periode';
    besked.className = 'fejl';
    return;
  }

  finansieringData = {
    laanebeloeb: laanebeloeb,
    rente: rente,
    loebetid_aar: loebetidAar,
    afdragsfriaar: afdragsfriaar,
    laanetype: laanetype
  };

  besked.textContent = 'Finansiering registreret';
  besked.className = 'succes';
  visTrin(3);
});

// === TRIN 3: RENOVERING ===

// Tilføjer renovering til lokal liste - ingen database kald
document.getElementById('tilfoej_renovering_knap').addEventListener('click', function() {
  const type = document.getElementById('type_renovering').value;
  const omkostninger = parseFloat(document.getElementById('renovering_omkostninger').value);
  const aar = parseInt(document.getElementById('planlagt_aar').value);
  const besked = document.getElementById('renovering_besked');

  if (!type || !omkostninger || !aar) {
    besked.textContent = 'Udfyld alle renoveringsfelter';
    besked.className = 'fejl';
    return;
  }

  renoveringer.push({
    type_renovering: type,
    renovering_omkostninger: omkostninger,
    planlagt_aar: aar
  });

  visRenoveringListe();

  document.getElementById('type_renovering').value = '';
  document.getElementById('renovering_omkostninger').value = '';
  document.getElementById('planlagt_aar').value = '';

  besked.textContent = 'Renovering tilføjet';
  besked.className = 'succes';
});

function visRenoveringListe() {
  const liste = document.getElementById('renovering_liste');
  liste.innerHTML = '';
  for (const r of renoveringer) {
    const p = document.createElement('p');
    p.textContent = r.type_renovering + ' · '
      + r.renovering_omkostninger.toLocaleString('da-DK')
      + ' kr. · År ' + r.planlagt_aar;
    liste.appendChild(p);
  }
}

// Trin 3 er valgfrit
document.getElementById('naeste_trin3').addEventListener('click', function() {
  visTrin(4);
});

// === TRIN 4: DRIFTSBUDGET ===

function opdaterDriftsOverblik() {
  let maanedligUdgift = 0;
  let aarligUdgift = 0;
  let maanedligIndtaegt = 0;
  let aarligIndtaegt = 0;

  for (const u of udgifter) {
    if (u.frekvens === 'maanedlig') {
      maanedligUdgift += u.beloeb;
      aarligUdgift += u.beloeb * 12;
    } else {
      aarligUdgift += u.beloeb;
      maanedligUdgift += u.beloeb / 12;
    }
  }

  for (const i of indtaegter) {
    if (i.frekvens === 'maanedlig') {
      maanedligIndtaegt += i.beloeb;
      aarligIndtaegt += i.beloeb * 12;
    } else {
      aarligIndtaegt += i.beloeb;
      maanedligIndtaegt += i.beloeb / 12;
    }
  }

  document.getElementById('maanedlig_udgift_total').textContent =
    Math.round(maanedligUdgift).toLocaleString('da-DK') + ' kr.';
  document.getElementById('aarlig_udgift_total').textContent =
    Math.round(aarligUdgift).toLocaleString('da-DK') + ' kr.';
  document.getElementById('maanedlig_indtaegt_total').textContent =
    Math.round(maanedligIndtaegt).toLocaleString('da-DK') + ' kr.';
  document.getElementById('aarlig_indtaegt_total').textContent =
    Math.round(aarligIndtaegt).toLocaleString('da-DK') + ' kr.';
}

// Tilføjer udgift til lokal liste - ingen database kald
document.getElementById('tilfoej_udgift_knap').addEventListener('click', function() {
  const kategori = document.getElementById('udgift_kategori').value;
  const beloeb = parseFloat(document.getElementById('udgift_beloeb').value);
  const frekvens = document.getElementById('udgift_frekvens').value;
  const besked = document.getElementById('driftsbudget_besked');

  if (!kategori || !beloeb) {
    besked.textContent = 'Udfyld kategori og beløb';
    besked.className = 'fejl';
    return;
  }

  udgifter.push({ kategori: kategori, beloeb: beloeb, frekvens: frekvens });
  visUdgiftListe();
  opdaterDriftsOverblik();

  document.getElementById('udgift_kategori').value = '';
  document.getElementById('udgift_beloeb').value = '';
  besked.textContent = 'Udgift tilføjet';
  besked.className = 'succes';
});

// Tilføjer indtægt til lokal liste - ingen database kald
document.getElementById('tilfoej_indtaegt_knap').addEventListener('click', function() {
  const kategori = document.getElementById('indtaegt_kategori').value;
  const beloeb = parseFloat(document.getElementById('indtaegt_beloeb').value);
  const frekvens = document.getElementById('indtaegt_frekvens').value;
  const besked = document.getElementById('driftsbudget_besked');

  if (!kategori || !beloeb) {
    besked.textContent = 'Udfyld kategori og beløb';
    besked.className = 'fejl';
    return;
  }

  indtaegter.push({ kategori: kategori, beloeb: beloeb, frekvens: frekvens });
  visIndtaegtListe();
  opdaterDriftsOverblik();

  document.getElementById('indtaegt_kategori').value = '';
  document.getElementById('indtaegt_beloeb').value = '';
  besked.textContent = 'Indtægt tilføjet';
  besked.className = 'succes';
});

function visUdgiftListe() {
  const liste = document.getElementById('udgift_liste');
  liste.innerHTML = '';
  for (const u of udgifter) {
    const p = document.createElement('p');
    p.textContent = u.kategori + ' · '
      + u.beloeb.toLocaleString('da-DK') + ' kr. · ' + u.frekvens;
    liste.appendChild(p);
  }
}

function visIndtaegtListe() {
  const liste = document.getElementById('indtaegt_liste');
  liste.innerHTML = '';
  for (const i of indtaegter) {
    const p = document.createElement('p');
    p.textContent = i.kategori + ' · '
      + i.beloeb.toLocaleString('da-DK') + ' kr. · ' + i.frekvens;
    liste.appendChild(p);
  }
}

// Trin 4 er valgfrit
document.getElementById('gem_driftsbudget_knap').addEventListener('click', function() {
  document.getElementById('driftsbudget_besked').textContent = 'Driftsbudget registreret';
  document.getElementById('driftsbudget_besked').className = 'succes';
  visTrin(5);
});

// === TRIN 5: UDLEJNING + AFSLUT OG GEM ALT ===

document.getElementById('udlejning_status').addEventListener('change', function() {
  document.getElementById('udlejning_detaljer').style.display =
    this.checked ? 'block' : 'none';
});

function opdaterUdlejningOverblik() {
  const husleje = parseFloat(document.getElementById('maanedlig_husleje').value) || 0;
  const udlejUdgifter = parseFloat(document.getElementById('maanedlig_udlejning_udgifter').value) || 0;

  const maanedligCashflow = husleje - udlejUdgifter;
  document.getElementById('maanedlig_cashflow').textContent =
    maanedligCashflow.toLocaleString('da-DK') + ' kr.';
  document.getElementById('aarlig_cashflow').textContent =
    (maanedligCashflow * 12).toLocaleString('da-DK') + ' kr.';
}

document.getElementById('maanedlig_husleje').addEventListener('input', opdaterUdlejningOverblik);
document.getElementById('maanedlig_udlejning_udgifter').addEventListener('input', opdaterUdlejningOverblik);

// Afslut - gem ALT til databasen i ét hug
document.getElementById('gem_udlejning_knap').addEventListener('click', async function() {
  const besked = document.getElementById('udlejning_besked');

  // Validér at de to obligatoriske trin er udfyldt
  if (!koebData) {
    besked.textContent = 'Gå tilbage og udfyld trin 1 (køb)';
    besked.className = 'fejl';
    return;
  }

  if (!finansieringData) {
    besked.textContent = 'Gå tilbage og udfyld trin 2 (finansiering)';
    besked.className = 'fejl';
    return;
  }

  besked.textContent = 'Gemmer...';
  besked.className = '';

  try {
    // Opret selve investeringscasen i databasen som det første
    const caseSvar = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ejendomsID: ejendomsID,
        navn: caseNavn,
        beskrivelse: caseBeskrivelse
      })
    });

    const caseResultat = await caseSvar.json();
    const caseID = caseResultat.caseID;

    // Gem køb
    await fetch('/api/koeb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseID: caseID, ...koebData })
    });

    // Gem finansiering
    await fetch('/api/finansiering', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseID: caseID, ...finansieringData })
    });

    // Gem renoveringer (kan være ingen)
    for (const r of renoveringer) {
      await fetch('/api/renovering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseID: caseID, ...r })
      });
    }

    // Gem driftsbudget med udgifter og indtægter (kan være tomt)
    const dbSvar = await fetch('/api/driftsbudget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseID: caseID })
    });
    const dbResultat = await dbSvar.json();
    const driftsbudgetID = dbResultat.driftsbudgetID;

    for (const u of udgifter) {
      await fetch('/api/driftsbudget/udgift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driftsbudgetID: driftsbudgetID, ...u })
      });
    }

    for (const i of indtaegter) {
      await fetch('/api/driftsbudget/indtaegt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driftsbudgetID: driftsbudgetID, ...i })
      });
    }

    // Gem udlejning
    await fetch('/api/udlejning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseID: caseID,
        udlejning_status: document.getElementById('udlejning_status').checked,
        maanedlig_husleje: parseFloat(document.getElementById('maanedlig_husleje').value) || 0,
        maanedlig_udgifter: parseFloat(document.getElementById('maanedlig_udlejning_udgifter').value) || 0
      })
    });

    // Ryd sessionStorage nu hvor alt er gemt
    sessionStorage.removeItem('caseNavn');
    sessionStorage.removeItem('caseBeskrivelse');
    sessionStorage.removeItem('ejendomsID');

    besked.textContent = 'Investeringscase gemt! Åbner simulering...';
    besked.className = 'succes';

    setTimeout(function() {
      window.location.href = '/simulering.html?caseID=' + caseID;
    }, 1500);

  } catch (fejl) {
    console.log('Fejl ved gem:', fejl);
    besked.textContent = 'Noget gik galt. Prøv igen.';
    besked.className = 'fejl';
  }
});