// app.js - Frontend-logik for soegesiden
// Lytter efter brugerens input og henter forslag fra vores backend

// Find HTML-elementerne saa vi kan arbejde med dem
const soegefelt = document.getElementById('soegefelt');
const resultater = document.getElementById('resultater');

// Variabel til at huske den aktuelle timer
// Vi skal kunne aflyse den hvis brugeren skriver igen
let timer = null;

// Lyt efter input - kaldes hver gang brugeren skriver et tegn
soegefelt.addEventListener('input', haandterInput);

// Kaldes ved hvert tastetryk - starter (eller genstarter) en timer
function haandterInput() {
  // Hvis der allerede er en timer i gang, aflys den
  // clearTimeout med null gør ingenting, saa det er sikkert foerste gang
  clearTimeout(timer);

  // Start en ny timer: vent 300ms, og kald saa soeg()
  // Hvis brugeren skriver igen inden 300ms, bliver denne timer aflyst
  timer = setTimeout(soeg, 300);
}

// Funktionen der bliver kaldt naar timeren udloeber
async function soeg() {
  // Hent den aktuelle tekst i feltet
  const tekst = soegefelt.value;

  // Hvis feltet er tomt eller for kort, ryd resultater og afbryd
  if (tekst.length < 2) {
    resultater.innerHTML = '';
    return;
  }

  try {
    // Kald vores eget backend-endpoint
    const url = `/api/addresses/search?q=${tekst}`;
    const svar = await fetch(url);

    // Tjek om kaldet gik godt
    if (!svar.ok) {
      resultater.innerHTML = '<p>Kunne ikke hente forslag</p>';
      return;
    }

    // Konverter svaret til JSON (et array af forslag)
    const forslag = await svar.json();

    // Vis forslagene i resultat-containeren
    visForslag(forslag);

  } catch (fejl) {
    // Fanges hvis fx serveren er nede
    console.log('Fejl ved soegning:', fejl);
    resultater.innerHTML = '<p>Der opstod en fejl</p>';
  }
}

// Tager listen af DAWA-forslag og bygger HTML ud af dem
function visForslag(forslag) {
  // Hvis ingen forslag, vis besked
  if (forslag.length === 0) {
    resultater.innerHTML = '<p>Ingen adresser fundet</p>';
    return;
  }

  // Ryd containeren foer vi fylder ny HTML i
  resultater.innerHTML = '';

  // Loop gennem hvert forslag og opret et div-element
  for (const f of forslag) {
    const div = document.createElement('div');
    div.className = 'resultat';
    div.textContent = f.tekst;

    // Naar brugeren klikker paa et forslag, gaa til ejendomsinfo-siden
    div.addEventListener('click', function() {
      window.location.href = 'ejendomsinfo.html?dawaId=' + f.data.id;
    });

    resultater.appendChild(div);
  }
}