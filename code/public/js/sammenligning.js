class SammenligningView {

  constructor() {
    document.getElementById('sammenlign_knap').addEventListener('click', () => this.sammenlign());
    this.hentAlleCases();
  }

  static formatKr(tal) {
    if (tal === null || tal === undefined) return '—';
    return Math.round(tal).toLocaleString('da-DK') + ' kr.';
  }

  async hentAlleCases() {
    try {
      const svar = await fetch('/api/cases/alle');

      if (!svar.ok) {
        document.getElementById('fejl').textContent = 'Kunne ikke hente cases';
        return;
      }

      const cases = await svar.json();
      const liste = document.getElementById('case_valg_liste');

      if (cases.length === 0) {
        liste.innerHTML = '<p>Ingen investeringscases fundet. Opret en case først.</p>';
        return;
      }

      liste.innerHTML = '';

      for (const c of cases) {
        const div = document.createElement('div');
        div.className = 'case_valg_item';

        div.innerHTML = '<label>'
          + '<input type="checkbox" class="case_checkbox" value="' + c.caseID + '">'
          + '<span class="case_valg_navn">' + c.navn + '</span>'
          + '<span class="case_valg_ejendom">'
          + c.vejnavn + ' ' + c.husnummer + ', ' + c.bynavn
          + '</span>'
          + '</label>';

        liste.appendChild(div);
      }

    } catch (fejl) {
      console.log('Fejl ved hentning af cases:', fejl);
      document.getElementById('fejl').textContent = 'Kunne ikke kontakte serveren';
    }
  }

  async sammenlign() {
    const fejlDiv = document.getElementById('fejl');
    fejlDiv.textContent = '';

    const checkboxes = document.querySelectorAll('.case_checkbox:checked');
    const ids = [];

    for (const cb of checkboxes) {
      ids.push(cb.value);
    }

    if (ids.length < 2) {
      fejlDiv.textContent = 'Vælg mindst to cases for at sammenligne';
      fejlDiv.className = 'fejl';
      return;
    }

    try {
      const svar = await fetch('/api/cases/sammenlign?ids=' + ids.join(','));
      const data = await svar.json();

      if (!svar.ok) {
        fejlDiv.textContent = data.fejl;
        fejlDiv.className = 'fejl';
        return;
      }

      this.vissammenligning(data);

    } catch (fejl) {
      console.log('Fejl ved sammenligning:', fejl);
      fejlDiv.textContent = 'Kunne ikke kontakte serveren';
      fejlDiv.className = 'fejl';
    }
  }

  vissammenligning(cases) {
    const container = document.getElementById('sammenligning_tabel_container');

    let html = '<table id="sammenligning_tabel"><thead><tr>';
    html += '<th></th>';

    for (const c of cases) {
      html += '<th>'
        + '<span class="tabel_case_navn">' + c.navn + '</span>'
        + '<span class="tabel_case_ejendom">' + c.ejendom + '</span>'
        + '</th>';
    }

    html += '</tr></thead><tbody>';

    const raekker = [
      { label: 'Ejendomspris',       noegle: 'ejendomspris',       type: 'kr' },
      { label: 'Lånebeløb',          noegle: 'laanebeloeb',        type: 'kr' },
      { label: 'Rente',              noegle: 'rente',              type: 'pct' },
      { label: 'Løbetid',            noegle: 'loebetid_aar',       type: 'aar' },
      { label: 'Lånetype',           noegle: 'laanetype',          type: 'tekst' },
      { label: 'Månedlig ydelse',    noegle: 'maanedlig_ydelse',   type: 'kr' },
      { label: 'Total renteomk.',    noegle: 'total_rente',        type: 'kr' },
      { label: 'Månedlig drift',     noegle: 'maanedlig_drift',    type: 'kr' },
      { label: 'Månedlig husleje',   noegle: 'maanedlig_leje',     type: 'kr' },
      { label: 'Cashflow/måned',     noegle: 'maanedlig_cashflow', type: 'cashflow' }
    ];

    for (const raekke of raekker) {
      html += '<tr>';
      html += '<td class="raekke_label">' + raekke.label + '</td>';

      for (const c of cases) {
        const vaerdi = c[raekke.noegle];
        let visning = '';

        if (raekke.type === 'kr') {
          visning = SammenligningView.formatKr(vaerdi);
        } else if (raekke.type === 'pct') {
          visning = vaerdi !== null ? vaerdi + '%' : '—';
        } else if (raekke.type === 'aar') {
          visning = vaerdi !== null ? vaerdi + ' år' : '—';
        } else if (raekke.type === 'tekst') {
          visning = vaerdi || '—';
        } else if (raekke.type === 'cashflow') {
          const klasse = vaerdi >= 0 ? 'positiv' : 'negativ';
          visning = '<span class="' + klasse + '">' + SammenligningView.formatKr(vaerdi) + '</span>';
        }

        html += '<td>' + visning + '</td>';
      }

      html += '</tr>';
    }

    html += '</tbody></table>';

    container.innerHTML = html;
    document.getElementById('resultat_sektion').style.display = 'block';
    document.getElementById('resultat_sektion').scrollIntoView({ behavior: 'smooth' });
  }
}

new SammenligningView();
