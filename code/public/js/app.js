// app.js - Frontend-logik for forsiden
// Søgning via DAWA + visning af gemte ejendomsprofiler

const soegefelt = document.getElementById('soegefelt');
const resultater = document.getElementById('resultater');
const profilListe = document.getElementById('profil_liste');

let timer = null;

// === SØGNING ===

soegefelt.addEventListener('input', haandterInput);

function haandterInput() {
  clearTimeout(timer);
  timer = setTimeout(soeg, 300);
}

async function soeg() {
  const tekst = soegefelt.value;

  if (tekst.length < 2) {
    resultater.innerHTML = '';
    return;
  }

  try {
    const svar = await fetch('/api/addresses/search?q=' + tekst);

    if (!svar.ok) {
      resultater.innerHTML = '<p>Kunne ikke hente forslag</p>';
      return;
    }

    const forslag = await svar.json();
    visForslag(forslag);

  } catch (fejl) {
    console.log('Fejl ved soegning:', fejl);
    resultater.innerHTML = '<p>Der opstod en fejl</p>';
  }
}

function visForslag(forslag) {
  if (forslag.length === 0) {
    resultater.innerHTML = '<p>Ingen adresser fundet</p>';
    return;
  }

  resultater.innerHTML = '';

  for (const f of forslag) {
    const div = document.createElement('div');
    div.className = 'resultat';
    div.textContent = f.tekst;

    div.addEventListener('click', function() {
      window.location.href = 'ejendomsinfo.html?dawaId=' + f.data.id;
    });

    resultater.appendChild(div);
  }
}

// === GEMTE EJENDOMSPROFILER ===

async function hentGemteProfiler() {
  try {
    const svar = await fetch('/api/properties');

    if (!svar.ok) {
      profilListe.innerHTML = '<p>Kunne ikke hente profiler</p>';
      return;
    }

    const profiler = await svar.json();

    if (profiler.length === 0) {
      profilListe.innerHTML = '<p>Ingen ejendomsprofiler gemt endnu</p>';
      return;
    }

    profilListe.innerHTML = '';

    for (const p of profiler) {
      const div = document.createElement('div');
      div.className = 'profil_kort';

      // Ejendomsinfo
      const info = document.createElement('div');
      info.innerHTML = '<h3>' + p.vejnavn + ' ' + p.husnummer + ', '
        + p.postnummer + ' ' + p.bynavn + '</h3>'
        + '<p>' + p.ejendomstype + ' · ' + p.byggeaar
        + ' · ' + p.boligareal + ' m² · ' + p.vaerelser + ' værelser</p>'
        + '<p>Investeringscases: ' + p.antal_cases + '</p>'
        + '<p class="profil_dato">Oprettet: '
        + new Date(p.oprettet_dato).toLocaleDateString('da-DK') + '</p>';

      // Knap til at oprette investeringscase
      const caseKnap = document.createElement('button');
      caseKnap.className = 'case_knap';
      caseKnap.textContent = 'Opret investeringscase';
      caseKnap.addEventListener('click', function() {
        visOpretCase(p.ejendomID, div);
      });

      // Knap til at se investeringscases for profilen
      const caserKnap = document.createElement('button');
      caserKnap.className = 'caser_knap';
      caserKnap.textContent = 'Se investeringscases';
      caserKnap.addEventListener('click', function() {
        visCases(p.ejendomID, div);
      });

      // Knap til at redigere ejendomsprofilen
      const redigerKnap = document.createElement('button');
      redigerKnap.className = 'rediger_knap';
      redigerKnap.textContent = 'Rediger';
      redigerKnap.addEventListener('click', function() {
        visRedigerFormular(p, div);
      });

      // Knap til at se ejendomsprofilen
      const seKnap = document.createElement('button');
      seKnap.className = 'se_knap';
      seKnap.textContent = 'Se ejendomsprofil';
      seKnap.addEventListener('click', function() {
        window.location.href = 'ejendomsinfo.html?dawaId=' + p.dawaID;
      });

      // Knap til at slette ejendomsprofilen
      const sletKnap = document.createElement('button');
      sletKnap.className = 'slet_knap';
      sletKnap.textContent = 'Slet';
      sletKnap.addEventListener('click', async function() {
        const bekraeft = confirm('Er du sikker på du vil slette denne ejendomsprofil?');
        if (!bekraeft) {
          return;
        }

        try {
          const svar = await fetch('/api/properties/' + p.ejendomID, {
            method: 'DELETE'
          });

          if (svar.ok) {
            hentGemteProfiler();
          } else {
            const fejlData = await svar.json();
            alert('Fejl: ' + fejlData.fejl);
          }
        } catch (fejl) {
          alert('Kunne ikke kontakte serveren');
        }
      });

      // Wrap knapper i en flex-række
      const knapperRad = document.createElement('div');
      knapperRad.className = 'knapper_rad';

      knapperRad.appendChild(caseKnap);
      knapperRad.appendChild(caserKnap);
      knapperRad.appendChild(redigerKnap);
      knapperRad.appendChild(seKnap);
      knapperRad.appendChild(sletKnap);

      div.appendChild(info);
      div.appendChild(knapperRad);
      profilListe.appendChild(div);
    }

  } catch (fejl) {
    console.log('Fejl ved hentning af profiler:', fejl);
    profilListe.innerHTML = '<p>Der opstod en fejl</p>';
  }
}

// === REDIGER EJENDOMSPROFIL ===

function visRedigerFormular(profil, profilDiv) {
  const eksisterende = document.getElementById('rediger_formular');
  if (eksisterende) {
    eksisterende.remove();
  }

  const formular = document.createElement('div');
  formular.id = 'rediger_formular';
  formular.className = 'case_formular';

  formular.innerHTML = '<h3>Rediger ejendomsprofil</h3>'
    + '<label>Vejnavn:</label>'
    + '<input type="text" id="red_vejnavn" value="' + profil.vejnavn + '">'
    + '<label>Husnummer:</label>'
    + '<input type="text" id="red_husnummer" value="' + profil.husnummer + '">'
    + '<label>Postnummer:</label>'
    + '<input type="text" id="red_postnummer" value="' + profil.postnummer + '">'
    + '<label>Bynavn:</label>'
    + '<input type="text" id="red_bynavn" value="' + profil.bynavn + '">'
    + '<label>Ejendomstype:</label>'
    + '<input type="text" id="red_ejendomstype" value="' + profil.ejendomstype + '">'
    + '<label>Byggeår:</label>'
    + '<input type="number" id="red_byggeaar" value="' + profil.byggeaar + '">'
    + '<label>Boligareal (m²):</label>'
    + '<input type="number" id="red_boligareal" value="' + profil.boligareal + '">'
    + '<label>Grundareal (m²):</label>'
    + '<input type="number" id="red_grundareal" value="' + profil.grundareal + '">'
    + '<label>Antal værelser:</label>'
    + '<input type="number" id="red_vaerelser" value="' + profil.vaerelser + '">'
    + '<div class="knapper">'
    + '<button id="gem_redigering_knap">Gem ændringer</button>'
    + '<button id="annuller_redigering_knap">Annullér</button>'
    + '</div>'
    + '<div id="rediger_besked"></div>';

  profilDiv.appendChild(formular);

  document.getElementById('gem_redigering_knap').addEventListener('click', function() {
    gemRedigering(profil.ejendomID);
  });

  document.getElementById('annuller_redigering_knap').addEventListener('click', function() {
    formular.remove();
  });
}

async function gemRedigering(ejendomID) {
  const data = {
    vejnavn: document.getElementById('red_vejnavn').value,
    husnummer: document.getElementById('red_husnummer').value,
    postnummer: document.getElementById('red_postnummer').value,
    bynavn: document.getElementById('red_bynavn').value,
    ejendomstype: document.getElementById('red_ejendomstype').value,
    byggeaar: parseInt(document.getElementById('red_byggeaar').value),
    boligareal: parseInt(document.getElementById('red_boligareal').value),
    grundareal: parseInt(document.getElementById('red_grundareal').value),
    vaerelser: parseInt(document.getElementById('red_vaerelser').value)
  };

  try {
    const svar = await fetch('/api/properties/' + ejendomID, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const resultat = await svar.json();
    const besked = document.getElementById('rediger_besked');

    if (svar.ok) {
      besked.textContent = 'Ændringer gemt';
      besked.className = 'succes';
      hentGemteProfiler();
    } else {
      besked.textContent = 'Fejl: ' + resultat.fejl;
      besked.className = 'fejl';
    }

  } catch (fejl) {
    document.getElementById('rediger_besked').textContent = 'Kunne ikke kontakte serveren';
    document.getElementById('rediger_besked').className = 'fejl';
  }
}

// === OPRET INVESTERINGSCASE ===

function visOpretCase(ejendomID, profilDiv) {
  const eksisterende = document.getElementById('case_formular');
  if (eksisterende) {
    eksisterende.remove();
  }

  const formular = document.createElement('div');
  formular.id = 'case_formular';
  formular.className = 'case_formular';

  formular.innerHTML = '<h3>Ny investeringscase</h3>'
    + '<label for="case_navn">Navn:</label>'
    + '<input type="text" id="case_navn" placeholder="Fx: Lejlighed med udlejning">'
    + '<label for="case_beskrivelse">Beskrivelse:</label>'
    + '<input type="text" id="case_beskrivelse" placeholder="Kort beskrivelse af casen">'
    + '<div class="knapper">'
    + '<button id="gem_case_knap">Start formular</button>'
    + '<button id="annuller_case_knap">Annullér</button>'
    + '</div>'
    + '<div id="case_besked"></div>';

  // Tilføj direkte under den rigtige profil
  profilDiv.appendChild(formular);

  document.getElementById('gem_case_knap').addEventListener('click', function() {
    const navn = document.getElementById('case_navn').value;
    const beskrivelse = document.getElementById('case_beskrivelse').value;
    const caseBesked = document.getElementById('case_besked');

    if (!navn) {
      caseBesked.textContent = 'Navn er påkrævet';
      caseBesked.className = 'fejl';
      return;
    }

    // Gem midlertidigt i sessionStorage - ingen database kald endnu
    sessionStorage.setItem('caseNavn', navn);
    sessionStorage.setItem('caseBeskrivelse', beskrivelse);
    sessionStorage.setItem('ejendomsID', ejendomID);

    window.location.href = '/investeringscase.html';
  });

  document.getElementById('annuller_case_knap').addEventListener('click', function() {
    formular.remove();
  });
}

// === SE INVESTERINGSCASES ===

// Henter og viser investeringscases for en ejendomsprofil
async function visCases(ejendomID, profilDiv) {
  // Fjern eksisterende case-liste hvis den er åben (toggle)
  const eksisterende = profilDiv.querySelector('.cases_liste');
  if (eksisterende) {
    eksisterende.remove();
    return;
  }

  try {
    const svar = await fetch('/api/cases?ejendomsID=' + ejendomID);
    const cases = await svar.json();

    const liste = document.createElement('div');
    liste.className = 'cases_liste';

    if (cases.length === 0) {
      liste.innerHTML = '<p>Ingen investeringscases endnu</p>';
      profilDiv.appendChild(liste);
      return;
    }

    for (const c of cases) {
      const caseDiv = document.createElement('div');
      caseDiv.className = 'case_kort';

      // Case-info
      const info = document.createElement('p');
      info.innerHTML = '<strong>' + c.navn + '</strong>'
        + (c.beskrivelse ? ' — ' + c.beskrivelse : '')
        + '<br><small>Oprettet: '
        + new Date(c.start_dato).toLocaleDateString('da-DK') + '</small>';

      // Knap til simulering
      const simuleringKnap = document.createElement('button');
      simuleringKnap.className = 'simulering_knap';
      simuleringKnap.textContent = 'Kør simulering';
      simuleringKnap.addEventListener('click', function() {
        window.location.href = '/simulering.html?caseID=' + c.caseID;
      });

      // Knap til at redigere investeringscasen
      const redigerCaseKnap = document.createElement('button');
      redigerCaseKnap.textContent = 'Rediger';
      redigerCaseKnap.addEventListener('click', function() {
        sessionStorage.setItem('redigerCaseID', c.caseID);
        window.location.href = '/rediger-case.html';
      });

      // Knap til at duplikere investeringscasen
      const duplikerKnap = document.createElement('button');
      duplikerKnap.textContent = 'Dupliker';
      duplikerKnap.addEventListener('click', async function() {
        try {
          const svar = await fetch('/api/cases/' + c.caseID + '/duplikoer', {
            method: 'POST'
          });

          const resultat = await svar.json();

          if (svar.ok) {
            // Genindlæs listen - kald to gange for at toggle
            visCases(ejendomID, profilDiv);
            visCases(ejendomID, profilDiv);
          } else {
            alert('Fejl: ' + resultat.fejl);
          }

        } catch (fejl) {
          alert('Kunne ikke kontakte serveren');
        }
      });

      // Knap til at slette investeringscasen
      const sletCaseKnap = document.createElement('button');
      sletCaseKnap.className = 'slet_knap';
      sletCaseKnap.textContent = 'Slet';
      sletCaseKnap.addEventListener('click', async function() {
        const bekraeft = confirm('Er du sikker på du vil slette "' + c.navn + '"?');
        if (!bekraeft) {
          return;
        }

        try {
          const svar = await fetch('/api/cases/' + c.caseID, {
            method: 'DELETE'
          });

          if (svar.ok) {
            visCases(ejendomID, profilDiv);
            visCases(ejendomID, profilDiv);
          } else {
            const fejlData = await svar.json();
            alert('Fejl: ' + fejlData.fejl);
          }
        } catch (fejl) {
          alert('Kunne ikke kontakte serveren');
        }
      });

      caseDiv.appendChild(info);
      caseDiv.appendChild(simuleringKnap);
      caseDiv.appendChild(redigerCaseKnap);
      caseDiv.appendChild(duplikerKnap);
      caseDiv.appendChild(sletCaseKnap);
      liste.appendChild(caseDiv);
    }

    profilDiv.appendChild(liste);

  } catch (fejl) {
    console.log('Fejl ved hentning af cases:', fejl);
  }
}

// Kør når siden loader
hentGemteProfiler();