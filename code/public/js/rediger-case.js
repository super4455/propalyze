class RedigerCaseView {

  constructor() {
    this.caseID = sessionStorage.getItem('redigerCaseID');

    this.koebData = null;
    this.finansieringData = null;
    this.renoveringer = [];
    this.udgifter = [];
    this.indtaegter = [];

    if (!this.caseID) {
      document.getElementById('fejl').textContent = 'Ingen investeringscase valgt.';
      return;
    }

    this.opsaetNavigation();
    this.opsaetTrin1();
    this.opsaetTrin2();
    this.opsaetTrin3();
    this.opsaetTrin4();
    this.opsaetTrin5();
    // Henter eksisterende data fra databasen og fylder formularfelterne ud
    this.indlaesData();
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

  // Henter alle eksisterende data for casen og fylder formularfelterne ud
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

  // Beregner månedlig ydelse for år 1 baseret på lånetype og afdragsfrihed — bruges til live preview.
  // Vigtigt: Logikken er kopieret fra laan.js (backend), da browser-JS ikke kan importere Node.js-moduler.
  static beregnMaanedligYdelse(laanebeloeb, renteAarlig, loebetidAar, afdragsfriaar, laanetype) {
    if (!laanebeloeb || !loebetidAar) return 0;
    const r = renteAarlig / 100 / 12;
    const n = loebetidAar * 12;

    // I afdragsfri periode betales kun renter uanset lånetype
    if (afdragsfriaar > 0) return Math.round(laanebeloeb * r);

    if (laanetype === 'Serielaan') {
      const fastAfdrag = laanebeloeb / n;
      return Math.round(fastAfdrag + laanebeloeb * r);
    }

    if (laanetype === 'Staaende laan') {
      return Math.round(laanebeloeb * r);
    }

    // Annuitetslån (default)
    if (r === 0) return Math.round(laanebeloeb / n);
    return Math.round(laanebeloeb * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  }

  // Opdaterer preview med månedlig ydelse og samlet renteomkostning mens brugeren taster
  opdaterFinansieringOverblik() {
    const laanebeloeb = parseFloat(document.getElementById('laanebeloeb').value) || 0;
    const rente = parseFloat(document.getElementById('rente').value) || 0;
    const loebetidAar = parseInt(document.getElementById('loebetid_aar').value) || 0;
    const afdragsfriaar = parseInt(document.getElementById('afdragsfriaar').value) || 0;
    const laanetype = document.getElementById('laanetype').value;

    const maanedligYdelse = RedigerCaseView.beregnMaanedligYdelse(laanebeloeb, rente, loebetidAar, afdragsfriaar, laanetype);
    // Total rente = alle betalinger over løbetiden minus selve lånebeløbet
    const totalRente = (maanedligYdelse * loebetidAar * 12) - laanebeloeb;

    document.getElementById('maanedlig_ydelse').textContent =
      `${maanedligYdelse.toLocaleString('da-DK')} kr.`;
    document.getElementById('total_rente').textContent =
      `${Math.max(0, Math.round(totalRente)).toLocaleString('da-DK')} kr.`;
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

  // Beregner og viser månedlige og årlige totaler for udgifter og indtægter
  // Poster kan være månedlige eller årlige — begge omregnes til begge visninger
  opdaterDriftsOverblik() {
    let maanedligUdgift = 0;
    let aarligUdgift = 0;
    let maanedligIndtaegt = 0;
    let aarligIndtaegt = 0;

    for (const u of this.udgifter) {
      if (u.frekvens === 'maanedlig') {
        maanedligUdgift += u.beloeb;
        aarligUdgift += u.beloeb * 12;
      } else {
        aarligUdgift += u.beloeb;
        maanedligUdgift += u.beloeb / 12;
      }
    }

    for (const i of this.indtaegter) {
      if (i.frekvens === 'maanedlig') {
        maanedligIndtaegt += i.beloeb;
        aarligIndtaegt += i.beloeb * 12;
      } else {
        aarligIndtaegt += i.beloeb;
        maanedligIndtaegt += i.beloeb / 12;
      }
    }

    document.getElementById('maanedlig_udgift_total').textContent =
      `${Math.round(maanedligUdgift).toLocaleString('da-DK')} kr.`;
    document.getElementById('aarlig_udgift_total').textContent =
      `${Math.round(aarligUdgift).toLocaleString('da-DK')} kr.`;
    document.getElementById('maanedlig_indtaegt_total').textContent =
      `${Math.round(maanedligIndtaegt).toLocaleString('da-DK')} kr.`;
    document.getElementById('aarlig_indtaegt_total').textContent =
      `${Math.round(aarligIndtaegt).toLocaleString('da-DK')} kr.`;
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

      if (!kategori || !beloeb) return;

      this.udgifter.push({ kategori: kategori, beloeb: beloeb, frekvens: frekvens });
      this.visUdgiftListe();
      this.opdaterDriftsOverblik();

      document.getElementById('udgift_kategori').value = '';
      document.getElementById('udgift_beloeb').value = '';
    });

    document.getElementById('tilfoej_indtaegt_knap').addEventListener('click', () => {
      const kategori = document.getElementById('indtaegt_kategori').value;
      const beloeb = parseFloat(document.getElementById('indtaegt_beloeb').value);
      const frekvens = document.getElementById('indtaegt_frekvens').value;

      if (!kategori || !beloeb) return;

      this.indtaegter.push({ kategori: kategori, beloeb: beloeb, frekvens: frekvens });
      this.visIndtaegtListe();
      this.opdaterDriftsOverblik();

      document.getElementById('indtaegt_kategori').value = '';
      document.getElementById('indtaegt_beloeb').value = '';
    });

    document.getElementById('naeste_trin4').addEventListener('click', () => this.visTrin(5));
  }

  // Trin 5: Udlejning + gem alt

  opsaetTrin5() {
    // Bruger function() i stedet for arrow function fordi this skal pege på checkboxen, ikke klassen
    document.getElementById('udlejning_status').addEventListener('change', function() {
      let visning = 'none';
      if (this.checked) {
        visning = 'block';
      }
      document.getElementById('udlejning_detaljer').style.display = visning;
    });

    document.getElementById('gem_alt_knap').addEventListener('click', () => this.gemAlt());
  }

  // Sender alle ændringer til databasen via PUT — opdaterer eksisterende rækker i stedet for at oprette nye
  async gemAlt() {
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

new RedigerCaseView();
