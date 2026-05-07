const DAWAService = require('../../services/DAWAapi');

// Unit: DAWAService — kritisk fordi det er systemets indgang; uden gyldig adresse kan ingen investeringscase oprettes

global.fetch = jest.fn();

beforeEach(() => fetch.mockClear());

describe('soegAdresser', () => {
  test('returnerer adresseforslag fra DAWA ved gyldig søgning', async () => {
    // Arrange
    const soegord = 'jagtvej';
    const mockForslag = [
      { tekst: 'Jagtvej 155, 2200 København N', data: { id: 'abc123' } }
    ];
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockForslag });

    // Act
    const resultat = await DAWAService.soegAdresser(soegord);

    // Assert
    expect(resultat).toEqual(mockForslag);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.dataforsyningen.dk/autocomplete?q=jagtvej'
    );
  });

  test('kaster fejl når DAWA returnerer HTTP-fejl (ok: false)', async () => {

    const soegord = 'jagtvej';
    fetch.mockResolvedValueOnce({ ok: false });

    // Act & Assert — kald og forventet fejl testes samlet fordi fejlen smides under selve kaldet
    await expect(DAWAService.soegAdresser(soegord)).rejects.toThrow('DAWA er ikke tilgængelig');
  });

  test('returnerer tom liste når ingen adresser matcher søgeordet', async () => {
    const soegord = 'xyzxyzxyz';
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

    const resultat = await DAWAService.soegAdresser(soegord);

    expect(resultat).toEqual([]);
  });
});
