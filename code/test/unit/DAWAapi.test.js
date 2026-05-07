const DAWAService = require('../../services/DAWAapi');

global.fetch = jest.fn();

beforeEach(() => fetch.mockClear());

test('returnerer adresseforslag fra DAWA', async () => {
  const mockForslag = [
    { tekst: 'Jagtvej 155, 2200 København N', data: { id: 'abc123' } }
  ];

  fetch.mockResolvedValueOnce({ ok: true, json: async () => mockForslag });

  const resultat = await DAWAService.soegAdresser('jagtvej');
  expect(resultat).toEqual(mockForslag);
  expect(fetch).toHaveBeenCalledWith(
    'https://api.dataforsyningen.dk/autocomplete?q=jagtvej'
  );
});
