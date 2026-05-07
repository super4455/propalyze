const LaaneBeregner = require('../../logic/laan');

// Unit: LaaneBeregner — kritisk fordi alle simuleringsresultater for ydelse og restgæld bygger herpå

describe('beregnYdelseAnnuitet', () => {
  test('beregner korrekt månedlig ydelse ved normal rente', () => {
    // Arrange: 2.000.000 kr., 4% rente, 30 år → ~9.548 kr./md.
    const ydelse = LaaneBeregner.beregnYdelseAnnuitet(2000000, 4, 30);
    expect(ydelse).toBeCloseTo(9548, 0);
  });

  test('beregner korrekt ydelse ved 0% rente (deler ikke med nul)', () => {
    // Edge case: rente = 0 → ydelse = lånebeløb / antal måneder
    const ydelse = LaaneBeregner.beregnYdelseAnnuitet(1200000, 0, 10);
    expect(ydelse).toBeCloseTo(10000, 0); // 1.200.000 / 120 måneder
  });

  test('beregner korrekt ydelse ved kort løbetid (5 år)', () => {
    // Edge case: kort løbetid — 120.000 kr., 4% rente, 5 år → ~2.210 kr./md.
    const ydelse = LaaneBeregner.beregnYdelseAnnuitet(120000, 4, 5);
    expect(ydelse).toBeCloseTo(2210, 0);
  });
});

describe('beregnRestgaeldAnnuitet', () => {
  test('restgæld er lavere end lånebeløb efter halvdelen af løbetiden', () => {
    // Arrange: 2.000.000, 4%, 30 år – efter 15 år
    const restgaeld = LaaneBeregner.beregnRestgaeldAnnuitet(2000000, 4, 30, 15);
    expect(restgaeld).toBeGreaterThan(1200000);
    expect(restgaeld).toBeLessThan(1500000);
  });

  test('restgæld er 0 når lånet er fuldt tilbagebetalt', () => {
    // Edge case: betalteAar = loebetidAar
    const restgaeld = LaaneBeregner.beregnRestgaeldAnnuitet(2000000, 4, 30, 30);
    expect(restgaeld).toBe(0);
  });

  test('restgæld er 0 hvis betalteAar overstiger loebetidAar', () => {
    // Edge case: betalteAar > loebetidAar
    const restgaeld = LaaneBeregner.beregnRestgaeldAnnuitet(2000000, 4, 30, 35);
    expect(restgaeld).toBe(0);
  });
});

describe('beregnYdelse (afdragsfri periode)', () => {
  test('betaler kun rente i afdragsfri periode uanset lånetype', () => {
    // Edge case: betalteAar = 2, afdragsfriAar = 5 → kun renteydelse
    const r = 4 / 100 / 12;
    const forventet = 2000000 * r;
    const ydelse = LaaneBeregner.beregnYdelse(2000000, 4, 30, 5, 'Annuitetslaan', 2);
    expect(ydelse).toBeCloseTo(forventet, 0);
  });

  test('returnerer 0 efter lånet er udløbet', () => {
    // Edge case: betalteAar > loebetidAar
    const ydelse = LaaneBeregner.beregnYdelse(2000000, 4, 30, 0, 'Annuitetslaan', 31);
    expect(ydelse).toBe(0);
  });
});
