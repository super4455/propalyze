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
    const anskaffelsesomkostninger = (this.koeb.koeb_omkostninger || 0) + (this.koeb.advokat_udgifter || 0) + (this.koeb.tinglysning || 0);
    // Anskaffelsesomkostninger beregnes som summen af købsomkostninger, advokatudgifter og tinglysningsafgifter
    // Hent husleje og udlejningsudgifter hvis ejendommen er udlejet, ellers 0
    let maanedligLeje = 0;
    let maanedligUdlejningUdgift = 0;

    // hvis ejendommen er udlejet, hent husleje og udlejningsudgifter.
    if (this.udlejning && this.udlejning.udlejning_status) {
      maanedligLeje = this.udlejning.maanedlig_husleje;
      maanedligUdlejningUdgift = this.udlejning.maanedlig_udgifter;
    }

    const startAar = new Date().getFullYear();
    this.simuleringsResultater = [];
    // Simuleringsloop for hvert år i perioden. Her samles metoder fra LaaneBeregner og CashflowBeregner
    for (let aar = 1; aar <= periode; aar++) {
      const maanedligYdelse = LaaneBeregner.beregnYdelse(laanebeloeb, rente, loebetid, afdragsfriaar, laanetype, aar - 1);
      const ejendomsvaerdi = CashflowBeregner.beregnEjendomsvaerdi(ejendomspris, vaerdistigning, aar);
      const restgaeld = LaaneBeregner.beregnRestgaeld(laanebeloeb, rente, loebetid, laanetype, aar);
      const egenkapital = CashflowBeregner.beregnEgenkapital(ejendomsvaerdi, restgaeld);
      const aarligRenovering = CashflowBeregner.beregnRenoveringForAar(this.renoveringer, aar, startAar);
      const engangsomkostning = aar === 1 ? anskaffelsesomkostninger : 0;
      const aarligCashflow = CashflowBeregner.beregnAarligCashflow(
        maanedligLeje, maanedligUdlejningUdgift, maanedligYdelse,
        this.maanedligDrift, this.maanedligDriftsIndtaegt, aarligRenovering + engangsomkostning
      );
      // skub resultatet ind i simuleringsResultater
      this.simuleringsResultater.push({ aar, ejendomsvaerdi, restgaeld, egenkapital, aarligCashflow });
    }
  }

  // Returnerer simuleringsresultaterne
  hentResultater() {
    return this.simuleringsResultater;
  }
}

module.exports = InvesteringsBeregner;