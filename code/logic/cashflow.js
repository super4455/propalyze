// cashflow.js - Cashflow-beregninger for en investeringscase
// Beregner månedlige driftsudgifter, driftsindtægter, renoveringsudgifter og samlet cashflow

class CashflowCalculator {

  // ==========================================
  // DRIFTSUDGIFTER
  // Summerer alle løbende udgifter til en månedlig total
  // Udgifter kan være månedlige eller årlige
  // ==========================================

  static beregnMaanedligDrift(udgifter) {
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

  // ==========================================
  // DRIFTSINDTÆGTER
  // Summerer alle løbende driftsindtægter til en månedlig total
  // Indtægter kan være månedlige eller årlige
  // ==========================================

  static beregnMaanedligIndtaegt(indtaegter) {
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
  // ==========================================

  // simuleringsAar = 1, 2, 3... (relativt til simuleringens start)
  // startAar = det kalenderår simuleringen starter
  static beregnRenoveringForAar(renoveringer, simuleringsAar, startAar) {
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
  // EJENDOMSVÆRDI OG EGENKAPITAL
  // vaekstAarlig er et decimaltal, f.eks. 0.02 for 2% årlig stigning
  // ==========================================

  static beregnEjendomsvaerdi(startpris, vaekstAarlig, aar) {
    return startpris * Math.pow(1 + vaekstAarlig, aar);
  }

  static beregnEgenkapital(ejendomsvaerdi, restgaeld) {
    return ejendomsvaerdi - restgaeld;
  }

  // ==========================================
  // CASHFLOW
  // Positivt cashflow = overskud, negativt = underskud
  // Alle månedlige beløb ganges med 12 for at få årsbeløb
  // ==========================================

  static beregnAarligCashflow(maanedligLeje, maanedligUdlejningUdgift, maanedligYdelse, maanedligDrift, maanedligDriftsIndtaegt, aarligRenovering) {
    const aarligLejeIndtaegt    = maanedligLeje * 12;
    const aarligDriftsIndtaegt  = maanedligDriftsIndtaegt * 12;
    const aarligUdlejningUdgift = maanedligUdlejningUdgift * 12;
    const aarligYdelse          = maanedligYdelse * 12;
    const aarligDrift           = maanedligDrift * 12;

    return aarligLejeIndtaegt + aarligDriftsIndtaegt - aarligUdlejningUdgift - aarligYdelse - aarligDrift - aarligRenovering;
  }
}

module.exports = CashflowCalculator;
