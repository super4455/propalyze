const CashflowBeregner = require('../../code/logic/cashflow');

test('beregner positivt årligt cashflow korrekt', () => {
  // 10.000 leje - 2.000 udlejning - 5.000 ydelse - 1.000 drift = 2.000/md. × 12 = 24.000
  const cashflow = CashflowBeregner.beregnAarligCashflow(10000, 2000, 5000, 1000, 0, 0);
  expect(cashflow).toBeCloseTo(24000, 0);
});
