// laan.js - Beregninger for alle lånetyper
// Understøtter annuitetslån, serielån og stående lån
// Hver lånetype har to funktioner: beregnYdelse og beregnRestgaeld

// ==========================================
// ANNUITETSLÅN
// Fast ydelse hver måned - renteandel falder, afdrag stiger over tid
// Formel: M = L * (r*(1+r)^n) / ((1+r)^n - 1)
// L = lånebeløb, r = månedlig rente, n = antal måneder
// ==========================================

function beregnYdelseAnnuitet(laanebeloeb, renteAarlig, loebetidAar) {
  const r = renteAarlig / 100 / 12;
  const n = loebetidAar * 12;

  if (r === 0) return laanebeloeb / n;

  return laanebeloeb * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function beregnRestgaeldAnnuitet(laanebeloeb, renteAarlig, loebetidAar, betalteAar) {
  if (betalteAar >= loebetidAar) return 0;

  const r = renteAarlig / 100 / 12;
  const n = loebetidAar * 12;
  const t = betalteAar * 12;

  if (r === 0) return Math.max(0, laanebeloeb - (laanebeloeb / n) * t);

  return laanebeloeb * (Math.pow(1 + r, n) - Math.pow(1 + r, t)) / (Math.pow(1 + r, n) - 1);
}

// ==========================================
// SERIELÅN
// Fast afdrag hver måned - ydelsen falder over tid fordi renteandelen falder
// Fast afdrag = L / n
// Månedlig ydelse = fast afdrag + (restgæld * månedlig rente)
// ==========================================

function beregnYdelseSerie(laanebeloeb, renteAarlig, loebetidAar, betalteAar) {
  if (betalteAar >= loebetidAar) return 0;

  const r = renteAarlig / 100 / 12;
  const n = loebetidAar * 12;

  // Fast månedligt afdrag
  const fastAfdrag = laanebeloeb / n;

  // Restgæld ved starten af dette år
  const restgaeld = beregnRestgaeldSerie(laanebeloeb, loebetidAar, betalteAar);

  // Ydelse = fast afdrag + rente på restgæld
  return fastAfdrag + restgaeld * r;
}

function beregnRestgaeldSerie(laanebeloeb, loebetidAar, betalteAar) {
  if (betalteAar >= loebetidAar) return 0;

  const n = loebetidAar * 12;
  const t = betalteAar * 12;

  // Restgæld falder lineært fordi afdragene er faste
  return laanebeloeb * (1 - t / n);
}

// ==========================================
// STÅENDE LÅN
// Ingen afdrag i løbetiden - kun renter betales løbende
// Hele lånebeløbet tilbagebetales som ét beløb ved udløb
// Månedlig ydelse = L * månedlig rente (konstant)
// ==========================================

function beregnYdelseStaaende(laanebeloeb, renteAarlig, loebetidAar, betalteAar) {
  // Lånet er udløbet - hele beløbet er tilbagebetalt
  if (betalteAar >= loebetidAar) return 0;

  const r = renteAarlig / 100 / 12;

  // Kun renter - ingen afdrag
  return laanebeloeb * r;
}

function beregnRestgaeldStaaende(laanebeloeb, loebetidAar, betalteAar) {
  // Restgæld er uændret indtil lånet udløber
  if (betalteAar >= loebetidAar) return 0;

  return laanebeloeb;
}

// ==========================================
// FÆLLES INTERFACE
// Kalder den rigtige lånetype baseret på laanetype-parameteret
// Dette er det eneste der importeres fra resten af systemet
// ==========================================

// Returnerer månedlig ydelse for det givne år
function beregnYdelse(laanebeloeb, renteAarlig, loebetidAar, afdragsfriAar, laanetype, betalteAar) {

  // Afdragsfri periode gælder for alle lånetyper
  // I afdragsfri periode betales kun renter uanset lånetype
  if (betalteAar < afdragsfriAar) {
    const r = renteAarlig / 100 / 12;
    return laanebeloeb * r;
  }

  // Lånet er udløbet
  if (betalteAar > loebetidAar) return 0;

  if (laanetype === 'Annuitetslaan') {
    return beregnYdelseAnnuitet(laanebeloeb, renteAarlig, loebetidAar);
  }

  if (laanetype === 'Serielaan') {
    return beregnYdelseSerie(laanebeloeb, renteAarlig, loebetidAar, betalteAar);
  }

  if (laanetype === 'Staaende laan') {
    return beregnYdelseStaaende(laanebeloeb, renteAarlig, loebetidAar, betalteAar);
  }

  // Fallback til annuitetslån hvis ukendt lånetype
  console.log('Ukendt lånetype:', laanetype, '- falder tilbage til annuitetslån');
  return beregnYdelseAnnuitet(laanebeloeb, renteAarlig, loebetidAar);
}

// Returnerer restgæld efter det givne antal betalte år
function beregnRestgaeld(laanebeloeb, renteAarlig, loebetidAar, laanetype, betalteAar) {

  if (laanetype === 'Annuitetslaan') {
    return beregnRestgaeldAnnuitet(laanebeloeb, renteAarlig, loebetidAar, betalteAar);
  }

  if (laanetype === 'Serielaan') {
    return beregnRestgaeldSerie(laanebeloeb, loebetidAar, betalteAar);
  }

  if (laanetype === 'Staaende laan') {
    return beregnRestgaeldStaaende(laanebeloeb, loebetidAar, betalteAar);
  }

  // Fallback
  return beregnRestgaeldAnnuitet(laanebeloeb, renteAarlig, loebetidAar, betalteAar);
}

module.exports = { beregnYdelse, beregnRestgaeld };


