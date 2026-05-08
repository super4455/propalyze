const DAWAService = require('../../services/DAWAapi');

// Unit: DAWAService — kritisk fordi det er systemets indgang; uden gyldig adresse kan ingen investeringscase oprettes

global.fetch = jest.fn();

beforeEach(() => fetch.mockClear());

describe('soegAdresser', () => {
  test('returnerer adresseforslag fra DAWA ved gyldig søgning', async () => {
    // Arrange
    const soegeord = 'jagtvej';
    const mockForslag = [
      { tekst: 'Jagtvej 155, 2200 København N', data: { id: '123' } }
    ];
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockForslag });

    // Act
    const resultat = await DAWAService.soegAdresser(soegeord);

    // Assert
    expect(resultat).toEqual(mockForslag);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.dataforsyningen.dk/autocomplete?q=jagtvej'
    );
  });

  test('kaster fejl når DAWA returnerer HTTP-fejl (ok: false)', async () => {
    const soegeord = 'jagtvej';
    fetch.mockResolvedValueOnce({ ok: false });

    await expect(DAWAService.soegAdresser(soegeord)).rejects.toThrow('DAWA er ikke tilgængelig');
  });

  test('returnerer tom liste når ingen adresser matcher søgeordet', async () => {
    const soegeord = 'xyzxyzxyz';
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

    const resultat = await DAWAService.soegAdresser(soegeord);

    expect(resultat).toEqual([]);
  });
});
