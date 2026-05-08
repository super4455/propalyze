class SimuleringView {

  constructor() {
    // caseID hentes fra URL (?caseID=...) i stedet for sessionStorage,
    // så siden kan bookmarkes og åbnes direkte efter en redirect fra gem-flowet
    const params = new URLSearchParams(window.location.search);
    this.caseID = params.get('caseID');
    this.caseData = null;

    if (!this.caseID) {
      document.getElementById('fejl').textContent = 'Ingen investeringscase valgt.';
      return;
    }

    document.getElementById('start_simulering_knap').addEventListener('click', () => this.startSimulering());
    this.hentCaseData();
  }

  // Henter alle data for casen (køb, finansiering, renoveringer, drift, udlejning) i ét kald
  async hentCaseData() {
    try {
      const svar = await fetch(`/api/cases/${this.caseID}/data`);

      if (!svar.ok) {
        document.getElementById('fejl').textContent = 'Kunne ikke hente case-data';
        return;
      }

      this.caseData = await svar.json();
      this.visParametre();

    } catch (fejl) {
      console.log('Fejl ved hentning:', fejl);
      document.getElementById('fejl').textContent = 'Kunne ikke kontakte serveren';
    }
  }

  // Viser et kort overblik over de centrale parametre fra casen før brugeren starter simuleringen
  visParametre() {
    // Køb og finansiering er minimumskrav — uden dem kan simuleringen ikke køre
    if (!this.caseData || !this.caseData.finansiering || !this.caseData.koeb) {
      document.getElementById('fejl').textContent = 'Case mangler køb eller finansiering';
      return;
    }

    const k = this.caseData.koeb;
    const f = this.caseData.finansiering;

    document.getElementById('parametre_liste').innerHTML = `
      <p><strong>Ejendomspris:</strong> ${k.ejendomspris.toLocaleString('da-DK')} kr.</p>
      <p><strong>Lånebeløb:</strong> ${f.laanebeloeb.toLocaleString('da-DK')} kr.</p>
      <p><strong>Rente:</strong> ${f.rente}%</p>
      <p><strong>Løbetid:</strong> ${f.loebetid_aar} år</p>
      <p><strong>Lånetype:</strong> ${f.laanetype}</p>`;

    document.getElementById('parametre_sektion').style.display = 'block';
  }

  // Sender simuleringsforespørgsel til serveren og tegner resultatet ind i tabellen
  async startSimulering() {
    if (!this.caseData || !this.caseData.finansiering || !this.caseData.koeb) {
      document.getElementById('fejl').textContent = 'Manglende data - kan ikke simulere';
      return;
    }

    const periode = parseInt(document.getElementById('periode').value);
    const vaerdistigning = parseFloat(document.getElementById('vaerdistigning').value);

    // Minimum 30 år sikrer at simuleringen dækker en typisk lånelevetid
    if (periode < 30) {
      document.getElementById('fejl').textContent = 'Perioden skal være mindst 30 år';
      return;
    }

    if (isNaN(vaerdistigning)) {
      document.getElementById('fejl').textContent = 'Angiv en gyldig værdistigning';
      return;
    }

    try {
      const svar = await fetch(`/api/cases/${this.caseID}/simuler?periode=${periode}&vaerdistigning=${vaerdistigning}`);

      if (!svar.ok) {
        const fejlSvar = await svar.json();
        document.getElementById('fejl').textContent = fejlSvar.fejl || 'Simulering fejlede';
        return;
      }

      const resultater = await svar.json();
      const tbody = document.getElementById('simulering_tbody');
      tbody.innerHTML = '';

      // Hver række er ét år i simuleringen: ejendomsværdi, restgæld, egenkapital og årligt cashflow
      for (const r of resultater) {
        const rad = document.createElement('tr');
        rad.innerHTML = `
          <td>${r.aar}</td>
          <td>${Math.round(r.ejendomsvaerdi).toLocaleString('da-DK')} kr.</td>
          <td>${Math.round(r.restgaeld).toLocaleString('da-DK')} kr.</td>
          <td>${Math.round(r.egenkapital).toLocaleString('da-DK')} kr.</td>
          <td>${Math.round(r.aarligCashflow).toLocaleString('da-DK')} kr.</td>`;
        tbody.appendChild(rad);
      }

      document.getElementById('fejl').textContent = '';
      document.getElementById('resultat_sektion').style.display = 'block';

    } catch (fejl) {
      console.log('Fejl ved simulering:', fejl);
      document.getElementById('fejl').textContent = 'Kunne ikke kontakte serveren';
    }
  }
}

new SimuleringView();
