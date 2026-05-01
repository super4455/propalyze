class SimuleringView {

  constructor() {
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

  visParametre() {
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

  async startSimulering() {
    if (!this.caseData || !this.caseData.finansiering || !this.caseData.koeb) {
      document.getElementById('fejl').textContent = 'Manglende data - kan ikke simulere';
      return;
    }

    const periode = parseInt(document.getElementById('periode').value);
    const vaerdistigning = parseFloat(document.getElementById('vaerdistigning').value);

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
