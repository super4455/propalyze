// cashflow.js - Cashflow-beregninger for en investeringscase
// Beregner månedlige driftsudgifter, renoveringsudgifter og samlet cashflow

// ==========================================
// DRIFTSUDGIFTER
// Summerer alle løbende udgifter til en månedlig total
// Udgifter kan være månedlige eller årlige
// ==========================================

// Beregner samlet månedlig driftsudgift fra udgiftslisten
function beregnMaanedligDrift(udgifter) {
  let total = 0;

  for (const u of udgifter) {
    if (u.frekvens === 'maanedlig') {
      total += parseFloat(u.beloeb);
    } else {
      total += parseFloat(u.beloeb) / 12;
    }
  }

  return total;
}

// Beregner samlet månedlig driftsindtægt fra indtægtslisten
function beregnMaanedligIndtaegt(indtaegter) {
  let total = 0;

  for (const i of indtaegter) {
    if (i.frekvens === 'maanedlig') {
      total += parseFloat(i.beloeb);
    } else {
      total += parseFloat(i.beloeb) / 12;
    }
  }

  return total;
}

// ==========================================
// RENOVERING
// Renoveringsudgifter er engangsudgifter der rammer i et specifikt år
// De påvirker kun cashflow det år de er planlagt
// ==========================================

// Beregner renoveringsudgifter for et specifikt simuleringsår
// simuleringsAar = 1, 2, 3... (relativt til simuleringens start)
// startAar = det kalenderår simuleringen starter
function beregnRenoveringForAar(renoveringer, simuleringsAar, startAar) {
  // Omregn simuleringsår til kalenderår
  const kalenderAar = startAar + simuleringsAar - 1;
  let total = 0;

  for (const r of renoveringer) {
    if (parseInt(r.planlagt_aar) === kalenderAar) {
      total += parseFloat(r.renovering_omkostninger);
    }
  }

  return total;
}

// ==========================================
// CASHFLOW
// Det samlede cashflow for et givent år i simuleringen
// Alle månedlige beløb ganges med 12 for at få årsbeløb
// Renoveringsudgifter er allerede på årsbeløb
// ==========================================

// Beregner det samlede årlige cashflow
// Positivt cashflow = overskud, negativt = underskud
function beregnAarligCashflow(maanedligLeje, maanedligUdlejningUdgift, maanedligYdelse, maanedligDrift, maanedligDriftsIndtaegt, aarligRenovering) {
  const aarligLejeIndtaegt     = maanedligLeje * 12;
  const aarligDriftsIndtaegt   = maanedligDriftsIndtaegt * 12;
  const aarligUdlejningUdgift  = maanedligUdlejningUdgift * 12;
  const aarligYdelse           = maanedligYdelse * 12;
  const aarligDrift            = maanedligDrift * 12;

  return aarligLejeIndtaegt + aarligDriftsIndtaegt - aarligUdlejningUdgift - aarligYdelse - aarligDrift - aarligRenovering;
}

// ==========================================
// EJENDOMSVÆRDI OG EGENKAPITAL
// Beregner fremtidig ejendomsværdi baseret på eksponentiel vækst
// og investorens egenkapital som forskellen mellem værdi og restgæld
// ==========================================

// vaekstAarlig er et decimaltal, f.eks. 0.02 for 2% årlig stigning
function beregnEjendomsvaerdi(startpris, vaekstAarlig, aar) {
  return startpris * Math.pow(1 + vaekstAarlig, aar);
}

function beregnEgenkapital(ejendomsvaerdi, restgaeld) {
  return ejendomsvaerdi - restgaeld;
}

module.exports = { beregnMaanedligDrift, beregnMaanedligIndtaegt, beregnRenoveringForAar, beregnAarligCashflow, beregnEjendomsvaerdi, beregnEgenkapital };