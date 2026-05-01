class EjendomsInfoView {

  constructor() {
    this.ejendom = null;

    const params = new URLSearchParams(window.location.search);
    this.dawaId = params.get('dawaId');

    document.getElementById('gem_knap').addEventListener('click', () => this.gemEjendom());
    this.indlaes();
  }

  async indlaes() {
    const fejlFelt = document.getElementById('fejl');

    if (!this.dawaId) {
      fejlFelt.textContent = 'Ingen adresse valgt.';
      return;
    }

    try {
      const svar = await fetch(`/api/ejendomme/lookup?dawaId=${this.dawaId}`);

      if (!svar.ok) {
        // Hvis svaret ikke kan parses som JSON, brug et tomt objekt
        let fejl = {};
        try {
          fejl = await svar.json();
        } catch (parseFejl) {
          fejl = {};
        }

        let fejlBesked = 'kunne ikke hente data';
        if (fejl.fejl) {
          fejlBesked = fejl.fejl;
        }
        fejlFelt.textContent = `Fejl: ${fejlBesked}`;
        return;
      }

      const data = await svar.json();
      this.vis(data.dawa, data.bbr);

    } catch (fejl) {
      console.log('Fejl ved indlaesning:', fejl);
      document.getElementById('fejl').textContent = 'Kunne ikke hente ejendomsdata.';
    }
  }

  vis(dawa, bbr) {
    this.ejendom = { dawa: dawa, bbr: bbr };

    document.getElementById('adresse').textContent = dawa.adresse;
    document.getElementById('ejendomstype').textContent = bbr.ejendomstype || '—';
    document.getElementById('byggeaar').textContent = bbr.byggeaar || '—';
    let boligarealTekst = '—';
    if (bbr.boligareal) {
      boligarealTekst = `${bbr.boligareal} m²`;
    }
    document.getElementById('boligareal').textContent = boligarealTekst;

    let grundarealTekst = '—';
    if (bbr.grundareal) {
      grundarealTekst = `${bbr.grundareal} m²`;
    }
    document.getElementById('grundareal').textContent = grundarealTekst;

    let grundarealVisning = '';
    if (dawa.etage !== null) {
      grundarealVisning = 'none';
    }
    document.getElementById('grundareal_raekke').style.display = grundarealVisning;
    document.getElementById('vaerelser').textContent = bbr.vaerelser || '—';
    document.getElementById('antalEtager').textContent = bbr.antalEtager || '—';

    document.getElementById('gem_knap').style.display = 'block';

    this.visKort('luftfoto', 'luftfoto_billede', 'luftfoto_loading');
    this.visKort('matrikel', 'matrikel_billede', 'matrikel_loading');
  }

  visKort(lag, billedeId, loadingId) {
    const billede = document.getElementById(billedeId);
    const loading = document.getElementById(loadingId);

    if (!this.ejendom || !this.ejendom.bbr.koordinater) {
      loading.textContent = 'Koordinater ikke tilgængelige';
      return;
    }

    const x = this.ejendom.bbr.koordinater[0];
    const y = this.ejendom.bbr.koordinater[1];

    billede.src = `/api/kort?lag=${lag}&x=${x}&y=${y}`;

    billede.onload = function() {
      loading.style.display = 'none';
      billede.style.display = 'block';
    };

    billede.onerror = function() {
      loading.textContent = `Kunne ikke hente ${lag}`;
    };
  }

  async gemEjendom() {
    const besked = document.getElementById('besked');

    const data = {
      dawaID: this.ejendom.dawa.id,
      vejnavn: this.ejendom.dawa.vejnavn,
      husnummer: this.ejendom.dawa.husnummer,
      etage: this.ejendom.dawa.etage,
      doer: this.ejendom.dawa.doer,
      postnummer: this.ejendom.dawa.postnummer,
      bynavn: this.ejendom.dawa.bynavn,
      ejendomstype: this.ejendom.bbr.ejendomstype,
      byggeaar: this.ejendom.bbr.byggeaar,
      boligareal: this.ejendom.bbr.boligareal,
      grundareal: this.ejendom.bbr.grundareal,
      vaerelser: this.ejendom.bbr.vaerelser,
      koordinater: this.ejendom.bbr.koordinater
    };

    try {
      const svar = await fetch('/api/ejendomme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const resultat = await svar.json();

      if (svar.ok) {
        besked.textContent = 'Ejendomsprofil gemt! Gå tilbage til forsiden for at se den.';
        besked.className = 'succes';
        document.getElementById('gem_knap').disabled = true;
      } else {
        besked.textContent = `Fejl: ${resultat.fejl}`;
        besked.className = 'fejl';
      }

    } catch (fejl) {
      console.log('Netvaerksfejl:', fejl);
      besked.textContent = 'Kunne ikke kontakte serveren';
      besked.className = 'fejl';
    }
  }
}

new EjendomsInfoView();
