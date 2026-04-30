class LaaneBeregner {

  // Beregning af ydelse på annuitetslån
  static beregnYdelseAnnuitet(laanebeloeb, renteAarlig, loebetidAar) {
    const r = renteAarlig / 100 / 12;
    const n = loebetidAar * 12;

    if (r === 0) return laanebeloeb / n;

    return laanebeloeb * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }
  // Beregning af restgæld på annuitetslån

  static beregnRestgaeldAnnuitet(laanebeloeb, renteAarlig, loebetidAar, betalteAar) {
    if (betalteAar >= loebetidAar) return 0;

    const r = renteAarlig / 100 / 12;
    const n = loebetidAar * 12;
    const t = betalteAar * 12;

    if (r === 0) return Math.max(0, laanebeloeb - (laanebeloeb / n) * t);

    return laanebeloeb * (Math.pow(1 + r, n) - Math.pow(1 + r, t)) / (Math.pow(1 + r, n) - 1);
  }

  // Beregning af ydelse på serielån

  static beregnYdelseSerie(laanebeloeb, renteAarlig, loebetidAar, betalteAar) {
    if (betalteAar >= loebetidAar) return 0;

    const r = renteAarlig / 100 / 12;
    const n = loebetidAar * 12;
    const fastAfdrag = laanebeloeb / n;
    const restgaeld = LaaneBeregner.beregnRestgaeldSerie(laanebeloeb, loebetidAar, betalteAar);

    return fastAfdrag + restgaeld * r;
  }

  static beregnRestgaeldSerie(laanebeloeb, loebetidAar, betalteAar) {
    if (betalteAar >= loebetidAar) return 0;

    const n = loebetidAar * 12;
    const t = betalteAar * 12;

    return laanebeloeb * (1 - t / n);
  }

  // Beregning af ydelse på stående lån

  static beregnYdelseStaaende(laanebeloeb, renteAarlig, loebetidAar, betalteAar) {
    if (betalteAar >= loebetidAar) return 0;

    const r = renteAarlig / 100 / 12;
    return laanebeloeb * r;
  }

  // Beregning af restgæld på stående lån

  static beregnRestgaeldStaaende(laanebeloeb, loebetidAar, betalteAar) {
    if (betalteAar >= loebetidAar) return 0;

    return laanebeloeb;
  }


  // Beregning af ydelse afhængig af lånetype

  static beregnYdelse(laanebeloeb, renteAarlig, loebetidAar, afdragsfriAar, laanetype, betalteAar) {

    // I afdragsfri periode betales kun renter uanset lånetype
    if (betalteAar < afdragsfriAar) {
      const r = renteAarlig / 100 / 12;
      return laanebeloeb * r;
    }

    if (betalteAar > loebetidAar) return 0;

    if (laanetype === 'Annuitetslaan') {
      return LaaneBeregner.beregnYdelseAnnuitet(laanebeloeb, renteAarlig, loebetidAar);
    }

    if (laanetype === 'Serielaan') {
      return LaaneBeregner.beregnYdelseSerie(laanebeloeb, renteAarlig, loebetidAar, betalteAar);
    }

    if (laanetype === 'Staaende laan') {
      return LaaneBeregner.beregnYdelseStaaende(laanebeloeb, renteAarlig, loebetidAar, betalteAar);
    }

    console.log('Ukendt lånetype:', laanetype, '- falder tilbage til annuitetslån');
    return LaaneBeregner.beregnYdelseAnnuitet(laanebeloeb, renteAarlig, loebetidAar);
  }

  // Beregning af total rente betalt over hele lånets løbetid
  static beregnTotalRente(laanebeloeb, renteAarlig, loebetidAar, afdragsfriAar, laanetype) {
    let totalBetalt = 0;

    for (let aar = 0; aar < loebetidAar; aar++) {
      const maanedligYdelse = LaaneBeregner.beregnYdelse(
        laanebeloeb, renteAarlig, loebetidAar, afdragsfriAar, laanetype, aar
      );
      totalBetalt += maanedligYdelse * 12;
    }

    // Stående lån betaler kun renter løbende - hovedstolen tilbagebetales som engangsbeløb ved udløb af låneperioden

    if (laanetype === 'Staaende laan') {
      return totalBetalt;
    }

    return totalBetalt - laanebeloeb;
  }

  // Beregning af restgæld afhængig af lånetype

  static beregnRestgaeld(laanebeloeb, renteAarlig, loebetidAar, laanetype, betalteAar) {

    if (laanetype === 'Annuitetslaan') {
      return LaaneBeregner.beregnRestgaeldAnnuitet(laanebeloeb, renteAarlig, loebetidAar, betalteAar);
    }

    if (laanetype === 'Serielaan') {
      return LaaneBeregner.beregnRestgaeldSerie(laanebeloeb, loebetidAar, betalteAar);
    }

    if (laanetype === 'Staaende laan') {
      return LaaneBeregner.beregnRestgaeldStaaende(laanebeloeb, loebetidAar, betalteAar);
    }

    return LaaneBeregner.beregnRestgaeldAnnuitet(laanebeloeb, renteAarlig, loebetidAar, betalteAar);
  }
}

module.exports = LaaneBeregner;
