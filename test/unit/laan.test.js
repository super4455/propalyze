const LaaneBeregner = require('../../code/logic/laan');

test('beregner korrekt månedlig ydelse på annuitetslån', () => {
  // 2.000.000 kr., 4% rente, 30 år → ~9.548 kr./md.
  const ydelse = LaaneBeregner.beregnYdelseAnnuitet(2000000, 4, 30);
  expect(ydelse).toBeCloseTo(9548, 0);
});
