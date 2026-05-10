class AdresseSoegning {

  constructor() {
    this.timer = null;
    this.soegefelt = document.getElementById('soegefelt');
    this.resultater = document.getElementById('resultater');

    this.soegefelt.addEventListener('input', () => this.haandterInput());
  }
  // Håndterer input i søgefeltet, ved at debounce søgningen
  haandterInput() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.soeg(), 300);
  }
  // Asynkron søgning, der henter data fra serveren ved at bruge fetch API'et. Hvis værdien i søgefæltet er mindre end 2 tegn, vises ingen resultater
  async soeg() {
    const tekst = this.soegefelt.value;

    if (tekst.length < 2) {
      this.resultater.innerHTML = '';
      return;
    }

    try {
      const svar = await fetch(`/api/adresser/search?q=${tekst}`);

      if (!svar.ok) {
        this.resultater.innerHTML = '<p>Kunne ikke hente forslag</p>';
        return;
      }

      const forslag = await svar.json();
      this.visForslag(forslag);

    } catch (fejl) {
      console.log('Fejl ved soegning:', fejl);
      this.resultater.innerHTML = '<p>Der opstod en fejl</p>';
    }
  }
  // metode der viser søgeresultater ved at opdatere DOM'en ved brug af innerHTML, createElement og appendChild
  visForslag(forslag) {
    if (forslag.length === 0) {
      this.resultater.innerHTML = '<p>Ingen adresser fundet</p>';
      return;
    }

    this.resultater.innerHTML = '';

    for (const f of forslag) {
      const div = document.createElement('div');
      div.className = 'resultat';
      div.textContent = f.tekst.replace(', ,', ',');

      div.addEventListener('click', function () {
        window.location.href = `ejendomsinfo.html?dawaId=${f.data.id}`;
      });

      this.resultater.appendChild(div);
    }
  }
}

// Klasse til at håndtere listen af ejendomsprofiler
class EjendomsprofilListe {

  constructor() {
    this.profilListe = document.getElementById('profil_liste');
    this.hentGemteProfiler();

    document.getElementById('profil_modal_luk').addEventListener('click', () => {
      document.getElementById('profil_modal').style.display = 'none';
    });
    document.getElementById('profil_modal').addEventListener('click', (e) => {
      if (e.target === document.getElementById('profil_modal')) {
        document.getElementById('profil_modal').style.display = 'none';
      }
    });
  }

  // Henter gemte ejendomsprofiler fra serveren ved hjælp af fetch API'et. Denne metode kaldes i konstruktøren for at indlæse profilerne ved opstart.
  async hentGemteProfiler() {
    try {
      const svar = await fetch('/api/ejendomme');

      if (!svar.ok) {
        this.profilListe.innerHTML = '<p>Kunne ikke hente profiler</p>';
        return;
      }

      const profiler = await svar.json();

      if (profiler.length === 0) {
        this.profilListe.innerHTML = '<p>Ingen ejendomsprofiler gemt endnu</p>';
        return;
      }

      this.profilListe.innerHTML = '';

      for (const p of profiler) {
        const div = document.createElement('div');
        div.className = 'profil_kort';

        const info = document.createElement('div');
        info.innerHTML = `<h3>${this.formaterAdresse(p)}</h3>
          <p>${p.ejendomstype} · ${p.byggeaar} · ${p.boligareal} m² · ${p.vaerelser} værelser</p>
          <p>Investeringscases: ${p.antal_cases}</p>
          <p class="profil_dato">Oprettet: ${new Date(p.oprettet_dato).toLocaleDateString('da-DK')}</p>
          <p class="profil_dato">Data hentet: ${new Date(p.sidste_data_hentning).toLocaleDateString('da-DK')}</p>`;

        const caseKnap = document.createElement('button');
        caseKnap.className = 'case_knap';
        caseKnap.textContent = 'Opret investeringscase';
        caseKnap.addEventListener('click', () => this.visOpretCase(p.ejendomID, div));

        const caserKnap = document.createElement('button');
        caserKnap.className = 'caser_knap';
        caserKnap.textContent = 'Se investeringscases';
        caserKnap.addEventListener('click', () => this.visCases(p.ejendomID, div));

        const redigerKnap = document.createElement('button');
        redigerKnap.className = 'rediger_knap';
        redigerKnap.textContent = 'Rediger';
        redigerKnap.addEventListener('click', () => this.visRedigerFormular(p, div));

        const seKnap = document.createElement('button');
        seKnap.className = 'se_knap';
        seKnap.textContent = 'Se ejendomsprofil';
        seKnap.addEventListener('click', () => this.visProfilPopup(p));

        const sletKnap = document.createElement('button');
        sletKnap.className = 'slet_knap';
        sletKnap.textContent = 'Slet';
        sletKnap.addEventListener('click', async () => {
          const bekraeft = confirm('Er du sikker på du vil slette denne ejendomsprofil?\n\nAlle tilknyttede investeringscases og deres data vil også blive slettet.');
          if (!bekraeft) return;

          try {
            const svar = await fetch(`/api/ejendomme/${p.ejendomID}`, { method: 'DELETE' });

            if (svar.ok) {
              this.hentGemteProfiler();
            } else {
              const fejlData = await svar.json();
              alert(`Fejl: ${fejlData.fejl}`);
            }
          } catch (fejl) {
            alert('Kunne ikke kontakte serveren');
          }
        });

        const knapperRad = document.createElement('div');
        knapperRad.className = 'knapper_rad';

        knapperRad.appendChild(caseKnap);
        knapperRad.appendChild(caserKnap);
        knapperRad.appendChild(redigerKnap);
        knapperRad.appendChild(seKnap);
        knapperRad.appendChild(sletKnap);

        div.appendChild(info);
        div.appendChild(knapperRad);
        this.profilListe.appendChild(div);
      }

    } catch (fejl) {
      console.log('Fejl ved hentning af profiler:', fejl);
      this.profilListe.innerHTML = '<p>Der opstod en fejl</p>';
    }
  }
  // Sammensætter dele af adressen med postnummer og bynavn, så den kan vises korrekt i UI'en
  formaterAdresse(p) {
    let adresse = `${p.vejnavn} ${p.husnummer}`;
    if (p.etage !== null || p.doer !== null) {
      const dele = [];
      if (p.etage !== null) dele.push(`${p.etage}.`);
      if (p.doer !== null) dele.push(p.doer);
      adresse += `, ${dele.join(' ')}`;
    }
    return `${adresse}, ${p.postnummer} ${p.bynavn}`;
  }
  // Viser ejendomsprofil i en modal, når brugeren klikker på "Se ejendomsprofil". 
  visProfilPopup(p) {
    document.getElementById('modal_adresse').textContent = this.formaterAdresse(p);
    document.getElementById('modal_ejendomstype').textContent = p.ejendomstype || '—';
    document.getElementById('modal_byggeaar').textContent = p.byggeaar || '—';
    let boligarealTekst = '—';
    if (p.boligareal) {
      boligarealTekst = `${p.boligareal} m²`;
    }
    document.getElementById('modal_boligareal').textContent = boligarealTekst;

    let grundarealTekst = '—';
    if (p.grundareal) {
      grundarealTekst = `${p.grundareal} m²`;
    }
    document.getElementById('modal_grundareal').textContent = grundarealTekst;
    document.getElementById('modal_vaerelser').textContent = p.vaerelser || '—';

    const luftfoto = document.getElementById('modal_luftfoto');
    const matrikel = document.getElementById('modal_matrikel');
    const kortLoading = document.getElementById('modal_kort_loading');

    luftfoto.style.display = 'none';
    matrikel.style.display = 'none';
    kortLoading.textContent = 'Henter luftfoto og matrikelkort...';
    kortLoading.style.display = 'block';

    const opdaterKnap = document.getElementById('modal_opdater_knap');
    opdaterKnap.textContent = 'Opdatér BBR-data';
    opdaterKnap.disabled = false;
    opdaterKnap.onclick = async () => {
      opdaterKnap.disabled = true;
      opdaterKnap.textContent = 'Henter...';

      try {
        const svar = await fetch(`/api/ejendomme/${p.ejendomID}/opdater-data`, { method: 'POST' });

        if (svar.ok) {
          opdaterKnap.textContent = 'Data opdateret';
          this.hentGemteProfiler();
        } else {
          const fejlData = await svar.json();
          alert(`Fejl: ${fejlData.fejl}`);
          opdaterKnap.disabled = false;
          opdaterKnap.textContent = 'Opdatér BBR-data';
        }
      } catch (fejl) {
        alert('Kunne ikke kontakte serveren');
        opdaterKnap.disabled = false;
        opdaterKnap.textContent = 'Opdatér BBR-data';
      }
    };

    document.getElementById('profil_modal').style.display = 'flex';

    this.indlaesModalKort(p.ejendomID);
  }
  // Asynkron metode der indlæser kortdata for en given ejendom i modalvinduet. Kaldes i visProfilPopup. Er udelukkende ansvarlig for at hente og bruger visModalKort til at vise kortet i modalvinduet.
  async indlaesModalKort(ejendomID) {
    try {
      const svar = await fetch(`/api/ejendomme/${ejendomID}`);
      if (!svar.ok) return;
      const data = await svar.json();
      if (!data.koordinater) return;

      const x = data.koordinater[0];
      const y = data.koordinater[1];

      this.visModalKort('luftfoto', x, y, 'modal_luftfoto', 'modal_kort_loading');
      this.visModalKort('matrikel', x, y, 'modal_matrikel', 'modal_kort_loading');
    } catch (fejl) {
      console.log('Kunne ikke hente kortdata:', fejl);
    }
  }
  // Metode der viser kortet i modalvinduet
  visModalKort(lag, x, y, billedeId, loadingId) {
    const billede = document.getElementById(billedeId);
    const loading = document.getElementById(loadingId);

    billede.src = `/api/kort?lag=${lag}&x=${x}&y=${y}`;
    billede.onload = function () {
      loading.style.display = 'none';
      billede.style.display = 'block';
    };
    billede.onerror = function () {
      loading.textContent = `Kunne ikke hente ${lag}`;
    };
  }
  // Metode der viser redigeringsformularen for en given ejendom
  visRedigerFormular(profil, profilDiv) {
    const eksisterende = document.getElementById('rediger_formular');
    if (eksisterende) eksisterende.remove();

    const formular = document.createElement('div');
    formular.id = 'rediger_formular';
    formular.className = 'case_formular';

    let etageVaerdi = '';
    if (profil.etage !== null) {
      etageVaerdi = profil.etage;
    }

    let doerVaerdi = '';
    if (profil.doer !== null) {
      doerVaerdi = profil.doer;
    }

    formular.innerHTML = `<h3>Rediger ejendomsprofil</h3>
      <label>Vejnavn:</label>
      <input type="text" id="red_vejnavn" value="${profil.vejnavn}">
      <label>Husnummer:</label>
      <input type="text" id="red_husnummer" value="${profil.husnummer}">
      <label>Etage:</label>
      <input type="text" id="red_etage" value="${etageVaerdi}">
      <label>Dør:</label>
      <input type="text" id="red_doer" value="${doerVaerdi}">
      <label>Postnummer:</label>
      <input type="text" id="red_postnummer" value="${profil.postnummer}">
      <label>Bynavn:</label>
      <input type="text" id="red_bynavn" value="${profil.bynavn}">
      <label>Ejendomstype:</label>
      <input type="text" id="red_ejendomstype" value="${profil.ejendomstype}">
      <label>Byggeår:</label>
      <input type="number" id="red_byggeaar" value="${profil.byggeaar}">
      <label>Boligareal (m²):</label>
      <input type="number" id="red_boligareal" value="${profil.boligareal}">
      <label>Grundareal (m²):</label>
      <input type="number" id="red_grundareal" value="${profil.grundareal}">
      <label>Antal værelser:</label>
      <input type="number" id="red_vaerelser" value="${profil.vaerelser}">
      <div class="knapper">
      <button id="gem_redigering_knap">Gem ændringer</button>
      <button id="annuller_redigering_knap">Annullér</button>
      </div>
      <div id="rediger_besked"></div>`;

    profilDiv.appendChild(formular);

    document.getElementById('gem_redigering_knap').addEventListener('click', () => this.gemRedigering(profil.ejendomID));
    document.getElementById('annuller_redigering_knap').addEventListener('click', function () { formular.remove(); });
  }
  // Metode der gemmer ændringer i ejendomsprofilen, ved at lave en PUT-anmodning til serveren
  async gemRedigering(ejendomID) {
    const etageVaerdi = document.getElementById('red_etage').value.trim();
    const doerVaerdi = document.getElementById('red_doer').value.trim();

    let etage = null;
    if (etageVaerdi !== '') {
      etage = etageVaerdi;
    }

    let doer = null;
    if (doerVaerdi !== '') {
      doer = doerVaerdi;
    }

    const data = {
      vejnavn: document.getElementById('red_vejnavn').value,
      husnummer: document.getElementById('red_husnummer').value,
      etage: etage,
      doer: doer,
      postnummer: document.getElementById('red_postnummer').value,
      bynavn: document.getElementById('red_bynavn').value,
      ejendomstype: document.getElementById('red_ejendomstype').value,
      byggeaar: parseInt(document.getElementById('red_byggeaar').value),
      boligareal: parseInt(document.getElementById('red_boligareal').value),
      grundareal: parseInt(document.getElementById('red_grundareal').value),
      vaerelser: parseInt(document.getElementById('red_vaerelser').value)
    };

    try {
      const svar = await fetch(`/api/ejendomme/${ejendomID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const resultat = await svar.json();
      const besked = document.getElementById('rediger_besked');

      if (svar.ok) {
        besked.textContent = 'Ændringer gemt';
        besked.className = 'succes';
        this.hentGemteProfiler();
      } else {
        besked.textContent = `Fejl: ${resultat.fejl}`;
        besked.className = 'fejl';
      }

    } catch (fejl) {
      document.getElementById('rediger_besked').textContent = 'Kunne ikke kontakte serveren';
      document.getElementById('rediger_besked').className = 'fejl';
    }
  }
  // Metode der viser formularen for at oprette en ny investeringscase. 
  visOpretCase(ejendomID, profilDiv) {
    const eksisterende = document.getElementById('case_formular');
    if (eksisterende) eksisterende.remove();

    const formular = document.createElement('div');
    formular.id = 'case_formular';
    formular.className = 'case_formular';

    formular.innerHTML = `
      <h3>Ny investeringscase</h3>
      <label for="case_navn">Navn:</label>
      <input type="text" id="case_navn" placeholder="Fx: Lejlighed med udlejning">
      <label for="case_beskrivelse">Beskrivelse:</label>
      <input type="text" id="case_beskrivelse" placeholder="Kort beskrivelse af casen">
      <div class="knapper">
        <button id="gem_case_knap">Start formular</button>
        <button id="annuller_case_knap">Annullér</button>
      </div>
      <div id="case_besked"></div>`;

    profilDiv.appendChild(formular);

    document.getElementById('gem_case_knap').addEventListener('click', function () {
      const navn = document.getElementById('case_navn').value;
      const beskrivelse = document.getElementById('case_beskrivelse').value;
      const caseBesked = document.getElementById('case_besked');

      if (!navn) {
        caseBesked.textContent = 'Navn er påkrævet';
        caseBesked.className = 'fejl';
        return;
      }
      // sessionStorage gemmer data midlertidigt i browseren og bruges her til at sende værdierne videre til investeringscase.html
      sessionStorage.setItem('caseNavn', navn);
      sessionStorage.setItem('caseBeskrivelse', beskrivelse);
      sessionStorage.setItem('ejendomID', ejendomID);

      window.location.href = '/investeringscase.html';
    });

    document.getElementById('annuller_case_knap').addEventListener('click', function () { formular.remove(); });
  }
  // Asynkron metode der henter og viser investeringscases for en given ejendom, ved at lave en GET-anmodning til serveren. 
  async visCases(ejendomID, profilDiv) {
    const eksisterende = profilDiv.querySelector('.cases_liste');
    if (eksisterende) {
      eksisterende.remove();
      return;
    }

    try {
      const svar = await fetch(`/api/cases?ejendomID=${ejendomID}`);
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

        let beskrivelseTekst = '';
        if (c.beskrivelse) {
          beskrivelseTekst = ` — ${c.beskrivelse}`;
        }

        const oprettetTekst = new Date(c.start_dato).toLocaleDateString('da-DK');

        const info = document.createElement('p');
        info.innerHTML = `<strong>${c.navn}</strong>${beskrivelseTekst}<br><small>Oprettet: ${oprettetTekst}</small>`;

        const simuleringKnap = document.createElement('button');
        simuleringKnap.className = 'simulering_knap';
        simuleringKnap.textContent = 'Kør simulering';
        simuleringKnap.addEventListener('click', function () {
          window.location.href = `/simulering.html?caseID=${c.caseID}`;
        });

        const redigerCaseKnap = document.createElement('button');
        redigerCaseKnap.textContent = 'Rediger';
        redigerCaseKnap.addEventListener('click', function () {
          sessionStorage.setItem('redigerCaseID', c.caseID);
          window.location.href = '/rediger-case.html';
        });

        const duplikerKnap = document.createElement('button');
        duplikerKnap.textContent = 'Dupliker';
        duplikerKnap.addEventListener('click', async () => {
          try {
            const svar = await fetch(`/api/cases/${c.caseID}/dupliker`, { method: 'POST' });
            const resultat = await svar.json();

            if (svar.ok) {
              this.visCases(ejendomID, profilDiv);
              this.visCases(ejendomID, profilDiv);
            } else {
              alert(`Fejl: ${resultat.fejl}`);
            }
          } catch (fejl) {
            alert('Kunne ikke kontakte serveren');
          }
        });

        const sletCaseKnap = document.createElement('button');
        sletCaseKnap.className = 'slet_knap';
        sletCaseKnap.textContent = 'Slet';
        sletCaseKnap.addEventListener('click', async () => {
          const bekraeft = confirm(`Er du sikker på du vil slette "${c.navn}"?`);
          if (!bekraeft) return;

          try {
            const svar = await fetch(`/api/cases/${c.caseID}`, { method: 'DELETE' });

            if (svar.ok) {
              this.visCases(ejendomID, profilDiv);
              this.visCases(ejendomID, profilDiv);
            } else {
              const fejlData = await svar.json();
              alert(`Fejl: ${fejlData.fejl}`);
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
}


new AdresseSoegning();
new EjendomsprofilListe();
