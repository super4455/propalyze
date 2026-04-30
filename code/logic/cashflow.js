class CashflowBeregner {


  // Beregning af driftsudgifter - finder beløb i hver udgift, og summerer dem til en månedlig total.

  static beregnMaanedligDriftsomkostning(udgifter) {
    let total = 0;

    for (const u of udgifter) {
      if (u.frekvens === 'maanedlig') {
        total += u.beloeb;
      } else {
        total += u.beloeb / 12;
      }
    }

    return total;
  }

  // Beregning af driftsindtægter - finder beløb i hver indtægt, og summerer dem til en månedlig total.

  static beregnMaanedligIndtaegt(indtaegter) {
    let total = 0;

    for (const i of indtaegter) {
      if (i.frekvens === 'maanedlig') {
        total += i.beloeb;
      } else {
        total += i.beloeb / 12;
      }
    }

    return total;
  }




  // Beregning af renoveringsudgifter - finder beløb i hver renovering, og summerer dem til en total for det planlagte år
  // simuleringsAar = 1, 2, 3 (relativt til simuleringens start)
  // startAar = det kalenderår simuleringen starter
  // Beregning af kalenderår sikrer, at renoveringsudgifter først træder i kraft på det planlagte år
  static beregnRenoveringForAar(renoveringer, simuleringsAar, startAar) {
    const kalenderAar = startAar + simuleringsAar - 1;
    let total = 0;

    for (const r of renoveringer) {
      if (r.planlagt_aar === kalenderAar) {
        total += r.renovering_omkostninger;
      }
    }

    return total;
  }

  // Beregning af ejendomsværdi

  static beregnEjendomsvaerdi(startpris, vaekstAarlig, aar) {
    return startpris * Math.pow(1 + vaekstAarlig, aar); // Math.pow beregner potensen. (1 + vaekstAarlig)^aar
  }

  // Beregning af egenkapital. Fjerner restgæld fra ejendomsværdi

  static beregnEgenkapital(ejendomsvaerdi, restgaeld) {
    return ejendomsvaerdi - restgaeld;
  }

  // Beregning af cashflow - forskellen mellem indtægter og udgifter

  static beregnAarligCashflow(maanedligLeje, maanedligUdlejningUdgift, maanedligYdelse, maanedligDrift, maanedligDriftsIndtaegt, aarligRenovering) {
    const aarligLejeIndtaegt = maanedligLeje * 12;
    const aarligDriftsIndtaegt = maanedligDriftsIndtaegt * 12;
    const aarligUdlejningUdgift = maanedligUdlejningUdgift * 12;
    const aarligYdelse = maanedligYdelse * 12;
    const aarligDrift = maanedligDrift * 12;

    return aarligLejeIndtaegt + aarligDriftsIndtaegt - aarligUdlejningUdgift - aarligYdelse - aarligDrift - aarligRenovering;
  }
}

module.exports = CashflowBeregner;
