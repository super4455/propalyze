const CashflowBeregner = require('../../logic/cashflow');

// Unit: CashflowBeregner — kritisk fordi cashflow er det primære nøgletal brugeren evaluerer investeringen på

describe('beregnAarligCashflow', () => {
  test('beregner positivt cashflow korrekt (leje > udgifter)', () => {
    // Arrange: 10.000 leje - 2.000 udlejning - 5.000 ydelse - 1.000 drift = 2.000/md. × 12 = 24.000
    const cashflow = CashflowBeregner.beregnAarligCashflow(10000, 2000, 5000, 1000, 0, 0);
    expect(cashflow).toBeCloseTo(24000, 0);
  });

  test('beregner negativt cashflow korrekt (ydelse > lejeindtægt)', () => {
    // Edge case: udgifterne overstiger lejeindtægten → negativ investering
    // 5.000 leje - 0 udlejning - 10.000 ydelse - 1.000 drift = -6.000/md. × 12 = -72.000
    const cashflow = CashflowBeregner.beregnAarligCashflow(5000, 0, 10000, 1000, 0, 0);
    expect(cashflow).toBeCloseTo(-72000, 0);
  });

  test('returnerer 0 når alle input er nul', () => {
    // Edge case: ingen leje, ingen udgifter
    const cashflow = CashflowBeregner.beregnAarligCashflow(0, 0, 0, 0, 0, 0);
    expect(cashflow).toBe(0);
  });

  test('medregner renoveringsudgifter korrekt i cashflowet', () => {
    // Edge case: engangsrenovering trækker fra cashflow i det pågældende år
    // 5.000 leje - 5.000 ydelse = 0 cashflow, men 50.000 renovering → -50.000
    const cashflow = CashflowBeregner.beregnAarligCashflow(5000, 0, 5000, 0, 0, 50000);
    expect(cashflow).toBeCloseTo(-50000, 0);
  });
});

describe('beregnMaanedligDriftsomkostning', () => {
  test('håndterer tom udgiftsliste uden fejl', () => {
    // Edge case: ingen driftsudgifter angivet
    const total = CashflowBeregner.beregnMaanedligDriftsomkostning([]);
    expect(total).toBe(0);
  });

  test('omregner korrekt fra årsbeløb til månedlig udgift', () => {
    // Edge case: blanding af månedlige og årlige frekvenser
    const udgifter = [
      { beloeb: 1200, frekvens: 'aarlig' },   // → 100/md.
      { beloeb: 500,  frekvens: 'maanedlig' } // → 500/md.
    ];
    const total = CashflowBeregner.beregnMaanedligDriftsomkostning(udgifter);
    expect(total).toBeCloseTo(600, 0); // 100 + 500 = 600
  });
});
