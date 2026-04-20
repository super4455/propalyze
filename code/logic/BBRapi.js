// logic/bbr.js
// Henter ejendomsdata fra BBR via Datafordeleren

// Indlæser environment variabler (username + password til BBR)
require('dotenv').config();

// Henter BBR-data for en given adresse
// Parametre:
//   adresseId = ID fra DAWA (enten husnummer-ID eller adresse-ID)
//   type      = "hus" eller "enhed" (afhænger af boligtypen)
async function hentBBR(adresseId, type) {

    // Vælger hvilket BBR-endpoint der skal bruges
    // "hus"   -> bygning (fritliggende huse)
    // "enhed" -> enhed (lejligheder m.m.)
    let endpoint;
    let idParameter;

    if (type === 'hus') {
        endpoint = 'bygning';
        idParameter = 'husnummer';
    } else {
        endpoint = 'enhed';
        idParameter = 'AdresseIdentificerer';
    }

    // Henter username og password fra .env filen
    const brugernavn = process.env.BBR_USERNAME;
    const kodeord = process.env.BBR_PASSWORD;

    // Bygger URL'en til BBR API'et
    // Bemærk: Datafordeleren bruger username/password i URL (selvbetjening)
    const url = 'https://services.datafordeler.dk/BBR/BBRPublic/1/rest/' 
              + endpoint 
              + '?' + idParameter + '=' + adresseId 
              + '&username=' + brugernavn 
              + '&password=' + kodeord;

    // Sender GET-request til BBR
    const svar = await fetch(url);

    // Læser svaret som tekst først (så vi kan fange fejl pænt)
    const tekst = await svar.text();

    // Forsøger at parse teksten som JSON
    // Hvis BBR sender en fejlside (HTML), fanger vi det her
    try {
        const data = JSON.parse(tekst);
        return data;
    } catch (fejl) {
        // Logger hvad BBR faktisk svarede, så vi kan fejlfinde
        console.error('BBR svarede ikke med JSON:', tekst);
        throw new Error('BBR fejl: ' + tekst);
    }
}

// Eksporterer funktionen så routen kan bruge den
module.exports = { hentBBR };