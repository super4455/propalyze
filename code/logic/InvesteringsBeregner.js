const LaaneBeregner = require('./laan');
const CashflowBeregner = require('./cashflow');

class InvesteringsBeregner {

  constructor(finansiering, koeb, udgifter, indtaegter, renoveringer, udlejning) {
    // Data relateret til investeringscase
    this.finansiering = finansiering;
    this.koeb = koeb;
    this.udgifter = udgifter;
    this.indtaegter = indtaegter;
    this.renoveringer = renoveringer;
    this.udlejning = udlejning;

    // Beregnede resultater — udfyldes af metoderne nedenfor
    this.maanedligDrift = null;
    this.maanedligDriftsIndtaegt = null;
    this.simuleringsResultater = null;
  }

  // Beregner og gemmer månedlige driftsudgifter og driftsindtægter
  beregnDrift() {
    this.maanedligDrift = CashflowBeregner.beregnMaanedligDriftsomkostning(this.udgifter);
    this.maanedligDriftsIndtaegt = CashflowBeregner.beregnMaanedligIndtaegt(this.indtaegter);
    return this;
  }

  // Kører år-for-år simulering og gemmer resultater. vaerdistigning angives som decimaltal, f.eks. 0.02 for 2%
  simuler(periode, vaerdistigning) {
    const f = this.finansiering;
    const laanebeloeb = f.laanebeloeb;
    const rente = f.rente;
    const loebetid = f.loebetid_aar;
    const afdragsfriaar = f.afdragsfriaar || 0;
    const laanetype = f.laanetype;
    const ejendomspris = this.koeb.ejendomspris;

    const maanedligLeje = this.udlejning && this.udlejning.udlejning_status
      ? this.udlejning.maanedlig_husleje
      : 0;

    const maanedligUdlejningUdgift = this.udlejning && this.udlejning.udlejning_status
      ? this.udlejning.maanedlig_udgifter
      : 0;

    const startAar = new Date().getFullYear();
    this.simuleringsResultater = [];

    for (let aar = 1; aar <= periode; aar++) {
      const maanedligYdelse = LaaneBeregner.beregnYdelse(laanebeloeb, rente, loebetid, afdragsfriaar, laanetype, aar - 1);
      const ejendomsvaerdi = CashflowBeregner.beregnEjendomsvaerdi(ejendomspris, vaerdistigning, aar);
      const restgaeld = LaaneBeregner.beregnRestgaeld(laanebeloeb, rente, loebetid, laanetype, aar);
      const egenkapital = CashflowBeregner.beregnEgenkapital(ejendomsvaerdi, restgaeld);
      const aarligRenovering = CashflowBeregner.beregnRenoveringForAar(this.renoveringer, aar, startAar);
      const aarligCashflow = CashflowBeregner.beregnAarligCashflow(
        maanedligLeje, maanedligUdlejningUdgift, maanedligYdelse,
        this.maanedligDrift, this.maanedligDriftsIndtaegt, aarligRenovering
      );

      this.simuleringsResultater.push({ aar, ejendomsvaerdi, restgaeld, egenkapital, aarligCashflow });
    }

    return this;
  }

  // Returnerer simuleringsresultaterne
  hentResultater() {
    return this.simuleringsResultater;
  }
}

module.exports = InvesteringsBeregner;
