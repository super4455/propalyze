// Fælles formular for både oprettelse og redigering af en investeringscase.
// Tilstand styrer kun init (sessionStorage-nøgler), om data hentes fra databasen
// og om gemAlt() POST'er nye rækker eller PUT'er eksisterende.
class CaseFormular {

  constructor(tilstand) {
    this.tilstand = tilstand;

    // De to tilstande starter fra forskellige sessionStorage-nøgler:
    // 'opret' kommer fra forsiden med en valgt ejendom, 'rediger' kommer fra case-listen
    if (tilstand === 'opret') {
      this.ejendomID = parseInt(sessionStorage.getItem('ejendomID'));
      this.caseNavn = sessionStorage.getItem('caseNavn');
      this.caseBeskrivelse = sessionStorage.getItem('caseBeskrivelse');

      if (!this.ejendomID) {
        document.getElementById('fejl').textContent = 'Ingen ejendom valgt.';
      }
    } else {
      this.caseID = sessionStorage.getItem('redigerCaseID');

      if (!this.caseID) {
        document.getElementById('fejl').textContent = 'Ingen investeringscase valgt.';
        return;
      }
    }

    // Data fra hvert trin gemmes her midlertidigt indtil alt sendes til databasen i trin 5
    this.koebData = null;
    this.finansieringData = null;
    this.renoveringer = [];
    this.udgifter = [];
    this.indtaegter = [];

    // Debounce-timere til live preview — forhindrer et API-kald pr. tastetryk
    this.finansieringTimer = null;
    this.driftTimer = null;

    this.opsaetNavigation();
    this.opsaetTrin1();
    this.opsaetTrin2();
    this.opsaetTrin3();
    this.opsaetTrin4();
    this.opsaetTrin5();

    // I rediger-tilstand henter vi de eksisterende data og fylder formularen ud
    if (tilstand === 'rediger') {
      this.indlaesData();
    }
  }

  // Skjuler alle trin og viser kun det valgte
  visTrin(nummer) {
    for (let i = 1; i <= 5; i++) {
      document.getElementById(`trin${i}`).style.display = 'none';
    }
    document.getElementById(`trin${nummer}`).style.display = 'block';
    document.getElementById('trin_indikator').textContent = `Trin ${nummer} af 5`;
  }

  // Knapperne "Forrige" i hvert trin sender brugeren tilbage til det foregående trin
  opsaetNavigation() {
    document.getElementById('forrige_trin2').addEventListener('click', () => this.visTrin(1));
    document.getElementById('forrige_trin3').addEventListener('click', () => this.visTrin(2));
    document.getElementById('forrige_trin4').addEventListener('click', () => this.visTrin(3));
    document.getElementById('forrige_trin5').addEventListener('click', () => this.visTrin(4));
  }

  // Henter alle eksisterende data for casen og fylder formularfelterne ud (kun rediger-tilstand)
  async indlaesData() {
    try {
      const svar = await fetch(`/api/cases/${this.caseID}/data`);

      if (!svar.ok) {
        document.getElementById('fejl').textContent = 'Kunne ikke hente case-data';
        return;
      }

      const data = await svar.json();

      if (data.koeb) {
        document.getElementById('ejendomspris').value = data.koeb.ejendomspris;
        document.getElementById('koeb_omkostninger').value = data.koeb.koeb_omkostninger;
        document.getElementById('advokat_udgifter').value = data.koeb.advokat_udgifter;
        document.getElementById('tinglysning').value = data.koeb.tinglysning;
        document.getElementById('koeber_raadgivning').checked = data.koeb.koeber_raadgivning;
        this.opdaterKoebOverblik();
      }

      if (data.finansiering) {
        document.getElementById('laanebeloeb').value = data.finansiering.laanebeloeb;
        document.getElementById('rente').value = data.finansiering.rente;
        document.getElementById('loebetid_aar').value = data.finansiering.loebetid_aar;
        document.getElementById('afdragsfriaar').value = data.finansiering.afdragsfriaar;
        document.getElementById('laanetype').value = data.finansiering.laanetype;
        this.opdaterFinansieringOverblik();
      }

      for (const r of data.renoveringer) {
        this.renoveringer.push({
          type_renovering: r.type_renovering,
          renovering_omkostninger: parseFloat(r.renovering_omkostninger),
          planlagt_aar: parseInt(r.planlagt_aar)
        });
      }
      this.visRenoveringListe();

      for (const u of data.udgifter) {
        this.udgifter.push({ kategori: u.kategori, beloeb: parseFloat(u.beloeb), frekvens: u.frekvens });
      }
      for (const i of data.indtaegter) {
        this.indtaegter.push({ kategori: i.kategori, beloeb: parseFloat(i.beloeb), frekvens: i.frekvens });
      }
      this.visUdgiftListe();
      this.visIndtaegtListe();
      this.opdaterDriftsOverblik();

      if (data.udlejning) {
        document.getElementById('udlejning_status').checked = data.udlejning.udlejning_status;
        if (data.udlejning.udlejning_status) {
          document.getElementById('udlejning_detaljer').style.display = 'block';
          document.getElementById('maanedlig_husleje').value = data.udlejning.maanedlig_husleje;
          document.getElementById('maanedlig_udlejning_udgifter').value = data.udlejning.maanedlig_udgifter;
          this.opdaterUdlejningOverblik();
        }
      }

    } catch (fejl) {
      console.log('Fejl ved indlæsning:', fejl);
      document.getElementById('fejl').textContent = 'Kunne ikke indlæse data';
    }
  }

  // Trin 1: Køb

  // Beregner og viser den samlede købspris løbende mens brugeren taster
  opdaterKoebOverblik() {
    const ejendomspris = parseFloat(document.getElementById('ejendomspris').value) || 0;
    const koebOmkostninger = parseFloat(document.getElementById('koeb_omkostninger').value) || 0;
    const advokatUdgifter = parseFloat(document.getElementById('advokat_udgifter').value) || 0;
    const tinglysning = parseFloat(document.getElementById('tinglysning').value) || 0;

    const samlet = ejendomspris + koebOmkostninger + advokatUdgifter + tinglysning;
    document.getElementById('samlet_koeb').textContent = `${samlet.toLocaleString('da-DK')} kr.`;
  }

  // Lytter på inputfelterne og gem-knappen i trin 1
  opsaetTrin1() {
    document.getElementById('ejendomspris').addEventListener('input', () => this.opdaterKoebOverblik());
    document.getElementById('koeb_omkostninger').addEventListener('input', () => this.opdaterKoebOverblik());
    document.getElementById('advokat_udgifter').addEventListener('input', () => this.opdaterKoebOverblik());
    document.getElementById('tinglysning').addEventListener('input', () => this.opdaterKoebOverblik());

    document.getElementById('gem_koeb_knap').addEventListener('click', () => {
      const ejendomspris = parseFloat(document.getElementById('ejendomspris').value);
      const koebOmkostninger = parseFloat(document.getElementById('koeb_omkostninger').value);
      const advokatUdgifter = parseFloat(document.getElementById('advokat_udgifter').value);
      const tinglysning = parseFloat(document.getElementById('tinglysning').value);
      const besked = document.getElementById('koeb_besked');

      if (!ejendomspris || !koebOmkostninger || !advokatUdgifter || !tinglysning) {
        besked.textContent = 'Alle felter skal udfyldes';
        besked.className = 'fejl';
        return;
      }

      // Gem købsdata midlertidigt — sendes til databasen først når hele formularen er udfyldt i trin 5
      this.koebData = {
        ejendomspris: ejendomspris,
        koeb_omkostninger: koebOmkostninger,
        advokat_udgifter: advokatUdgifter,
        tinglysning: tinglysning,
        koeber_raadgivning: document.getElementById('koeber_raadgivning').checked
      };

      besked.textContent = 'Køb registreret';
      besked.className = 'succes';
      this.visTrin(2);
    });
  }

  // Trin 2: Finansiering

  // Henter beregnet månedlig ydelse og total rente fra backend med debouncing
  opdaterFinansieringOverblik() {
    clearTimeout(this.finansieringTimer);
    this.finansieringTimer = setTimeout(async () => {
      const laanebeloeb = parseFloat(document.getElementById('laanebeloeb').value) || 0;
      const rente = parseFloat(document.getElementById('rente').value) || 0;
      const loebetidAar = parseInt(document.getElementById('loebetid_aar').value) || 0;
      const afdragsfriaar = parseInt(document.getElementById('afdragsfriaar').value) || 0;
      const laanetype = document.getElementById('laanetype').value;

      if (!laanebeloeb || !loebetidAar || !laanetype) return;

      try {
        const svar = await fetch('/api/beregn/ydelse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ laanebeloeb, rente, loebetid_aar: loebetidAar, afdragsfriaar, laanetype })
        });

        if (!svar.ok) return;

        const resultat = await svar.json();
        document.getElementById('maanedlig_ydelse').textContent =
          `${resultat.maanedligYdelse.toLocaleString('da-DK')} kr.`;
        document.getElementById('total_rente').textContent =
          `${resultat.totalRente.toLocaleString('da-DK')} kr.`;
      } catch (fejl) {
        console.log('Fejl ved beregning af ydelse:', fejl);
      }
    }, 300);
  }

  // Lytter på alle finansieringsfelter så preview opdateres løbende
  opsaetTrin2() {
    document.getElementById('laanebeloeb').addEventListener('input', () => this.opdaterFinansieringOverblik());
    document.getElementById('rente').addEventListener('input', () => this.opdaterFinansieringOverblik());
    document.getElementById('loebetid_aar').addEventListener('input', () => this.opdaterFinansieringOverblik());
    document.getElementById('afdragsfriaar').addEventListener('input', () => this.opdaterFinansieringOverblik());
    document.getElementById('laanetype').addEventListener('change', () => this.opdaterFinansieringOverblik());

    document.getElementById('gem_finansiering_knap').addEventListener('click', () => {
      const laanebeloeb = parseFloat(document.getElementById('laanebeloeb').value);
      const rente = parseFloat(document.getElementById('rente').value);
      const loebetidAar = parseInt(document.getElementById('loebetid_aar').value);
      const afdragsfriaar = parseInt(document.getElementById('afdragsfriaar').value) || 0;
      const laanetype = document.getElementById('laanetype').value;
      const besked = document.getElementById('finansiering_besked');

      if (!laanebeloeb || !rente || !loebetidAar || !laanetype) {
        besked.textContent = 'Udfyld alle felter undtagen afdragsfri periode';
        besked.className = 'fejl';
        return;
      }

      this.finansieringData = {
        laanebeloeb: laanebeloeb,
        rente: rente,
        loebetid_aar: loebetidAar,
        afdragsfriaar: afdragsfriaar,
        laanetype: laanetype
      };

      besked.textContent = 'Finansiering registreret';
      besked.className = 'succes';
      this.visTrin(3);
    });
  }

  // Trin 3: Renovering

  // Tegner listen af tilføjede renoveringer op på ny hver gang der tilføjes en ny
  visRenoveringListe() {
    const liste = document.getElementById('renovering_liste');
    liste.innerHTML = '';
    for (const r of this.renoveringer) {
      const p = document.createElement('p');
      p.textContent = `${r.type_renovering} · ${r.renovering_omkostninger.toLocaleString('da-DK')} kr. · År ${r.planlagt_aar}`;
      liste.appendChild(p);
    }
  }

  // Håndterer tilføjelse af renoveringer og videresendelse til trin 4
  opsaetTrin3() {
    document.getElementById('tilfoej_renovering_knap').addEventListener('click', () => {
      const type = document.getElementById('type_renovering').value;
      const omkostninger = parseFloat(document.getElementById('renovering_omkostninger').value);
      const aar = parseInt(document.getElementById('planlagt_aar').value);
      const besked = document.getElementById('renovering_besked');

      if (!type || !omkostninger || !aar) {
        besked.textContent = 'Udfyld alle renoveringsfelter';
        besked.className = 'fejl';
        return;
      }

      this.renoveringer.push({ type_renovering: type, renovering_omkostninger: omkostninger, planlagt_aar: aar });
      this.visRenoveringListe();

      document.getElementById('type_renovering').value = '';
      document.getElementById('renovering_omkostninger').value = '';
      document.getElementById('planlagt_aar').value = '';

      besked.textContent = 'Renovering tilføjet';
      besked.className = 'succes';
    });

    document.getElementById('naeste_trin3').addEventListener('click', () => this.visTrin(4));
  }

  // Trin 4: Driftsbudget

  // Henter beregnede driftstotaler fra backend med debouncing
  opdaterDriftsOverblik() {
    clearTimeout(this.driftTimer);
    this.driftTimer = setTimeout(async () => {
      try {
        const svar = await fetch('/api/beregn/drift', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ udgifter: this.udgifter, indtaegter: this.indtaegter })
        });

        if (!svar.ok) return;

        const resultat = await svar.json();
        document.getElementById('maanedlig_udgift_total').textContent =
          `${resultat.maanedligUdgift.toLocaleString('da-DK')} kr.`;
        document.getElementById('aarlig_udgift_total').textContent =
          `${resultat.aarligUdgift.toLocaleString('da-DK')} kr.`;
        document.getElementById('maanedlig_indtaegt_total').textContent =
          `${resultat.maanedligIndtaegt.toLocaleString('da-DK')} kr.`;
        document.getElementById('aarlig_indtaegt_total').textContent =
          `${resultat.aarligIndtaegt.toLocaleString('da-DK')} kr.`;
      } catch (fejl) {
        console.log('Fejl ved beregning af drift:', fejl);
      }
    }, 300);
  }

  // Tegner listen af udgifter op på ny
  visUdgiftListe() {
    const liste = document.getElementById('udgift_liste');
    liste.innerHTML = '';
    for (const u of this.udgifter) {
      const p = document.createElement('p');
      p.textContent = `${u.kategori} · ${u.beloeb.toLocaleString('da-DK')} kr. · ${u.frekvens}`;
      liste.appendChild(p);
    }
  }

  // Tegner listen af indtægter op på ny
  visIndtaegtListe() {
    const liste = document.getElementById('indtaegt_liste');
    liste.innerHTML = '';
    for (const i of this.indtaegter) {
      const p = document.createElement('p');
      p.textContent = `${i.kategori} · ${i.beloeb.toLocaleString('da-DK')} kr. · ${i.frekvens}`;
      liste.appendChild(p);
    }
  }

  // Håndterer tilføjelse af udgifter og indtægter samt videresendelse til trin 5
  opsaetTrin4() {
    document.getElementById('tilfoej_udgift_knap').addEventListener('click', () => {
      const kategori = document.getElementById('udgift_kategori').value;
      const beloeb = parseFloat(document.getElementById('udgift_beloeb').value);
      const frekvens = document.getElementById('udgift_frekvens').value;
      const besked = document.getElementById('driftsbudget_besked');

      if (!kategori || !beloeb) {
        besked.textContent = 'Udfyld kategori og beløb';
        besked.className = 'fejl';
        return;
      }

      this.udgifter.push({ kategori: kategori, beloeb: beloeb, frekvens: frekvens });
      this.visUdgiftListe();
      this.opdaterDriftsOverblik();

      document.getElementById('udgift_kategori').value = '';
      document.getElementById('udgift_beloeb').value = '';
      besked.textContent = 'Udgift tilføjet';
      besked.className = 'succes';
    });

    document.getElementById('tilfoej_indtaegt_knap').addEventListener('click', () => {
      const kategori = document.getElementById('indtaegt_kategori').value;
      const beloeb = parseFloat(document.getElementById('indtaegt_beloeb').value);
      const frekvens = document.getElementById('indtaegt_frekvens').value;
      const besked = document.getElementById('driftsbudget_besked');

      if (!kategori || !beloeb) {
        besked.textContent = 'Udfyld kategori og beløb';
        besked.className = 'fejl';
        return;
      }

      this.indtaegter.push({ kategori: kategori, beloeb: beloeb, frekvens: frekvens });
      this.visIndtaegtListe();
      this.opdaterDriftsOverblik();

      document.getElementById('indtaegt_kategori').value = '';
      document.getElementById('indtaegt_beloeb').value = '';
      besked.textContent = 'Indtægt tilføjet';
      besked.className = 'succes';
    });

    document.getElementById('gem_drift_knap').addEventListener('click', () => {
      document.getElementById('driftsbudget_besked').textContent = 'Driftsbudget registreret';
      document.getElementById('driftsbudget_besked').className = 'succes';
      this.visTrin(5);
    });
  }

  // Trin 5: Udlejning + gem alt

  // Beregner og viser månedligt og årligt cashflow fra udlejning mens brugeren taster
  opdaterUdlejningOverblik() {
    const husleje = parseFloat(document.getElementById('maanedlig_husleje').value) || 0;
    const udlejUdgifter = parseFloat(document.getElementById('maanedlig_udlejning_udgifter').value) || 0;

    const maanedligCashflow = husleje - udlejUdgifter;
    document.getElementById('maanedlig_cashflow').textContent =
      `${maanedligCashflow.toLocaleString('da-DK')} kr.`;
    document.getElementById('aarlig_cashflow').textContent =
      `${(maanedligCashflow * 12).toLocaleString('da-DK')} kr.`;
  }

  opsaetTrin5() {
    // Bruger function() i stedet for arrow function fordi this skal pege på checkboxen, ikke klassen
    document.getElementById('udlejning_status').addEventListener('change', function() {
      let visning = 'none';
      if (this.checked) {
        visning = 'block';
      }
      document.getElementById('udlejning_detaljer').style.display = visning;
    });

    document.getElementById('maanedlig_husleje').addEventListener('input', () => this.opdaterUdlejningOverblik());
    document.getElementById('maanedlig_udlejning_udgifter').addEventListener('input', () => this.opdaterUdlejningOverblik());

    document.getElementById('gem_alt_knap').addEventListener('click', () => this.gemAlt());
  }

  // Den eneste reelle forskel mellem opret og rediger: hvilken HTTP-metode der bruges
  // og hvor brugeren sendes hen bagefter.
  async gemAlt() {
    if (this.tilstand === 'opret') {
      await this.gemSomNy();
    } else {
      await this.gemSomOpdatering();
    }
  }

  // Sender alle data fra trin 1-5 til databasen i den rigtige rækkefølge
  // Rækkefølgen er vigtig: case skal oprettes først for at få et caseID, driftsbudget for at få driftsbudgetID
  async gemSomNy() {
    const besked = document.getElementById('udlejning_besked');

    if (!this.koebData) {
      besked.textContent = 'Gå tilbage og udfyld trin 1 (køb)';
      besked.className = 'fejl';
      return;
    }

    if (!this.finansieringData) {
      besked.textContent = 'Gå tilbage og udfyld trin 2 (finansiering)';
      besked.className = 'fejl';
      return;
    }

    besked.textContent = 'Gemmer...';
    besked.className = '';

    try {
      // Opret selve casen og gem det returnerede caseID
      const caseSvar = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ejendomID: this.ejendomID,
          navn: this.caseNavn,
          beskrivelse: this.caseBeskrivelse
        })
      });

      const caseResultat = await caseSvar.json();
      const caseID = caseResultat.caseID;

      // ...this.koebData spreder objektets felter ud som individuelle parametre
      await fetch('/api/koeb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseID: caseID, ...this.koebData })
      });

      await fetch('/api/finansiering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseID: caseID, ...this.finansieringData })
      });

      for (const r of this.renoveringer) {
        await fetch('/api/renovering', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caseID: caseID, ...r })
        });
      }

      // Driftsbudget oprettes først for at få driftsbudgetID til udgifter og indtægter
      const dbSvar = await fetch('/api/driftsbudget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseID: caseID })
      });
      const dbResultat = await dbSvar.json();
      const driftsbudgetID = dbResultat.driftsbudgetID;

      for (const u of this.udgifter) {
        await fetch('/api/driftsbudget/udgift', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ driftsbudgetID: driftsbudgetID, ...u })
        });
      }

      for (const i of this.indtaegter) {
        await fetch('/api/driftsbudget/indtaegt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ driftsbudgetID: driftsbudgetID, ...i })
        });
      }

      await fetch('/api/udlejning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseID: caseID,
          udlejning_status: document.getElementById('udlejning_status').checked,
          maanedlig_husleje: parseFloat(document.getElementById('maanedlig_husleje').value) || 0,
          maanedlig_udgifter: parseFloat(document.getElementById('maanedlig_udlejning_udgifter').value) || 0
        })
      });

      // Ryd sessionStorage nu data er gemt i databasen
      sessionStorage.removeItem('caseNavn');
      sessionStorage.removeItem('caseBeskrivelse');
      sessionStorage.removeItem('ejendomID');

      besked.textContent = 'Investeringscase gemt! Åbner simulering...';
      besked.className = 'succes';

      // Kort forsinkelse så brugeren når at læse beskeden inden redirect
      setTimeout(function() {
        window.location.href = `/simulering.html?caseID=${caseID}`;
      }, 1500);

    } catch (fejl) {
      console.log('Fejl ved gem:', fejl);
      besked.textContent = 'Noget gik galt. Prøv igen.';
      besked.className = 'fejl';
    }
  }

  // Sender alle ændringer til databasen via PUT — opdaterer eksisterende rækker i stedet for at oprette nye
  async gemSomOpdatering() {
    const besked = document.getElementById('udlejning_besked');

    if (!this.koebData || !this.finansieringData) {
      besked.textContent = 'Gå tilbage og udfyld trin 1 og 2';
      besked.className = 'fejl';
      return;
    }

    besked.textContent = 'Gemmer ændringer...';
    besked.className = '';

    try {
      await fetch(`/api/koeb/${this.caseID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.koebData)
      });

      await fetch(`/api/finansiering/${this.caseID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.finansieringData)
      });

      // Renovering og driftsbudget bruger replace-strategi: slet alle eksisterende og indsæt de nye
      await fetch(`/api/renovering/${this.caseID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ renoveringer: this.renoveringer })
      });

      await fetch(`/api/driftsbudget/${this.caseID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ udgifter: this.udgifter, indtaegter: this.indtaegter })
      });

      await fetch(`/api/udlejning/${this.caseID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          udlejning_status: document.getElementById('udlejning_status').checked,
          maanedlig_husleje: parseFloat(document.getElementById('maanedlig_husleje').value) || 0,
          maanedlig_udgifter: parseFloat(document.getElementById('maanedlig_udlejning_udgifter').value) || 0
        })
      });

      sessionStorage.removeItem('redigerCaseID');

      besked.textContent = 'Ændringer gemt!';
      besked.className = 'succes';

      // Kort forsinkelse så brugeren når at læse beskeden inden redirect
      setTimeout(function() {
        window.location.href = '/';
      }, 1500);

    } catch (fejl) {
      console.log('Fejl ved gem:', fejl);
      besked.textContent = 'Noget gik galt. Prøv igen.';
      besked.className = 'fejl';
    }
  }
}
