const CashflowBeregner = require('../../logic/cashflow');

// Unit: CashflowBeregner — kritisk fordi cashflow er det primære nøgletal brugeren evaluerer investeringen på

describe('beregnAarligCashflow', () => {
  test('beregner positivt cashflow korrekt (leje > udgifter)', () => {
    // Arrange
    const maanedligLeje = 10000;
    const maanedligUdlejningUdgift = 2000;
    const maanedligYdelse = 5000;
    const maanedligDrift = 1000;
    const maanedligDriftsIndtaegt = 0;
    const aarligRenovering = 0;

    // Act
    const cashflow = CashflowBeregner.beregnAarligCashflow(
      maanedligLeje, maanedligUdlejningUdgift, maanedligYdelse,
      maanedligDrift, maanedligDriftsIndtaegt, aarligRenovering
    );

    // Assert — (10.000 - 2.000 - 5.000 - 1.000) × 12 = 24.000
    expect(cashflow).toBeCloseTo(24000, 0);
  });

  test('beregner negativt cashflow korrekt (ydelse > lejeindtægt)', () => {
    const maanedligLeje = 5000;
    const maanedligUdlejningUdgift = 0;
    const maanedligYdelse = 10000;
    const maanedligDrift = 1000;
    const maanedligDriftsIndtaegt = 0;
    const aarligRenovering = 0;

    const cashflow = CashflowBeregner.beregnAarligCashflow(
      maanedligLeje, maanedligUdlejningUdgift, maanedligYdelse,
      maanedligDrift, maanedligDriftsIndtaegt, aarligRenovering
    );

    expect(cashflow).toBeCloseTo(-72000, 0);
  });

  test('returnerer 0 når alle input er nul', () => {
    const maanedligLeje = 0;
    const maanedligUdlejningUdgift = 0;
    const maanedligYdelse = 0;
    const maanedligDrift = 0;
    const maanedligDriftsIndtaegt = 0;
    const aarligRenovering = 0;

    const cashflow = CashflowBeregner.beregnAarligCashflow(
      maanedligLeje, maanedligUdlejningUdgift, maanedligYdelse,
      maanedligDrift, maanedligDriftsIndtaegt, aarligRenovering
    );

    expect(cashflow).toBe(0);
  });

  test('medregner renoveringsudgifter korrekt i cashflowet', () => {
    const maanedligLeje = 5000;
    const maanedligUdlejningUdgift = 0;
    const maanedligYdelse = 5000;
    const maanedligDrift = 0;
    const maanedligDriftsIndtaegt = 0;
    const aarligRenovering = 50000;

    const cashflow = CashflowBeregner.beregnAarligCashflow(
      maanedligLeje, maanedligUdlejningUdgift, maanedligYdelse,
      maanedligDrift, maanedligDriftsIndtaegt, aarligRenovering
    );

    expect(cashflow).toBeCloseTo(-50000, 0);
  });
});

describe('beregnMaanedligDriftsomkostning', () => {
  test('håndterer tom udgiftsliste uden fejl', () => {
    const udgifter = [];

    const total = CashflowBeregner.beregnMaanedligDriftsomkostning(udgifter);

    expect(total).toBe(0);
  });

  test('omregner korrekt fra årsbeløb til månedlig udgift', () => {
    const udgifter = [
      { beloeb: 1200, frekvens: 'aarlig' },   
      { beloeb: 500,  frekvens: 'maanedlig' } 
    ];

    const total = CashflowBeregner.beregnMaanedligDriftsomkostning(udgifter);

    expect(total).toBeCloseTo(600, 0);
  });
});
