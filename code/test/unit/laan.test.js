const LaaneBeregner = require('../../logic/laan');

// Unit: LaaneBeregner — kritisk fordi alle simuleringsresultater for ydelse og restgæld bygger herpå
// Alle test følger Arrange - Act - Assert princippet
describe('beregnYdelseAnnuitet', () => {
  test('beregner korrekt månedlig ydelse ved normal rente', () => {
    const laanebeloeb = 2000000;
    const rente = 4;
    const loebetidAar = 30;

    const ydelse = LaaneBeregner.beregnYdelseAnnuitet(laanebeloeb, rente, loebetidAar);

    expect(ydelse).toBeCloseTo(9548, 0);
  });

  test('beregner korrekt ydelse ved 0% rente (deler ikke med nul)', () => {
    const laanebeloeb = 1200000;
    const rente = 0;
    const loebetidAar = 10;

    const ydelse = LaaneBeregner.beregnYdelseAnnuitet(laanebeloeb, rente, loebetidAar);

    expect(ydelse).toBeCloseTo(10000, 0);
  });

  test('beregner korrekt ydelse ved kort løbetid (5 år)', () => {
    const laanebeloeb = 120000;
    const rente = 4;
    const loebetidAar = 5;

    const ydelse = LaaneBeregner.beregnYdelseAnnuitet(laanebeloeb, rente, loebetidAar);

    expect(ydelse).toBeCloseTo(2210, 0);
  });
});

describe('beregnRestgaeldAnnuitet', () => {
  test('restgæld er lavere end lånebeløb efter halvdelen af løbetiden', () => {
    const laanebeloeb = 2000000;
    const rente = 4;
    const loebetidAar = 30;
    const betalteAar = 15;

    const restgaeld = LaaneBeregner.beregnRestgaeldAnnuitet(laanebeloeb, rente, loebetidAar, betalteAar);

    expect(restgaeld).toBeGreaterThan(1200000);
    expect(restgaeld).toBeLessThan(1500000);
  });

  test('restgæld er 0 når lånet er fuldt tilbagebetalt', () => {
    const laanebeloeb = 2000000;
    const rente = 4;
    const loebetidAar = 30;
    const betalteAar = 30;

    const restgaeld = LaaneBeregner.beregnRestgaeldAnnuitet(laanebeloeb, rente, loebetidAar, betalteAar);

    expect(restgaeld).toBe(0);
  });

  test('restgæld er 0 hvis betalteAar overstiger loebetidAar', () => {
    const laanebeloeb = 2000000;
    const rente = 4;
    const loebetidAar = 30;
    const betalteAar = 35;

    const restgaeld = LaaneBeregner.beregnRestgaeldAnnuitet(laanebeloeb, rente, loebetidAar, betalteAar);

    expect(restgaeld).toBe(0);
  });
});

describe('beregnYdelse (afdragsfri periode)', () => {
  test('betaler kun rente i afdragsfri periode uanset lånetype', () => {
    const laanebeloeb = 2000000;
    const rente = 4;
    const loebetidAar = 30;
    const afdragsfriAar = 5;
    const betalteAar = 2;
    const maanedligRente = rente / 100 / 12;
    const forventetRenteYdelse = laanebeloeb * maanedligRente;

    const ydelse = LaaneBeregner.beregnYdelse(laanebeloeb, rente, loebetidAar, afdragsfriAar, 'Annuitetslaan', betalteAar);

    expect(ydelse).toBeCloseTo(forventetRenteYdelse, 0);
  });

  test('returnerer 0 efter lånet er udløbet', () => {
    const laanebeloeb = 2000000;
    const rente = 4;
    const loebetidAar = 30;
    const afdragsfriAar = 0;
    const betalteAar = 31;

    const ydelse = LaaneBeregner.beregnYdelse(laanebeloeb, rente, loebetidAar, afdragsfriAar, 'Annuitetslaan', betalteAar);

    expect(ydelse).toBe(0);
  });
});
