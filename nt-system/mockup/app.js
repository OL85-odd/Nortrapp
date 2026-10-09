/* NT-System · klikkbar mockup. Ingen lagring — alt nullstilles ved oppdatering (bortsett fra tema/rolle). */
(() => {
  const D = window.NT;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const kr = (n) => (n == null ? '—' : Math.round(n).toLocaleString('nb-NO').replace(/,/g, ' ') + ',-');
  const tall = (n, d = 0) => Number(n).toLocaleString('nb-NO', { maximumFractionDigits: d, minimumFractionDigits: d });
  const IDAG = new Date(D.idag + 'T09:12:00');

  /* ── Lagret oppsett (per nettleser, bare bekvemmelighet) ── */
  const lagret = (() => {
    try { return JSON.parse(localStorage.getItem('nt-system.mockup') || '{}'); } catch { return {}; }
  })();
  const lagre = () => { try { localStorage.setItem('nt-system.mockup', JSON.stringify(lagret)); } catch { /* privat vindu */ } };
  const S = {
    rolle: lagret.rolle || 'tegner',
    bruker: lagret.bruker || 'OL',
    widgets: lagret.widgets || {},
    tilpass: false,
    valgtDel: 'trinn',
    kalkFane: 'trapp',
    hast: false,
    varefilter: 'alle',
    timerStart: null,
    timerPause: 0,
    ferdigMeldt: [],
  };

  /* ── Hjelpere ─────────────────────────────────────────── */
  const pid = (p) => `${p.kalk}-${p.pos}`;
  const finnP = (id) => D.prosjekter.find((p) => pid(p) === id);
  const fh = (nr) => D.forhandlere.find((f) => f.nr === nr);
  const avdNavn = (nr) => { const f = fh(nr); return f ? f.navn : '—'; };
  const farge = (nr) => D.fargekoder.find((f) => f.nr === nr);
  const ofl = (nr) => D.overflater.find((o) => o.nr === nr);
  const stasjon = (id) => D.stasjoner.find((s) => s.id === id);
  const bruker = (id) => D.brukere.find((b) => b.id === id);
  const kat = (kode) => D.kategorier.find((k) => k.kode === kode);
  const nrTekst = (p) => `${String(p.kalk).padStart(6, '0')}-${String(p.pos).padStart(2, '0')}-${p.kat}${p.rev ? '-' + p.rev : ''} · P${p.prod}`;
  const nr = (p) => `<span class="nr"><b>${String(p.kalk).padStart(6, '0')}-${String(p.pos).padStart(2, '0')}-${p.kat}</b>${p.rev ? '-' + p.rev : ''} <span class="p">· P${p.prod}</span></span>`;
  const dato = (iso, m = {}) => new Date(iso + 'T12:00:00').toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short', ...m });
  const dagerTil = (iso) => Math.round((new Date(iso + 'T12:00:00') - new Date(D.idag + 'T12:00:00')) / 86400000);
  const uke = (d) => {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dag = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - dag);
    return Math.ceil(((t - new Date(Date.UTC(t.getUTCFullYear(), 0, 1))) / 86400000 + 1) / 7);
  };
  const leggTilArbeidsdager = (fra, n) => {
    const d = new Date(fra);
    while (n > 0) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) n--; }
    return d;
  };
  const isoDato = (d) => d.toISOString().slice(0, 10);
  const overflateStasjon = (p) => (p.ofl === 1 ? null : p.ofl === 2 ? 'olje' : 'lakk');
  const stoppStasjon = (p, s) => (s === 'overflate' ? overflateStasjon(p) || 'overflate' : s);
  const stoppNavn = (p, s) => { const id = stoppStasjon(p, s); return stasjon(id)?.navn || D.STOPPNAVN[s] || s; };
  const sporFor = (p) => D.sporMaler[kat(p.kat).spor];
  const ferdigAlt = (p) => ['levert', 'ettermarked'].includes(p.status);
  const aktive = () => D.prosjekter.filter((p) => !ferdigAlt(p));
  const fargeprove = (p) => {
    const f = farge(p.farge);
    return f ? `<span class="fargeprove" style="background:${f.hex}" title="${esc(f.navn)}"></span>` : '<span class="fargeprove" style="background:repeating-linear-gradient(45deg,var(--surface-2) 0 5px,var(--accent-soft) 5px 10px)" title="Farge ikke avklart"></span>';
  };
  const fargeTekst = (p) => (farge(p.farge) ? `${ofl(p.ofl).navn} · ${farge(p.farge).navn}` : `${ofl(p.ofl).navn} · <span style="color:var(--accent)">farge ikke avklart</span>`);
  const statusChip = (p) => {
    const t = { forespørsel: 'Forespørsel', tilbud: 'Tilbud', ordre: 'Ordre', tegning: 'Tegning', produksjon: 'Produksjon', overflate: 'Overflate', pakking: 'Pakking', levert: 'Levert', ettermarked: 'Ettermarked' }[p.status];
    const k = p.haster ? 'fare' : p.status === 'levert' ? 'ok' : ['produksjon', 'overflate', 'pakking'].includes(p.status) ? 'bla' : '';
    return `<span class="chip ${k}">${t}${p.haster ? ' · haster' : ''}</span>`;
  };
  const bufferChip = (p) => {
    if (ferdigAlt(p)) return '<span class="chip ok">Levert</span>';
    const k = p.buffer <= 0 ? 'fare' : p.buffer <= 2 ? 'varsel' : 'ok';
    return `<span class="chip ${k}">${p.buffer} d buffer</span>`;
  };
  // Et «QR-mønster» som ser riktig ut (ikke en ekte QR-kode).
  const qr = (tekst) => {
    let h = 0; for (const c of tekst) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    let r = '';
    const fast = (x, y) => (x < 7 && y < 7) || (x > 17 && y < 7) || (x < 7 && y > 17);
    for (let y = 0; y < 25; y++) for (let x = 0; x < 25; x++) {
      if (fast(x, y)) {
        const lx = x > 17 ? x - 18 : x, ly = y > 17 ? y - 18 : y;
        if (lx === 0 || ly === 0 || lx === 6 || ly === 6 || (lx > 1 && lx < 5 && ly > 1 && ly < 5)) r += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
        continue;
      }
      h = (h * 1103515245 + 12345) >>> 0;
      if ((h >>> 16) & 1) r += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    }
    return `<svg class="qr" viewBox="-1 -1 27 27" shape-rendering="crispEdges">${r}</svg>`;
  };
  const melding = (tekst, type = 'ok') => {
    document.querySelector('.toast')?.remove();
    const el = document.createElement('div');
    el.className = `toast notis ${type}`;
    el.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:60;box-shadow:0 8px 24px rgba(0,0,0,.18);background:var(--surface)';
    el.innerHTML = tekst;
    document.body.append(el);
    setTimeout(() => el.remove(), 3200);
  };

  /* ── Meny ─────────────────────────────────────────────── */
  const MENY = [
    ['Oversikt', [['', 'Dashbord'], ['oppgaver', 'Mine oppgaver', () => D.oppgaver.filter((o) => o.hvem === S.bruker && o.kol !== 'ferdig').length]]],
    ['Salg · NT-Kalk', [['salg', 'Henvendelser og tilbud', () => D.henvendelser.filter((h) => !['Tapt'].includes(h.status)).length], ['kalk/58612', 'Kalkulasjon (eksempel)'], ['priser', 'Prisliste og grunndata']]],
    ['Prosjekter', [['prosjekter', 'Alle prosjekter', () => aktive().length], ['dekktrinn', 'Dekktrinn-bestilling', () => ({ n: 2, fare: true })]]],
    ['Produksjon', [['fabrikk', 'Fabrikken'], ['stasjon/lakk', 'Stasjonsskjerm'], ['plan', 'Kapasitet og normtider'], ['ressurser', 'Bemanning og kompetanse']]],
    ['Lager og logistikk', [['varer', 'Varer og lager', () => { const n = D.varer.filter((v) => v.beh != null && v.beh < v.min).length; return n ? { n, fare: true } : null; }], ['logistikk', 'Pakking og transport']]],
    ['Økonomi', [['okonomi', 'Økonomi og Tripletex']]],
    ['Ettermarked', [['ettermarked', 'Ettermarked']]],
    ['System', [['arkivet', 'NT-Arkivet · prosesser'], ['innstillinger', 'Innstillinger'], ['lagring', 'Lagring og backup']]],
  ];
  function tegnMeny(rute) {
    const topp = rute.split('/')[0];
    $('#meny').innerHTML = MENY.map(([gruppe, lenker]) => `<h4>${gruppe}</h4>` + lenker.map(([r, navn, teller]) => {
      const t = teller?.();
      const tv = t == null ? '' : typeof t === 'object' ? `<span class="teller fare">${t.n}</span>` : t ? `<span class="teller">${t}</span>` : '';
      const aktiv = r === rute || (r && r.split('/')[0] === topp && !lenker.some(([x]) => x === rute)) || (!r && !rute);
      return `<a href="#/${r}" class="${aktiv ? 'aktiv' : ''}">${navn}${tv}</a>`;
    }).join('')).join('');
  }

  /* ── Sidehode ─────────────────────────────────────────── */
  const hode = (label, tittel, tekst, knapper = '') =>
    `<div class="sidehode"><div><span class="label">${label}</span><h1>${tittel}</h1>${tekst ? `<p>${tekst}</p>` : ''}</div><div class="knapper">${knapper}</div></div>`;

  /* ═════════════ DASHBORD ═════════════ */
  const WIDGETS = [
    ['kpi', 'Nøkkeltall'], ['flyt', 'Hovedlinjen'], ['fabrikk', 'Fabrikken nå'], ['varsler', 'Varsler'],
    ['dekktrinn', 'Dekktrinn'], ['kapasitet', 'Kapasitet'], ['oppgaver', 'Mine oppgaver'], ['okonomi', 'Økonomi'],
  ];
  const valgteWidgets = () => S.widgets[S.rolle] || D.roller.find((r) => r.id === S.rolle).widgets;

  function varselListe() {
    const v = [
      { k: 'fare', t: 'Dekktrinn-bestilling uke 42', s: 'Frist tirsdag 08:00 · 2 DXF-filer mangler i ukemappen', l: 'dekktrinn' },
      { k: 'fare', t: '58607-01-TRA har 0 dager buffer', s: 'Pakkes i dag, leveres Moss tirsdag', l: 'prosjekt/58607-1' },
      { k: 'varsel-gul', t: 'Farge ikke avklart · 58612', s: 'Lakk planlagt uke 45 — avklar innen 4 arbeidsdager', l: 'prosjekt/58612-1' },
      { k: 'varsel-gul', t: 'Materialkontroll: eikeplate 42 mm', s: '58609 + 58612 + 58604 trenger 47 m², 38 m² på lager', l: 'varer' },
      { k: 'varsel-gul', t: 'Gelenderavdelingen 104 % uke 42', s: 'Jonas syk torsdag — se forslag i bemanning', l: 'ressurser' },
      { k: 'varsel-gul', t: 'Hardvoksolje under minimum', s: '9 l på lager, minimum 12 l', l: 'varer' },
      { k: 'ok', t: 'OB 58612 lest inn og kontrollert', s: '24 av 24 felt stemmer mot produksjonsordren', l: 'kalk/58612' },
    ];
    return `<div class="varsler">${v.map((x) => `<a class="varsel ${x.k}" href="#/${x.l}"><i class="ikon"></i><div><strong>${x.t}</strong><span>${x.s}</span></div><span class="faint">›</span></a>`).join('')}</div>`;
  }

  function flytLinje() {
    const ant = (id) => {
      if (id === 'forespørsel') return D.henvendelser.filter((h) => ['Kalkuleres', 'Kalkulert'].includes(h.status)).length;
      if (id === 'tilbud') return D.henvendelser.filter((h) => h.status === 'Tilbud sendt').length;
      return D.prosjekter.filter((p) => p.status === id).length;
    };
    const lenke = { forespørsel: 'salg', tilbud: 'salg', ordre: 'prosjekter', tegning: 'prosjekter', produksjon: 'fabrikk', overflate: 'stasjon/lakk', pakking: 'logistikk', levert: 'prosjekter', ettermarked: 'ettermarked' };
    return `<div class="flyt">${D.flyt.map((f) => `<a class="flyt-stopp" href="#/${lenke[f.id]}"><span class="flyt-prikk">${ant(f.id)}</span><span class="flyt-navn">${f.navn}</span></a>`).join('')}</div>`;
  }

  function fabrikkSvg({ stor = false } = {}) {
    const soner = [
      ['Kontor', 14, 14, 130, 92], ['Fres', 170, 14, 150, 252], ['Gelender', 340, 14, 170, 252], ['Puss', 530, 14, 140, 252],
      ['Overflate', 690, 14, 140, 172], ['Utlevering', 690, 270, 256, 90], ['', 830, 14, 116, 172],
    ];
    const prikker = {};
    for (const p of aktive()) {
      if (p.status === 'tegning') { (prikker.tegning ??= []).push(p); continue; }
      sporFor(p).forEach((sp, i) => {
        const v = p.spor[i];
        if (v < 0) return;
        const id = stoppStasjon(p, sp.stopp[v]);
        if (stasjon(id)) (prikker[id] ??= []).includes(p) || prikker[id].push(p);
      });
    }
    const st = D.stasjoner.map((s) => {
      const lastK = s.last > 1 ? 'full' : s.last > 0.85 ? 'hoy' : '';
      const ps = (prikker[s.id] || []).slice(0, Math.floor((s.b - 14) / 17));
      return `<a href="#/stasjon/${s.id}"><g class="stasjon ${s.last > 1 ? 'full' : ''}">
        <rect class="kropp" x="${s.x}" y="${s.y}" width="${s.b}" height="${s.h}" rx="8"/>
        <text x="${s.x + 9}" y="${s.y + 17}">${esc(s.navn)}</text>
        <text class="liten" x="${s.x + 9}" y="${s.y + 30}">${Math.round(s.last * 100)} % · ${s.kap} pers</text>
        <rect class="last-spor" x="${s.x + 9}" y="${s.y + s.h - 12}" width="${s.b - 18}" height="4" rx="2"/>
        <rect class="last ${lastK}" x="${s.x + 9}" y="${s.y + s.h - 12}" width="${Math.min(1, s.last) * (s.b - 18)}" height="4" rx="2"/>
        ${ps.map((p, i) => `<g><title>${nrTekst(p)} · ${esc(p.kunde)}</title><circle class="prikk" cx="${s.x + 16 + i * 17}" cy="${s.y + 41}" r="7.5" ${p.haster ? 'style="fill:var(--accent)"' : ''}/><text class="prikk-tekst" text-anchor="middle" x="${s.x + 16 + i * 17}" y="${s.y + 44}">${String(p.kalk).slice(-2)}</text></g>`).join('')}
      </g></a>`;
    }).join('');
    const linjer = [
      'M134,62 L180,62', 'M310,62 L350,62', 'M310,142 L350,102', 'M500,62 L540,62', 'M500,142 L540,142', 'M660,62 L700,62',
      'M660,222 L700,142', 'M820,62 L840,62', 'M820,142 L840,120', 'M760,286 L760,174 M888,174 L888,286', 'M310,222 L540,222',
    ];
    return `<svg class="fabrikk" viewBox="0 0 960 370" role="img" aria-label="Fabrikklayout">
      <rect class="vegg" x="4" y="4" width="952" height="362" rx="10"/>
      ${soner.map(([n, x, y, b, h]) => (n ? `<rect class="sone" x="${x}" y="${y}" width="${b}" height="${h}" rx="10"/><text class="sonenavn" x="${x + 8}" y="${y + 11}">${n}</text>` : '')).join('')}
      ${linjer.map((d) => `<path class="flytlinje" d="${d}"/>`).join('')}
      ${st}
    </svg>`;
  }

  function kapasitetsRader(stasjoner = ['tegning', 'reich', 'gelender', 'lakk', 'pakking'], uker = 4) {
    const u0 = uke(IDAG);
    const verdi = (s, i) => Math.max(0.2, Math.min(1.25, s.last + [0, -0.08, 0.06, -0.2, 0.1, -0.15][i] + (s.id === 'gelender' && i === 1 ? 0.1 : 0)));
    return `<div class="kap"><div class="kap-rad"><span></span>${Array.from({ length: uker }, (_, i) => `<span class="label">Uke ${u0 + i}</span>`).join('')}</div>` +
      stasjoner.map((id) => {
        const s = stasjon(id);
        return `<div class="kap-rad" style="grid-template-columns:130px repeat(${uker},1fr)"><span>${s.navn}</span>${Array.from({ length: uker }, (_, i) => {
          const v = verdi(s, i);
          return `<div class="kap-celle ${v > 1 ? 'full' : v > 0.85 ? 'hoy' : ''}"><i style="width:${Math.min(100, v * 100)}%"></i><span>${Math.round(v * 100)} %</span></div>`;
        }).join('')}</div>`;
      }).join('') + '</div>';
  }

  function oppgaveKanban(alle = false) {
    const kol = [['todo', 'Å gjøre'], ['gang', 'Pågår'], ['venter', 'Venter'], ['ferdig', 'Ferdig']];
    const liste = alle ? D.oppgaver : D.oppgaver.filter((o) => o.hvem === S.bruker || D.roller.find((r) => r.id === S.rolle).id === 'leder');
    return `<div class="kanban">${kol.map(([id, navn]) => `<div class="kolonne"><span class="label">${navn} · ${liste.filter((o) => o.kol === id).length}</span>${liste.filter((o) => o.kol === id).map((o) =>
      `<div class="oppgave ${o.haster ? 'haster' : ''} ${o.kol === 'ferdig' ? 'ferdig' : ''}">${esc(o.tekst)}<span class="faint mono" style="font-size:11px">${o.hvem}${o.frist ? ' · ' + o.frist : ''}</span></div>`).join('') || '<span class="faint" style="font-size:12px">—</span>'}</div>`).join('')}</div>`;
  }

  function vDashbord() {
    const w = valgteWidgets();
    const rolle = D.roller.find((r) => r.id === S.rolle);
    const b = bruker(S.bruker);
    const iProd = D.prosjekter.filter((p) => ['produksjon', 'overflate', 'pakking'].includes(p.status));
    const tilbud = D.henvendelser.filter((h) => h.status === 'Tilbud sendt');
    const blokker = {
      kpi: `<div class="card kpi s3"><span class="label">I produksjon</span><span class="tall">${iProd.length}</span><span class="soft">${iProd.filter((p) => p.buffer <= 1).length} med lav buffer</span></div>
        <div class="card kpi s3"><span class="label">Åpne tilbud</span><span class="tall">${tilbud.length}</span><span class="soft">${kr(tilbud.reduce((a, h) => a + h.verdi, 0))}</span></div>
        <div class="card kpi s3 fare"><span class="label">Varsler</span><span class="tall">2</span><span class="soft">+ 4 til oppfølging</span></div>
        <div class="card kpi s3 ok"><span class="label">Leveringstid nå</span><span class="tall">${uke(leggTilArbeidsdager(IDAG, 24))}</span><span class="soft">uke for ny standard trapp</span></div>`,
      flyt: `<section class="card blokk s12"><div class="blokk-hode"><h2>Hovedlinjen · forespørsel til ettermarked</h2><span class="label">Klikk et stopp</span></div>${flytLinje()}</section>`,
      fabrikk: `<section class="card blokk s8"><div class="blokk-hode"><h2>Fabrikken nå</h2><a class="btn liten" href="#/fabrikk">Åpne</a></div>${fabrikkSvg()}<span class="faint" style="font-size:12px">Prikkene er prosjekter (to siste siffer i kalkylenummeret). Rød = haster. Strek nederst = belastning denne uka.</span></section>`,
      varsler: `<section class="card blokk ${w.includes('fabrikk') ? 's4' : 's6'}"><div class="blokk-hode"><h2>Varsler</h2><span class="chip fare">2 røde</span></div>${varselListe()}</section>`,
      kapasitet: `<section class="card blokk s6"><div class="blokk-hode"><h2>Kapasitet neste 4 uker</h2><a class="btn liten" href="#/plan">Planlegg</a></div>${kapasitetsRader()}</section>`,
      oppgaver: `<section class="card blokk s12"><div class="blokk-hode"><h2>Mine oppgaver · ${b.navn}</h2><a class="btn liten" href="#/oppgaver">Alle</a></div>${oppgaveKanban()}</section>`,
      dekktrinn: `<section class="card blokk s6"><div class="blokk-hode"><h2>Dekktrinn uke 42</h2><span class="chip fare">Tir 08:00</span></div>${dekktrinnTabell(true)}<a class="btn liten" href="#/dekktrinn" style="justify-self:start">Start bestilling</a></section>`,
      okonomi: `<section class="card blokk s6"><div class="blokk-hode"><h2>Økonomi · oktober</h2><a class="btn liten" href="#/okonomi">Åpne</a></div>
        <div class="prisbryter"><span>Fakturert</span><span class="tall">${kr(412600)}</span><span>Ordrereserve</span><span class="tall">${kr(D.prosjekter.filter((p) => !ferdigAlt(p)).reduce((a, p) => a + p.verdi, 0))}</span><span>Provisjon til utbetaling</span><span class="tall">${kr(38450)}</span><span>Snitt dekningsgrad (etterkalk)</span><span class="tall">41,8 %</span></div></section>`,
    };
    const tilpass = `<div class="card blokk s12 ${S.tilpass ? '' : 'skjult'}"><div class="blokk-hode"><h2>Tilpass dashbordet for «${rolle.navn}»</h2><button class="btn liten" data-h="nullstill-widgets">Standard</button></div>
      <div class="widget-velg">${WIDGETS.map(([id, navn]) => `<label><input type="checkbox" data-widget="${id}" ${w.includes(id) ? 'checked' : ''}> ${navn}</label>`).join('')}</div>
      <span class="faint" style="font-size:12px">Hver rolle og avdeling har sitt eget standardoppsett. Brukeren kan slå av og på blokker; oppsettet lagres på brukeren på serveren.</span></div>`;
    return hode(`${rolle.navn} · ${b.navn}`, 'Dashbord', `God morgen, ${b.navn}. Uke ${uke(IDAG)}, ${IDAG.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })}.`,
      `<button class="btn" data-h="tilpass">${S.tilpass ? 'Ferdig' : 'Tilpass'}</button><a class="btn primar" href="#/salg">+ Ny henvendelse</a>`) +
      `<div class="rutenett">${tilpass}${WIDGETS.map(([id]) => (w.includes(id) ? blokker[id] : '')).join('')}</div>`;
  }

  function vOppgaver() {
    return hode('Oversikt', 'Mine oppgaver', 'Oppgaver kommer fra prosessene (NT-Arkivet), varsler og andre brukere. Gjentakende oppgaver (som dekktrinn hver tirsdag) lages automatisk.', '<button class="btn primar" data-h="ny-oppgave">+ Ny oppgave</button>') +
      `<div class="card blokk">${oppgaveKanban(true)}</div>`;
  }

  /* ═════════════ SALG / NT-KALK ═════════════ */
  function vSalg() {
    const rader = D.henvendelser.map((h) => {
      const k = { 'Tilbud sendt': 'bla', 'Ordrebekreftelse sendt': 'ok', Tapt: '', Kalkuleres: 'varsel', Kalkulert: '' }[h.status] ?? '';
      return `<tr class="klikk" data-gaa="kalk/${h.kalk}"><td class="nr"><b>${String(h.kalk).padStart(6, '0')}</b>${h.rev ? '-' + h.rev : ''}</td><td>${esc(h.kunde)}<div class="faint" style="font-size:12px">${esc(h.sted)}</div></td><td>${esc(h.produkt)}</td><td>${avdNavn(h.fh)}</td><td><span class="chip ${k}">${h.status}</span></td><td class="mono">${h.ansv}</td><td class="tall">${kr(h.verdi)}</td><td class="mono faint">${dato(h.dato)}</td></tr>`;
    }).join('');
    const kol = ['Kalkuleres', 'Kalkulert', 'Tilbud sendt', 'Ordrebekreftelse sendt'];
    return hode('NT-Kalk · erstatter webkalk', 'Henvendelser', 'Én henvendelse får ett kalkylenummer. Hver trapp, spilevegg eller trinnkasse blir en posisjon (-01, -02 …). Nye revisjoner av tilbudet får bokstav (A, B, C).',
      '<div class="segmented"><button aria-pressed="true">Liste</button><button data-h="ikke-i-mockup">Kanban</button></div><button class="btn primar" data-h="ny-henvendelse">+ Ny henvendelse</button>') +
      `<div class="rutenett">${kol.map((s) => { const l = D.henvendelser.filter((h) => h.status === s); return `<div class="card kpi s3"><span class="label">${s}</span><span class="tall">${l.length}</span><span class="soft">${kr(l.reduce((a, h) => a + h.verdi, 0))}</span></div>`; }).join('')}
      <section class="card blokk s12"><div class="tabellramme"><table class="tabell"><thead><tr><th>Kalk.nr</th><th>Kunde</th><th>Produkt</th><th>Forhandler</th><th>Status</th><th>Ansv.</th><th class="tall">Beløp eks. mva</th><th>Dato</th></tr></thead><tbody>${rader}</tbody></table></div></section></div>`;
  }

  function prisFor(type, treslag, bredde, oflNr) {
    const g = D.priser.grunn[type] || 30000;
    return Math.round(g * (D.priser.treslag[treslag] || 1) * (D.priser.bredde[bredde] || 1) * (1 + (D.priser.overflate[oflNr] || 0)) / 100) * 100;
  }

  function leveringstid() {
    // Kapasitet + buffer per ledd. «Hast» hopper over køen og spiser buffer.
    const ledd = [
      ['Tegning', S.hast ? 1 : 3, 'var(--k-gra)'], ['Kø fres', S.hast ? 0 : 6, 'var(--text-faint)'], ['Fres', 2, 'var(--secondary)'], ['Gelender', 4, 'var(--k-turkis)'],
      ['Puss', 2, 'var(--k-lilla)'], ['Lakk', S.hast ? 1 : 3, 'var(--k-oransje)'], ['Buffer', S.hast ? 0 : 3, 'var(--k-gul)'], ['Pakk + transport', 2, 'var(--k-gra)'],
    ];
    const sum = ledd.reduce((a, l) => a + l[1], 0);
    const lev = leggTilArbeidsdager(IDAG, sum);
    return `<div class="ltid"><div class="blokk-hode"><div><span class="label">Tidligste levering</span><div class="dato">Uke ${uke(lev)}</div><span class="soft">${lev.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })} · ${sum} arbeidsdager</span></div>
      <label class="widget-velg"><label><input type="checkbox" data-h="hast" ${S.hast ? 'checked' : ''}> Hast (Simen)</label></label></div>
      <div class="tidslinje">${ledd.filter((l) => l[1]).map(([n, d, f]) => `<div style="flex:${d};background:${f}" title="${n}: ${d} d">${n}</div>`).join('')}</div>
      <span class="faint" style="font-size:12px">Regnes fra ledig kapasitet på hver stasjon (normtider × kø) + buffer per ledd. Systemet justerer normtidene etter faktisk start/stopp på stasjonene.${S.hast ? ' <b style="color:var(--accent)">Hast flytter 3 andre prosjekter 1 dag — de har fortsatt buffer.</b>' : ''}</span></div>`;
  }

  function vKalk(kalkNr) {
    const h = D.henvendelser.find((x) => x.kalk === +kalkNr) || D.henvendelser[3];
    const pos = D.prosjekter.filter((p) => p.kalk === h.kalk);
    const p = pos[0] || { kalk: h.kalk, pos: 1, kat: 'TRA', prod: '2611', type: 'Kvartsvingt', treslag: 'Eik', ofl: 3, farge: null, fh: h.fh };
    const f = fh(h.fh);
    const fane = S.kalkFane;
    const faner = [['kunde', 'Kunde'], ['trapp', 'Trappeinformasjon'], ['deler', 'Deler og beregning'], ['tilvalg', 'Tilvalg'], ['tilbud', 'Tilbud og ordre'], ['dok', 'Dokumenter']];
    const grunn = prisFor(p.type, p.treslag, 900, p.ofl);
    const delrader = [
      ['Trapp, grunnpris', p.type, 1, 'stk', D.priser.grunn[p.type] || 0],
      ['Treslag', p.treslag, 1, 'faktor', Math.round((D.priser.grunn[p.type] || 0) * ((D.priser.treslag[p.treslag] || 1) - 1))],
      ['Overflate', ofl(p.ofl).navn, 1, '%', Math.round((D.priser.grunn[p.type] || 0) * (D.priser.overflate[p.ofl] || 0))],
      ['Håndløper i retur', 'Eik 60×45', 2.4, 'lm', 2160],
      ['Returgelender m/spiler', 'Stål Ø12', 1.8, 'lm', 4680],
      ['Barnesikring', 'Standard grind', 1, 'stk', 2450],
      ['Dekktrinn', 'Skaffevare · eik', 14, 'stk', 18900],
      ['Måling', '', 1, 'stk', 2900],
      ['Frakt', 'Råde', 1, 'stk', 3200],
    ];
    const sum = delrader.reduce((a, r) => a + r[4], 0);
    const prov = Math.round(sum * (f.prov - 1));
    let innhold = '';
    if (fane === 'kunde') {
      innhold = `<div class="skjema"><label class="felt"><span>Kunde</span><input value="${esc(h.kunde)}"></label><label class="felt"><span>Byggeadresse</span><input value="Eksempelveien 12, ${esc(h.sted)}"></label>
        <label class="felt"><span>Telefon</span><input value="900 00 000"></label><label class="felt"><span>E-post</span><input value="kunde@example.no"></label>
        <label class="felt"><span>Forhandler</span><select>${D.forhandlere.map((x) => `<option ${x.nr === h.fh ? 'selected' : ''}>${x.nr} · ${x.navn}</option>`).join('')}</select></label>
        <label class="felt"><span>Avdelingskode</span><select>${D.avdelinger.map((a) => `<option ${a.nr === f.avd ? 'selected' : ''}>${a.nr} · ${a.navn}</option>`).join('')}</select></label>
        <label class="felt"><span>Selger</span><select>${D.brukere.filter((b) => b.rolle === 'salg').map((b) => `<option ${b.id === h.ansv ? 'selected' : ''}>${b.navn}</option>`).join('')}</select></label>
        <label class="felt"><span>Kilde</span><select><option>Forhandler</option><option>Nettside</option><option>Telefon</option><option>Messe</option></select></label></div>`;
    } else if (fane === 'trapp') {
      innhold = `<div class="skjema">
        <label class="felt"><span>Kategori</span><select>${D.kategorier.map((k) => `<option ${k.kode === p.kat ? 'selected' : ''}>${k.kode} · ${k.navn}</option>`).join('')}</select></label>
        <label class="felt"><span>Type trapp</span><select>${D.typer.map((t) => `<option ${t === p.type ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label class="felt"><span>Bredde løp 1</span><input value="900"></label><label class="felt"><span>Bredde løp 2</span><input value="900"></label>
        <label class="felt"><span>Antall opptrinn</span><input value="16"></label><label class="felt"><span>Etasjehøyde</span><input value="2780"></label>
        <label class="felt"><span>Gangretning</span><select><option>Venstre</option><option selected>Høyre</option></select></label>
        <label class="felt"><span>Åpen / tett</span><select><option>Åpen</option><option>Tett</option></select></label>
        <label class="felt"><span>Treslag</span><select>${Object.keys(D.priser.treslag).map((t) => `<option ${t === p.treslag ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label class="felt"><span>Overflate</span><select>${D.overflater.map((o) => `<option ${o.nr === p.ofl ? 'selected' : ''}>${o.nr} · ${o.navn}</option>`).join('')}</select></label>
        <label class="felt"><span>Fargekode</span><select><option ${p.farge ? '' : 'selected'}>— ikke avklart —</option>${D.fargekoder.filter((x) => x.ofl === p.ofl).map((x) => `<option ${x.nr === p.farge ? 'selected' : ''}>${x.nr} · ${x.navn}</option>`).join('')}</select></label>
        <label class="felt"><span>Levering</span><select><option>Montert</option><option>Umontert</option></select></label>
        <label class="felt bred"><span>Info til kunde</span><textarea rows="2">Trappen leveres med sklisikring og monteringsveiledning (QR på pakken).</textarea></label>
        <label class="felt bred"><span>Intern info</span><textarea rows="2">Skjev vegg ved trinn 12 — bruk «Delt bjelkelagsåpning» i tegning.</textarea></label></div>
        ${p.farge ? '' : '<div class="notis fare">Fargekode er ikke avklart. Lakk er planlagt uke 45 — fargen må være satt senest 4 arbeidsdager før. Varsel går til selger og kunde.</div>'}`;
    } else if (fane === 'deler') {
      innhold = `<div class="tabellramme"><table class="tabell"><thead><tr><th>Del</th><th>Komponent / materiale</th><th class="tall">Antall</th><th>Enhet</th><th class="tall">Pris</th></tr></thead><tbody>
        ${delrader.map((r) => `<tr><td>${r[0]}</td><td class="soft">${r[1]}</td><td class="tall">${tall(r[2], r[2] % 1 ? 1 : 0)}</td><td class="mono">${r[3]}</td><td class="tall">${kr(r[4])}</td></tr>`).join('')}</tbody></table></div>
        <div class="notis">Prisen bygges som <b>grunnpris × treslag × bredde + overflatetillegg + tilvalg</b> i stedet for én rad per kombinasjon i prislisten. Gir ${kr(grunn)} for ${p.type.toLowerCase()} i ${p.treslag.toLowerCase()}, 900 mm.</div>`;
    } else if (fane === 'tilvalg') {
      const tv = [['Dekktrinn', 'Skaffevare — bestilles tirsdag etter tegning', true], ['Glass i rekkverk', 'Skaffevare — mål etter tegning', false], ['Barnesikring', 'Lagervare', true], ['Montering', 'Montør fra avdeling', false], ['Delt bjelkelagsåpning', 'Skjeve vegger — eget steg i tegneprosessen', true], ['LED i trinn', 'Skaffevare', false]];
      innhold = `<div class="widget-velg">${tv.map(([n, s, c]) => `<label title="${s}"><input type="checkbox" ${c ? 'checked' : ''}> ${n}</label>`).join('')}</div>
        <div class="notis">Tilvalg styrer hvilke prosesser som aktiveres i prosjektet: dekktrinn legger prosjektet i tirsdagsbestillingen, glass lager en bestillingsoppgave, montering lager en oppgave til avdelingen.</div>`;
    } else if (fane === 'tilbud') {
      innhold = `<div class="skjema">${[['Tilbudsdato', '29.09.2026'], ['Leveringstid (uke)', '47'], ['Oppfølging', '06.10.2026'], ['Bestillingsdato', '02.10.2026']].map(([a, b]) => `<label class="felt"><span>${a}</span><input value="${b}"></label>`).join('')}
        ${[['Planlagt måltaking', '13.10', true], ['Planlagt start produksjon', '02.11', false], ['Planlagt levering', '20.11', true], ['Planlagt montering', '23.11', false]].map(([a, b, c]) => `<label class="felt"><span>${a}</span><input value="${b}.2026"><span class="faint" style="font-size:11px"><input type="checkbox" ${c ? 'checked' : ''}> Fastsatt</span></label>`).join('')}
        <label class="felt"><span>Samlefaktureres med</span><input placeholder="Kalk.nr"></label></div>
        <div class="knapper"><button class="btn" data-h="ikke-i-mockup">Forhåndsvis tilbud (PDF)</button><button class="btn" data-h="ikke-i-mockup">Ny revisjon (D)</button><button class="btn primar" data-h="til-ordre">Tilbud akseptert → lag ordre</button></div>`;
    } else {
      innhold = `<div class="tabellramme"><table class="tabell"><thead><tr><th>Dokument</th><th>Type</th><th>Status</th><th></th></tr></thead><tbody>
        <tr><td>OB_058612-C.pdf</td><td><span class="chip ingen">Ordrebekreftelse</span></td><td><span class="chip ok">Lest inn · 24/24</span></td><td class="mono faint">OCR</td></tr>
        <tr><td>PO_058612-01.pdf</td><td><span class="chip ingen">Produksjonsordre</span></td><td><span class="chip ok">Kontrollert mot OB</span></td><td class="mono faint">pdf</td></tr>
        <tr><td>Planview_058612-01.png</td><td><span class="chip ingen">Planview</span></td><td><span class="chip ok">Lest inn</span></td><td class="mono faint">OCR</td></tr>
        <tr><td>Måleskisse.jpg</td><td><span class="chip ingen">Annet</span></td><td><span class="chip">Lagret</span></td><td></td></tr></tbody></table></div>
        <div class="notis">Innlesingen er den samme som i NT-Arkivet: dra inn OB/PO/Planview, verdiene fylles inn og kontrolleres mot hverandre.</div>`;
    }
    const steg = [['Henvendelse registrert', 'ferdig'], ['Kalkulert', 'ferdig'], ['Tilbud sendt (rev. C)', 'ferdig'], ['Tilbud akseptert', 'ferdig'], ['Mål mottatt', 'ferdig'], ['Ordrebekreftelse sendt', 'ferdig'], ['OB akseptert', 'na'], ['Til tegning', '']];
    return `<a class="tilbake" href="#/salg">‹ Henvendelser</a>` +
      hode(`Kalkulasjon · ${esc(h.kunde)} · ${esc(h.sted)}`, `${String(h.kalk).padStart(6, '0')}${h.rev ? '-' + h.rev : ''}`, `${esc(h.produkt)} · forhandler ${f.nr} ${f.navn} · ${h.status}`,
        '<button class="btn" data-h="ikke-i-mockup">Kopier</button><button class="btn primar" data-h="lagret">Lagre</button>') +
      `<div class="rutenett"><section class="card blokk s8" style="align-self:start">
        <div class="chips">${pos.length ? pos.map((x) => `<span class="chip bla">${nrTekst(x)}</span>`).join('') : '<span class="chip">Pos 01 · TRA</span>'}<button class="chip ingen" data-h="ny-pos" style="background:none">+ posisjon</button></div>
        <div class="faner">${faner.map(([id, n]) => `<button aria-selected="${id === fane}" data-fane="${id}">${n}</button>`).join('')}</div>${innhold}</section>
      <div class="s4" style="display:grid;gap:14px;align-content:start">
        <section class="card blokk"><h2>Pris</h2><div class="prisbryter"><span>Sum produkter</span><span class="tall">${kr(sum)}</span><span>Rabatt 0 %</span><span class="tall">0,-</span><span>Sum eks. mva</span><span class="tall">${kr(sum)}</span><span>Mva 25 %</span><span class="tall">${kr(sum * 0.25)}</span><span class="sum">Total</span><span class="tall sum">${kr(sum * 1.25)}</span></div></section>
        <section class="card blokk"><h2>Godtgjørelse forhandler</h2><div class="prisbryter"><span>Prov.sats</span><span class="tall">${tall(f.prov, 2)}</span><span>Grunnlag</span><span class="tall">${kr(sum - 6100)}</span><span>Provisjon</span><span class="tall">${kr(prov)}</span><span>Mål, mont., frakt</span><span class="tall">${kr(6100)}</span></div></section>
        <section class="card blokk">${leveringstid()}</section>
        <section class="card blokk"><h2>Materialkontroll</h2><div class="notis fare">Eikeplate 42 mm: trenger 14 m². 38 m² på lager, men 33 m² er reservert til 58604 og 58609. <b>Bestill 20 m²</b> (ledetid 10 d) — påvirker ikke leveringstiden.</div></section>
        <section class="card blokk"><h2>Salgsprosess</h2><div class="prosess">${steg.map(([t, k], i) => `<div class="prosess-steg ${k}"><span class="pr">${k === 'ferdig' ? '✓' : i + 1}</span><div><strong>${t}</strong>${k === 'na' ? '<span>Venter på kundens aksept · purres automatisk etter 3 dager</span>' : ''}</div></div>`).join('')}</div><span class="faint" style="font-size:12px">Stegene er en NT-Arkivet-prosess og kan redigeres.</span></section>
      </div></div>`;
  }

  function vPriser() {
    const t = Object.entries(D.priser.grunn).map(([k, v]) => `<tr><td>${k}</td><td class="tall">${kr(v)}</td><td class="tall">${kr(v * D.priser.bredde[800])}</td><td class="tall">${kr(v * D.priser.bredde[1000])}</td></tr>`).join('');
    return hode('NT-Kalk · grunndata', 'Prisliste', 'Forslag: grunnpris per trappetype og et lite sett med faktorer og tillegg, i stedet for én prislinje per kombinasjon av del × type × bredde × materiale × overflate. Gamle prislinjer kan importeres og fortsatt brukes som unntak.', '<button class="btn" data-h="ikke-i-mockup">Importer prisliste (Excel)</button><button class="btn primar" data-h="lagret">Lagre ny versjon</button>') +
      `<div class="rutenett"><section class="card blokk s6"><h2>Grunnpris (eik, 900 mm, ubehandlet)</h2><table class="tabell"><thead><tr><th>Type</th><th class="tall">900</th><th class="tall">800</th><th class="tall">1000</th></tr></thead><tbody>${t}</tbody></table></section>
      <section class="card blokk s3"><h2>Treslag</h2><table class="tabell"><tbody>${Object.entries(D.priser.treslag).map(([k, v]) => `<tr><td>${k}</td><td class="tall"><input class="inp" style="width:70px;text-align:right" value="${tall(v, 2)}"></td></tr>`).join('')}</tbody></table></section>
      <section class="card blokk s3"><h2>Overflate</h2><table class="tabell"><tbody>${D.overflater.map((o) => `<tr><td>${o.navn}</td><td class="tall">+${Math.round(D.priser.overflate[o.nr] * 100)} %</td></tr>`).join('')}</tbody></table></section>
      <section class="card blokk s6"><h2>Fargekoder</h2><div class="tabellramme"><table class="tabell"><tbody>${D.fargekoder.map((f) => `<tr><td class="mono">${f.nr}</td><td><span class="fargeprove" style="background:${f.hex};display:inline-block;width:18px;height:18px;vertical-align:middle"></span> ${f.navn}</td><td class="soft">${ofl(f.ofl).navn}</td></tr>`).join('')}</tbody></table></div></section>
      <section class="card blokk s6"><h2>Forhandlere og provisjon</h2><table class="tabell"><thead><tr><th>Nr</th><th>Forhandler</th><th>Avd.kode</th><th class="tall">Prov.sats</th></tr></thead><tbody>${D.forhandlere.map((f) => `<tr><td class="mono">${f.nr}</td><td>${f.navn}</td><td class="mono">${f.avd ?? '—'}</td><td class="tall">${f.prov ? tall(f.prov, 2) : '—'}</td></tr>`).join('')}</tbody></table>
      <h2 style="margin-top:8px">FDV-dokumentasjon</h2><div class="chips">${D.overflater.map((o) => `<span class="chip ok">FDV · ${o.navn}</span>`).join('')}</div></section></div>`;
  }

  /* ═════════════ PROSJEKTER ═════════════ */
  function vProsjekter() {
    const rader = D.prosjekter.slice().sort((a, b) => a.lev.localeCompare(b.lev)).map((p) => `<tr class="klikk" data-gaa="prosjekt/${pid(p)}">
      <td>${nr(p)}</td><td>${esc(p.kunde)}<div class="faint" style="font-size:12px">${esc(p.sted)} · ${avdNavn(p.fh)}</div></td><td>${p.type}<div class="faint" style="font-size:12px">${p.treslag}</div></td>
      <td>${fargeprove(p)}</td><td>${statusChip(p)}</td><td class="mono">${p.tegner}</td><td class="mono">${dato(p.lev)}</td><td>${bufferChip(p)}</td></tr>`).join('');
    return hode('Prosjekter', 'Alle prosjekter', 'Nummer: <span class="mono">kalkylenr-posisjon-kategori · P åå mm</span>. P2610 = produseres oktober 2026. Reklamasjon får R1, R2 … på samme nummer.',
      '<div class="segmented"><button aria-pressed="true">Aktive</button><button data-h="ikke-i-mockup">Levert</button><button data-h="ikke-i-mockup">Alle</button></div>') +
      `<section class="card blokk"><div class="tabellramme"><table class="tabell"><thead><tr><th>Nummer</th><th>Kunde</th><th>Produkt</th><th>Farge</th><th>Status</th><th>Tegner</th><th>Levering</th><th>Buffer</th></tr></thead><tbody>${rader}</tbody></table></div></section>`;
  }

  function sporVisning(p) {
    return `<div class="spor">${sporFor(p).map((sp, i) => {
      const v = ferdigAlt(p) ? 99 : p.spor[i];
      return `<div class="spor-rad"><span class="label">${sp.del}</span><div class="spor-linje">${sp.stopp.map((s, j) => {
        const k = j < v ? 'ferdig' : j === v ? 'na' : 'kommer';
        return `<div class="spor-stopp ${k}"><span class="pr"></span><span class="spor-navn">${stoppNavn(p, s)}</span>${j < sp.stopp.length - 1 ? '<span class="strek"></span>' : ''}</div>`;
      }).join('')}</div></div>`;
    }).join('')}</div>`;
  }

  function trapp3d() {
    const v = S.valgtDel;
    const trinn = Array.from({ length: 9 }, (_, i) => {
      const x = 70 + i * 30, y = 250 - i * 22;
      return `<polygon points="${x},${y} ${x + 60},${y - 18} ${x + 90},${y - 18} ${x + 30},${y}" fill="#c99a62" stroke="#7a5532" stroke-width="1"/><rect x="${x}" y="${y}" width="30" height="7" fill="#a8783f" stroke="#7a5532" stroke-width=".6"/>`;
    }).join('');
    const g = (id, innhold) => `<g class="del ${v === id || (v === 'repo' && id === 'trinn') ? 'valgt' : ''}" data-del="${id}">${innhold}</g>`;
    return `<svg viewBox="0 -60 440 360">
      ${g('vange_h', '<polygon points="120,262 395,64 395,86 120,284" fill="#b88a55" stroke="#7a5532"/>')}
      ${g('trinn', trinn)}
      ${g('vange_v', '<polygon points="60,270 335,72 335,94 60,292" fill="#d3a873" stroke="#7a5532"/>')}
      ${g('spiler', Array.from({ length: 10 }, (_, i) => `<rect x="${78 + i * 27}" y="${(157 - i * 19.44).toFixed(1)}" width="3" height="100" fill="#555" stroke="#333" stroke-width=".4"/>`).join(''))}
      ${g('stolpe', '<rect x="50" y="158" width="14" height="132" fill="#9c6b3f" stroke="#5d3e22"/><rect x="330" y="-44" width="14" height="138" fill="#9c6b3f" stroke="#5d3e22"/>')}
      ${g('hl', '<polygon points="50,168 344,-44 344,-30 50,182" fill="#8a5a32" stroke="#5d3e22"/>')}
    </svg>`;
  }

  function vProsjekt(id) {
    const p = finnP(id) || D.prosjekter[0];
    const sted = `${esc(p.sted)} · forhandler ${avdNavn(p.fh)} (avd. ${fh(p.fh).avd ?? '—'})`;
    const delRader = D.deler.map((d) => `<tr class="klikk ${S.valgtDel === d.id ? 'valgt' : ''}" data-del="${d.id}"><td>${d.navn}</td><td class="tall">${tall(d.ant, d.ant % 1 ? 1 : 0)} ${d.enhet}</td><td class="soft">${d.mat}</td><td class="mono" style="font-size:11.5px">${stasjon(d.stasjon)?.navn || 'Bestilt'}</td><td class="mono faint" style="font-size:11px">${d.fil}</td></tr>`).join('');
    const valgt = D.deler.find((d) => d.id === S.valgtDel) || D.deler[2];
    const prosesser = [
      ['Tegning (Staircon)', 'NT-PRO-001 · v8', p.status === 'tegning' ? 'na' : ['ordre'].includes(p.status) ? '' : 'ferdig'],
      ...(p.tillegg.includes('dekktrinn') ? [['Dekktrinn-bestilling', 'Tirsdag uke 42 · DXF ' + (p.kalk === 58609 ? 'mangler' : 'i mappen'), p.kalk === 58609 ? 'na' : 'ferdig']] : []),
      ...(p.tillegg.includes('glass') ? [['Glassbestilling', 'Mål fra tegning → leverandør', 'na']] : []),
      ['Overflatelapp', fargeTekst(p).replace(/<[^>]+>/g, ''), ['produksjon', 'overflate', 'pakking'].includes(p.status) ? 'ferdig' : ''],
      ['Pakking og plukkliste', 'Møtepunkt for alle deler', p.status === 'pakking' ? 'na' : ferdigAlt(p) ? 'ferdig' : ''],
      ...(p.tillegg.includes('montering') ? [['Monteringsmanual', 'Mal: ' + p.type + ' · QR på pakken', '']] : []),
    ];
    const logg = [
      ['09.10 07:42', 'AN', 'Startet Reichenbacher · vanger'], ['08.10 15:10', 'OL', 'Produksjonsordre sendt til produksjon'], ['08.10 14:55', 'OL', 'Tegning ferdig · kontroll 24/24 felt OK'],
      ['07.10 09:20', 'KR', 'Ordrebekreftelse akseptert av kunde'], ['02.10 11:03', 'KR', 'Tilbud rev. C akseptert'],
    ];
    return `<a class="tilbake" href="#/prosjekter">‹ Prosjekter</a>
      <div class="card prosjekthode" style="margin:10px 0 14px"><div style="display:grid;gap:10px"><span class="label">${kat(p.kat).navn} · ${p.type} · ${p.treslag}</span><h1>${nrTekst(p)}</h1>
        <span class="soft">${esc(p.kunde)} · ${sted}</span><div class="chips">${statusChip(p)}${bufferChip(p)}<span class="chip ingen">${fargeprove(p).replace('fargeprove', 'fargeprove" style="width:12px;height:12px;border-radius:3px;display:inline-block;background:' + (farge(p.farge)?.hex || 'transparent') + '"')}${farge(p.farge)?.navn || 'Farge ikke avklart'}</span><span class="chip bla">Tegner ${bruker(p.tegner).navn}</span><span class="chip">Levering ${dato(p.lev)}</span></div></div>
        <div style="display:grid;gap:8px;justify-items:end">${qr(nrTekst(p))}<span class="label">Prosjekt-QR</span></div></div>
      <div class="rutenett">
        <section class="card blokk s12"><div class="blokk-hode"><h2>Delene gjennom fabrikken</h2><span class="faint" style="font-size:12px">Hver del går sitt eget spor og møtes i pakking. Stasjonene trykker «Ferdig» og delen går videre.</span></div>${sporVisning(p)}</section>
        <section class="card blokk s7"><div class="blokk-hode"><h2>Deleliste</h2><button class="btn liten" data-h="ikke-i-mockup">Skriv ut plukkliste</button></div><div class="tabellramme"><table class="tabell delliste"><thead><tr><th>Del</th><th class="tall">Antall</th><th>Materiale</th><th>Stasjon</th><th>Fil</th></tr></thead><tbody>${delRader}</tbody></table></div></section>
        <section class="card blokk s5"><div class="blokk-hode"><h2>3D-visning</h2><span class="chip ingen">.dae fra Staircon</span></div><div class="tredje">${trapp3d()}<div class="info"><span class="chip bla">${valgt.navn}</span><span class="mono faint" style="font-size:11px">${valgt.fil}</span></div></div><span class="faint" style="font-size:12px">Klikk en del i modellen eller i listen. I systemet vises Staircon-eksporten (COLLADA/IFC) fra prosjektmappen på serveren.</span></section>
        <section class="card blokk s4"><h2>Prosesser i prosjektet</h2><div class="prosess">${prosesser.map(([t, s, k], i) => `<div class="prosess-steg ${k}"><span class="pr">${k === 'ferdig' ? '✓' : i + 1}</span><div><strong>${t}</strong><span>${s}</span></div></div>`).join('')}</div></section>
        <section class="card blokk s4"><h2>Overflate</h2><dl class="detalj"><dt>Behandling</dt><dd>${ofl(p.ofl).navn}</dd><dt>Fargekode</dt><dd>${farge(p.farge) ? farge(p.farge).nr + ' · ' + farge(p.farge).navn : '<b style="color:var(--accent)">Ikke avklart</b>'}</dd><dt>Stasjon</dt><dd>${stasjon(overflateStasjon(p))?.navn || '—'}</dd><dt>Pulje</dt><dd>${farge(p.farge) ? 'Lakk uke ' + (uke(IDAG) + 1) + ' sammen med 2 andre' : '—'}</dd></dl><button class="btn liten" data-h="lapp" style="justify-self:start">Skriv ut overflatelapp</button></section>
        <section class="card blokk s4"><h2>Logg</h2><div style="display:grid;gap:6px;font-size:13px">${logg.map(([t, b, x]) => `<div><span class="mono faint" style="font-size:11px">${t} · ${b}</span><div>${x}</div></div>`).join('')}</div></section>
      </div>`;
  }

  /* ═════════════ DEKKTRINN ═════════════ */
  function dekktrinnTabell(kort = false) {
    const ps = D.prosjekter.filter((p) => p.tillegg.includes('dekktrinn') && !ferdigAlt(p));
    return `<table class="tabell"><thead><tr><th>Prosjekt</th>${kort ? '' : '<th>Kunde</th><th>Antall</th>'}<th>DXF</th><th>Status</th></tr></thead><tbody>${ps.map((p) => {
      const mangler = [58609, 58612].includes(p.kalk);
      return `<tr><td>${nr(p)}</td>${kort ? '' : `<td>${esc(p.kunde)}</td><td class="tall">14 stk</td>`}<td class="mono" style="font-size:12px">${p.kalk}-${String(p.pos).padStart(2, '0')}.dxf</td><td>${mangler ? '<span class="chip fare">Mangler</span>' : '<span class="chip ok">I mappen</span>'}</td></tr>`;
    }).join('')}</tbody></table>`;
  }
  function vDekktrinn() {
    const steg = [
      ['Ukemappe opprettet automatisk', 'M:\\NT-System\\Dekktrinn\\2026\\Uke 42\\', 'ferdig'],
      ['Eksporter DXF fra Staircon for hvert prosjekt', 'Filnavn = prosjektnummer, f.eks. 58601-01.dxf', 'na'],
      ['Kontroller listen — alle filer på plass', 'Systemet sjekker mappen hvert minutt', ''],
      ['Legg mappen i Dropbox', 'Kopieres til den synkroniserte Dropbox-mappen på serveren', ''],
      ['Send bestilling til leverandør', 'E-post med lenke + antall per prosjekt', ''],
      ['Kvitter ut', 'Prosjektene får «Dekktrinn bestilt» i loggen', ''],
    ];
    return hode('Gjentakende prosess · hver tirsdag', 'Dekktrinn&shy;bestilling', 'Blir rød tirsdag 08:00. Ansvarlig: OL eller Roger. Tar 30–90 min. Prosessen er laget i NT-Arkivet og kan endres der.',
      '<span class="chip fare">Frist tir 13. okt 08:00</span><button class="btn primar" data-h="dekk-ferdig">Kvitter ut</button>') +
      `<div class="rutenett"><section class="card blokk s5"><h2>Steg</h2><div class="prosess">${steg.map(([t, s, k], i) => `<div class="prosess-steg ${k}"><span class="pr">${k === 'ferdig' ? '✓' : i + 1}</span><div><strong>${t}</strong><span class="mono" style="font-size:11.5px">${s}</span></div></div>`).join('')}</div></section>
      <section class="card blokk s7"><div class="blokk-hode"><h2>Overvåking av ukemappen</h2><span class="chip varsel">2 mangler</span></div>${dekktrinnTabell()}
        <div class="notis fare">58609-01 og 58612-01 mangler DXF. 58612 venter på godkjent tegning — flyttes automatisk til neste uke hvis den ikke er klar tirsdag 08:00.</div>
        <dl class="detalj"><dt>Ukemappe</dt><dd class="mono">M:\\NT-System\\Dekktrinn\\2026\\Uke 42\\</dd><dt>Dropbox</dt><dd class="mono">D:\\Dropbox\\Nortrapp Dekktrinn\\Uke 42\\ <span class="chip varsel">ikke kopiert</span></dd><dt>Ansvarlig</dt><dd>Oddgeir (OL) · reserve Roger (RO)</dd></dl></section></div>`;
  }

  /* ═════════════ PRODUKSJON ═════════════ */
  function vFabrikk() {
    const rader = D.stasjoner.map((s) => `<tr class="klikk" data-gaa="stasjon/${s.id}"><td>${s.navn}</td><td class="soft">${s.sone}</td><td class="tall">${s.kap}</td><td><div class="beholdning"><div class="bar"><i class="${s.last > 1 ? 'lav' : ''}" style="width:${Math.min(100, s.last * 100)}%;${s.last > 0.85 && s.last <= 1 ? 'background:var(--warn)' : ''}"></i></div><span class="mono" style="font-size:11.5px">${Math.round(s.last * 100)} %</span></div></td><td class="tall">${s.normtid ? tall(s.normtid, 1) + ' ' + s.enhet : '—'}</td></tr>`).join('');
    return hode('Produksjon', 'Fabrikken', 'Fabrikkens plantegning med stasjonene. Dra stasjoner for å endre layout, klikk for stasjonsskjermen. Simuleringen viser hva som skjer med køene hvis du flytter folk eller tar inn en hasteordre.',
      '<button class="btn" data-h="ikke-i-mockup">Rediger layout</button><button class="btn" data-h="simuler">Simuler hasteordre</button>') +
      `<div class="rutenett"><section class="card blokk s12">${fabrikkSvg({ stor: true })}</section>
      <section class="card blokk s12"><div class="tabellramme"><table class="tabell"><thead><tr><th>Stasjon</th><th>Sone</th><th class="tall">Folk</th><th>Belastning uke ${uke(IDAG)}</th><th class="tall">Normtid</th></tr></thead><tbody>${rader}</tbody></table></div></section></div>`;
  }

  function koFor(sid) {
    const alle = [];
    for (const p of aktive()) {
      if (sid === 'tegning') { if (['tegning', 'ordre'].includes(p.status)) alle.push({ p, del: 'Tegning', na: p.status === 'tegning' }); continue; }
      sporFor(p).forEach((sp, i) => {
        sp.stopp.forEach((s, j) => {
          if (stoppStasjon(p, s) !== sid) return;
          const v = p.spor[i];
          if (j === v || j === v + 1) alle.push({ p, del: sp.del, na: j === v });
        });
      });
    }
    // Hast først, så minst buffer, så farge (puljer på lakk).
    return alle.filter((x) => !S.ferdigMeldt.includes(pid(x.p) + x.del)).sort((a, b) => (b.p.haster - a.p.haster) || (b.na - a.na) || (a.p.buffer - b.p.buffer));
  }

  function vStasjon(sid) {
    const s = stasjon(sid) || stasjon('lakk');
    const ko = koFor(s.id);
    const naa = ko[0];
    const b = bruker(S.bruker);
    const erLakk = s.id === 'lakk';
    let puljer = '';
    if (erLakk) {
      const grupper = {};
      for (const k of ko) (grupper[k.p.farge ?? 'x'] ??= []).push(k);
      puljer = `<section class="card blokk"><div class="blokk-hode"><h2>Fargepuljer</h2><span class="faint" style="font-size:12px">Leveringsdato styrer · samme farge samles så lenge bufferen tåler det</span></div>${Object.entries(grupper).map(([f, l]) => {
        const fk = farge(+f);
        return `<div class="pulje"><div class="blokk-hode"><span style="display:flex;gap:10px;align-items:center">${fargeprove(l[0].p)}<b>${fk ? fk.navn : 'Farge ikke avklart'}</b></span><span class="chip ${fk ? '' : 'fare'}">${l.length} deler</span></div><span class="soft" style="font-size:12.5px">${l.map((x) => `${x.p.kalk}-${String(x.p.pos).padStart(2, '0')} ${x.del.toLowerCase()}`).join(' · ')}</span></div>`;
      }).join('')}</section>`;
    }
    const sd = [
      ['1', ko[0] ? String(ko[0].p.kalk).slice(-2) : '—', 'bla'], ['2', ko[1] ? String(ko[1].p.kalk).slice(-2) : '—', ''], ['3', ko[2] ? String(ko[2].p.kalk).slice(-2) : '—', ''], ['4', ko[3] ? String(ko[3].p.kalk).slice(-2) : '—', ''], ['', 'Neste', ''],
      ['▶', 'Start', 'gronn'], ['❚❚', 'Pause', 'gul'], ['✓', 'Ferdig', 'gronn'], ['!', 'Avvik', 'rod'], ['', 'Tegning', 'bla'],
      ['', 'Overfl.lapp', ''], ['', 'Plukk&shy;liste', ''], ['?', 'Hjelp', ''], ['', 'Bytt bruker', 'bla'], ['', 'Stopp dag', 'rod'],
    ];
    return hode(`Stasjonsskjerm · ${s.sone}`, s.navn, `Pålogget: <b>${b.navn}</b> · mini-PC + skjerm ved stasjonen · Stream Deck for «Start / Ferdig» uten berøring.`,
      `<select class="inp" data-h="velg-stasjon">${D.stasjoner.map((x) => `<option value="${x.id}" ${x.id === s.id ? 'selected' : ''}>${x.navn}</option>`).join('')}</select><button class="btn" data-h="pin">Bytt bruker</button>`) +
      `<div class="stasjonsskjerm"><div style="display:grid;gap:14px;align-content:start">
        ${naa ? `<section class="card naa"><div class="blokk-hode"><span class="label">Nå · ${naa.del}</span>${bufferChip(naa.p)}</div>
          <h2>${String(naa.p.kalk).padStart(6, '0')}-${String(naa.p.pos).padStart(2, '0')}</h2>
          <div class="chips"><span class="chip ingen">${naa.p.type}</span><span class="chip ingen">${naa.p.treslag}</span><span class="chip ingen">${fargeTekst(naa.p).replace(/<[^>]+>/g, '')}</span><span class="chip">${esc(naa.p.kunde)}</span></div>
          <div class="blokk-hode"><div><span class="label">Tid på jobben</span><div class="tidtaker" id="tidtaker">00:00:00</div></div><div style="text-align:right"><span class="label">Normtid</span><div class="dot" style="font-size:28px">${tall(s.normtid || 1, 1)} t</div><span class="faint" style="font-size:12px">snitt siste 30: ${tall((s.normtid || 1) * 1.08, 1)} t</span></div></div>
          <div class="store-knapper"><button class="btn" data-h="start">${S.timerStart ? 'Pågår …' : '▶ Start'}</button><button class="btn" data-h="pause">❚❚ Pause</button><button class="btn ok" data-h="ferdig">✓ Ferdig → ${naa.del === 'Tegning' ? 'Produksjon' : 'neste'}</button></div>
          <div class="knapper"><button class="btn liten" data-h="avvik">Meld avvik</button><button class="btn liten" data-gaa-knapp="prosjekt/${pid(naa.p)}">Tegning og deleliste</button>${erLakk ? '<button class="btn liten" data-h="lapp">Skriv overflatelapp</button>' : ''}</div></section>`
        : '<section class="card blokk tom">Ingen jobber i køen.</section>'}
        ${puljer}
      </div>
      <div style="display:grid;gap:14px;align-content:start">
        <section class="card blokk"><div class="blokk-hode"><h2>Kø</h2><span class="faint" style="font-size:12px">Hast → buffer → farge</span></div><div class="ko">${ko.slice(1).map((k) => `<div class="ko-kort ${k.p.haster ? 'haster' : ''}">${fargeprove(k.p)}<div><b class="mono">${k.p.kalk}-${String(k.p.pos).padStart(2, '0')}</b> <span class="soft">· ${k.del}</span><div class="faint" style="font-size:12px">${k.na ? 'Klar her nå' : 'Kommer fra forrige stasjon'} · lev. ${dato(k.p.lev)}</div></div>${bufferChip(k.p)}</div>`).join('') || '<span class="faint">Tom</span>'}</div></section>
        <section><span class="label">Stream Deck 15 · forslag til oppsett</span><div class="streamdeck" style="margin-top:6px">${sd.map(([b, t, k]) => `<div class="sd ${k}"><span>${b ? `<b>${b}</b>` : ''}${t}</span></div>`).join('')}</div></section>
      </div></div>`;
  }

  function vPlan() {
    const u0 = uke(IDAG);
    const rader = D.stasjoner.filter((s) => s.normtid).map((s) => `<div class="kap-rad" style="grid-template-columns:150px 90px repeat(6,1fr)"><span>${s.navn}</span><input class="inp" style="width:80px" value="${tall(s.normtid, 1)}" title="Normtid ${s.enhet}">${Array.from({ length: 6 }, (_, i) => {
      const v = Math.max(0.15, Math.min(1.3, s.last + [0, -0.06, 0.08, -0.22, -0.35, -0.45][i] + (s.id === 'gelender' && i === 1 ? 0.12 : 0)));
      return `<div class="kap-celle ${v > 1 ? 'full' : v > 0.85 ? 'hoy' : ''}"><i style="width:${Math.min(100, v * 100)}%"></i><span>${Math.round(v * 100)}</span></div>`;
    }).join('')}</div>`).join('');
    const buffere = [['Tegning → fres', 1], ['Fres → puss', 1], ['Gelender', 2], ['Puss → overflate', 1], ['Overflate → pakking', 1], ['Pakking → transport', 1]];
    return hode('Produksjon', 'Kapasitet og normtider', 'Normtider kan justeres her. Systemet foreslår nye normtider fra faktisk start/stopp på stasjonene — du godkjenner.',
      '<button class="btn primar" data-h="lagret">Lagre</button>') +
      `<div class="rutenett"><section class="card blokk s8"><div class="kap"><div class="kap-rad" style="grid-template-columns:150px 90px repeat(6,1fr)"><span class="label">Stasjon</span><span class="label">Normtid (t)</span>${Array.from({ length: 6 }, (_, i) => `<span class="label">Uke ${u0 + i}</span>`).join('')}</div>${rader}</div></section>
      <div class="s4" style="display:grid;gap:14px;align-content:start">
        <section class="card blokk"><h2>Buffer per ledd (arbeidsdager)</h2><table class="tabell"><tbody>${buffere.map(([n, d]) => `<tr><td>${n}</td><td class="tall"><input class="inp" style="width:56px;text-align:right" value="${d}"></td></tr>`).join('')}</tbody></table></section>
        <section class="card blokk"><h2>Systemet har lært</h2><div class="notis">Gelender på <b>halvsvingt i eik</b> tar i snitt <b>7,1 t</b> (normtid 6 t) over de 12 siste. <button class="btn liten" data-h="lagret">Bruk 7,1 t</button></div><div class="notis">Lakk: puljer med samme farge sparer i snitt 35 min per trapp.</div></section>
      </div></div>`;
  }

  function vRessurser() {
    const st = D.stasjoner.filter((s) => !['transport', 'tegning'].includes(s.id));
    const pers = Object.keys(D.kompetanse);
    const matrise = `<table class="tabell matrise"><thead><tr><th>Person</th>${st.map((s) => `<th style="writing-mode:vertical-rl;transform:rotate(180deg);height:110px">${s.navn}</th>`).join('')}</tr></thead><tbody>${pers.map((id) => `<tr><td>${bruker(id).navn} <span class="faint mono" style="font-size:11px">${id}</span></td>${st.map((s) => { const n = D.kompetanse[id][s.id] || 0; return `<td class="niva"><span class="niva-celle ${n ? 'n' + n : ''}" data-niva="${id}:${s.id}">${n || '·'}</span></td>`; }).join('')}</tr>`).join('')}</tbody></table>`;
    const bem = `<table class="tabell"><thead><tr><th>Person</th>${D.dager.map((d) => `<th>${d}</th>`).join('')}</tr></thead><tbody>${Object.entries(D.bemanning).map(([id, dager]) => `<tr><td>${bruker(id).navn}</td>${dager.map((s, i) => `<td class="dag-celle ${s === 'syk' ? 'syk' : ''}"><select data-bem="${id}:${i}"><option value="syk" ${s === 'syk' ? 'selected' : ''}>Syk / fri</option>${D.stasjoner.filter((x) => D.kompetanse[id][x.id]).map((x) => `<option value="${x.id}" ${x.id === s ? 'selected' : ''}>${x.navn}</option>`).join('')}</select></td>`).join('')}</tr>`).join('')}</tbody></table>`;
    return hode('Produksjon', 'Bemanning og kompetanse', 'Simen flytter folk mellom stasjoner her. Rullegardinene viser bare stasjoner personen kan. Kapasiteten og leveringstidene regnes på nytt med en gang.', '') +
      `<div class="rutenett"><section class="card blokk s12"><div class="blokk-hode"><h2>Bemanning uke ${uke(IDAG) + 1}</h2><span class="chip fare">Gelender 104 % torsdag</span></div><div class="tabellramme">${bem}</div>
        <div class="notis fare">Jonas er syk torsdag. Forslag: flytt <b>Ingrid</b> (gelender nivå 1) fra kantpuss trinn, eller la <b>Petter</b> ta gelender fredag og skyv barnesikring til mandag (58601 har 3 dager buffer). <button class="btn liten" data-h="lagret">Bruk forslag 2</button></div></section>
      <section class="card blokk s12"><div class="blokk-hode"><h2>Kompetansematrise</h2><span class="faint" style="font-size:12px">Klikk for å endre: 1 = under opplæring · 2 = selvstendig · 3 = kan lære opp</span></div><div class="tabellramme">${matrise}</div></section></div>`;
  }

  /* ═════════════ VARER OG LAGER ═════════════ */
  const TYPENAVN = { ravare: 'Råvare', skaffevare: 'Skaffevare', lagervare: 'Lagervare' };
  function vVarer() {
    const f = S.varefilter;
    const liste = D.varer.filter((v) => f === 'alle' || v.type === f);
    const rader = liste.map((v) => {
      const lav = v.beh != null && v.beh < v.min;
      const beh = v.beh == null ? '<span class="faint" style="font-size:12px">Bestilles per ordre</span>' : `<div class="beholdning"><div class="bar"><i class="${lav ? 'lav' : ''}" style="width:${Math.min(100, (v.beh / (v.min * 2)) * 100)}%"></i></div><span class="mono" style="font-size:11.5px">${tall(v.beh)} / min ${v.min}</span></div>`;
      return `<tr><td class="mono">${v.nr}</td><td>${esc(v.navn)}<div class="faint" style="font-size:12px">${esc(v.lev)} · ${v.ledetid} d</div></td>
        <td><select class="inp" data-type="${v.nr}">${Object.entries(TYPENAVN).map(([k, n]) => `<option value="${k}" ${k === v.type ? 'selected' : ''}>${n}</option>`).join('')}</select></td>
        <td><select class="inp" data-enhet="${v.nr}">${D.enheter.map((e) => `<option ${e === v.enhet ? 'selected' : ''}>${e}</option>`).join('')}</select></td>
        <td class="tall">${kr(v.kjop)}</td><td style="min-width:170px">${beh}</td><td>${lav ? '<button class="btn liten" data-h="bestill">Bestill</button>' : ''}</td></tr>`;
    }).join('');
    const ant = (t) => D.varer.filter((v) => v.type === t).length;
    return hode('Lager', 'Varer og lager', 'Hver vare er <span class="type ravare">Råvare</span>, <span class="type skaffevare">Skaffevare</span> eller <span class="type lagervare">Lagervare</span>. Typen kan endres når som helst, og enheten velges fritt.',
      '<button class="btn" data-h="varetelling">Varetelling</button><button class="btn primar" data-h="ny-vare">+ Ny vare</button>') +
      `<div class="rutenett">
        <div class="card kpi s4"><span class="label"><span class="type ravare">Råvare</span></span><span class="tall">${ant('ravare')}</span><span class="soft">Lagerføres, forbrukes i produksjonen (plater, lakk, olje). Materialkontroll ved store ordre.</span></div>
        <div class="card kpi s4"><span class="label"><span class="type skaffevare">Skaffevare</span></span><span class="tall">${ant('skaffevare')}</span><span class="soft">Lagerføres ikke. Bestilles per trapp (dekktrinn, glass). Ledetiden legges inn i leveringstiden.</span></div>
        <div class="card kpi s4"><span class="label"><span class="type lagervare">Lagervare</span></span><span class="tall">${ant('lagervare')}</span><span class="soft">Ferdige standardvarer på hylla. Plukkes til pakking. Minimumsnivå gir bestillingsforslag.</span></div>
        <section class="card blokk s12"><div class="blokk-hode"><div class="segmented">${[['alle', 'Alle'], ['ravare', 'Råvare'], ['skaffevare', 'Skaffevare'], ['lagervare', 'Lagervare']].map(([k, n]) => `<button data-filter="${k}" aria-pressed="${k === f}">${n}</button>`).join('')}</div><input class="inp" placeholder="Søk vare …" style="min-width:220px"></div>
        <div class="tabellramme"><table class="tabell"><thead><tr><th>Varenr</th><th>Vare</th><th>Type</th><th>Enhet</th><th class="tall">Innkjøp</th><th>Beholdning</th><th></th></tr></thead><tbody>${rader}</tbody></table></div></section>
        <section class="card blokk s6"><h2>Materialkontroll · neste 4 uker</h2><div class="tabellramme"><table class="tabell"><thead><tr><th>Vare</th><th class="tall">Behov</th><th class="tall">Lager</th><th class="tall">Bestilt</th><th></th></tr></thead><tbody>
          <tr><td>Eikeplate 42 mm</td><td class="tall">47 m²</td><td class="tall">38 m²</td><td class="tall">0</td><td><span class="chip fare">−9 m²</span></td></tr>
          <tr><td>Askeplate 42 mm</td><td class="tall">6 m²</td><td class="tall">22 m²</td><td class="tall">0</td><td><span class="chip ok">OK</span></td></tr>
          <tr><td>Hardvoksolje</td><td class="tall">7 l</td><td class="tall">9 l</td><td class="tall">0</td><td><span class="chip varsel">Under min</span></td></tr></tbody></table></div></section>
        <section class="card blokk s6"><h2>Slik virker typebytte</h2><div class="notis"><b>Råvare → Skaffevare:</b> beholdning frosset og vist som «restlager». Nye ordre lager en bestilling per trapp, og ledetiden legges i leveringstiden.</div><div class="notis"><b>Skaffevare → Lagervare:</b> du setter minimumsnivå og startbeholdning; varen dukker opp i plukklister.</div><div class="notis">Alle bytter logges med hvem og når, og gamle ordre beholder typen de ble laget med.</div></section>
      </div>`;
  }

  /* ═════════════ LOGISTIKK ═════════════ */
  function vLogistikk() {
    const grupper = {};
    for (const p of D.prosjekter.filter((x) => ['pakking', 'overflate', 'produksjon'].includes(x.status))) (grupper[fh(p.fh).avd ?? 0] ??= []).push(p);
    const avd = Object.entries(grupper).map(([a, ps]) => {
      const an = D.avdelinger.find((x) => x.nr === +a);
      return `<section class="card blokk s4"><div class="blokk-hode"><h2>${a} · ${an ? an.navn : 'Direkte'}</h2><span class="chip">${ps.length}</span></div>${ps.map((p) => `<div class="ko-kort ${p.haster ? 'haster' : ''}">${fargeprove(p)}<div>${nr(p)}<div class="faint" style="font-size:12px">${esc(p.kunde)} · ${dato(p.lev)}</div></div>${statusChip(p)}</div>`).join('')}</section>`;
    }).join('');
    const p = finnP('58607-1');
    return hode('Logistikk', 'Pakking og transport', 'Alle deler møtes i pakking. Plukklisten viser hva som må være på plass, og hva som hentes fra lager. Transport planlegges per avdeling.', '<button class="btn" data-h="ikke-i-mockup">Transportplan uke 42</button>') +
      `<div class="rutenett">${avd}
        <section class="card blokk s6"><div class="blokk-hode"><h2>Plukkliste · ${nrTekst(p)}</h2><span class="chip fare">Pakkes i dag</span></div><table class="tabell"><tbody>
          ${[['Vanger (2)', 'Fra puss', true], ['Trinn 1–13', 'Fra lakk', true], ['Håndløper + stolper', 'Fra gelender', true], ['Håndløperbrakett × 6', 'Lager L-3001', false], ['Trappeskrue 1 pk', 'Lager L-3003', false], ['Sklisikring 1 rull', 'Lager L-3004', true], ['Monteringsmanual + QR', 'Skrives ut', false]].map(([n, s, ok]) => `<tr><td><input type="checkbox" ${ok ? 'checked' : ''}> ${n}</td><td class="soft">${s}</td></tr>`).join('')}</tbody></table></section>
        <section class="card blokk s6"><h2>Monteringsmanual</h2><div style="display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:center">${qr('manual-' + nrTekst(p))}<div><b>${p.type} · ${p.treslag}</b><p class="soft" style="font-size:13px">Mal per trappetype og variant. QR-koden på pakken går til en offentlig side med manualen for akkurat denne trappen (uten kundedata).</p><div class="chips" style="margin-top:8px"><span class="chip ok">Mal: rett trapp v3</span><span class="chip">+ barnesikring</span></div></div></div></section>
      </div>`;
  }

  /* ═════════════ ØKONOMI ═════════════ */
  function vOkonomi() {
    const etter = D.prosjekter.slice(0, 6).map((p, i) => {
      const kalkT = [22, 14, 28, 6, 9, 31][i], fakt = [24.5, 13, 30, 6.5, 9.4, 0][i];
      const db = [42.1, 44.8, 39.2, 40.5, 38.9, null][i];
      return `<tr><td>${nr(p)}</td><td>${esc(p.kunde)}</td><td class="tall">${kr(p.verdi)}</td><td class="tall">${kalkT} t</td><td class="tall">${fakt ? tall(fakt, 1) + ' t' : '—'}</td><td class="tall" style="color:${fakt > kalkT ? 'var(--accent)' : 'var(--ok)'}">${fakt ? (fakt > kalkT ? '+' : '') + tall(fakt - kalkT, 1) : '—'}</td><td class="tall">${db ? tall(db, 1) + ' %' : '—'}</td></tr>`;
    }).join('');
    const prov = D.forhandlere.filter((f) => f.prov).slice(0, 6).map((f, i) => `<tr><td>${f.nr} · ${f.navn}</td><td class="tall">${kr([84000, 112000, 61000, 140000, 45000, 92000][i])}</td><td class="tall">${kr([12600, 16800, 9150, 21000, 5400, 13800][i])}</td><td>${['<span class="chip ok">Utbetalt</span>', '<span class="chip varsel">Klar</span>', '<span class="chip">Tilgode</span>', '<span class="chip varsel">Klar</span>', '<span class="chip">Tilgode</span>', '<span class="chip ok">Utbetalt</span>'][i]}</td></tr>`).join('');
    return hode('Regnskap · Nina', 'Økonomi', 'Tripletex beholdes. Herfra eksporteres ordre, faktura-grunnlag og bokføringsbilag. API-kobling kan komme senere.',
      '<button class="btn" data-h="ikke-i-mockup">Bokføringsbilag (Excel)</button><button class="btn primar" data-h="tripletex">Eksporter til Tripletex</button>') +
      `<div class="rutenett">
        <div class="card kpi s3"><span class="label">Klar til fakturering</span><span class="tall">3</span><span class="soft">${kr(148800)}</span></div>
        <div class="card kpi s3"><span class="label">Ordrereserve</span><span class="tall">${aktive().length}</span><span class="soft">${kr(aktive().reduce((a, p) => a + p.verdi, 0))}</span></div>
        <div class="card kpi s3"><span class="label">Provisjon klar</span><span class="tall">2</span><span class="soft">${kr(37800)}</span></div>
        <div class="card kpi s3 ok"><span class="label">Snitt DG</span><span class="tall">41,8</span><span class="soft">% siste 30 dager</span></div>
        <section class="card blokk s7"><div class="blokk-hode"><h2>Etterkalkyle</h2><span class="faint" style="font-size:12px">Kalkulerte timer mot faktisk tid fra stasjonene</span></div><div class="tabellramme"><table class="tabell"><thead><tr><th>Prosjekt</th><th>Kunde</th><th class="tall">Salg</th><th class="tall">Kalk.</th><th class="tall">Faktisk</th><th class="tall">Avvik</th><th class="tall">DG</th></tr></thead><tbody>${etter}</tbody></table></div></section>
        <section class="card blokk s5"><h2>Provisjon forhandlere</h2><table class="tabell"><thead><tr><th>Forhandler</th><th class="tall">Omsetning</th><th class="tall">Provisjon</th><th>Status</th></tr></thead><tbody>${prov}</tbody></table></section>
        <section class="card blokk s12"><h2>Eksport til Tripletex</h2><table class="tabell"><thead><tr><th></th><th>Ordre</th><th>Kunde</th><th class="tall">Beløp</th><th>Prosjektnr i Tripletex</th></tr></thead><tbody>
          ${D.prosjekter.filter((p) => ['pakking', 'levert'].includes(p.status)).map((p) => `<tr><td><input type="checkbox" checked></td><td>${nr(p)}</td><td>${esc(p.kunde)}</td><td class="tall">${kr(p.verdi)}</td><td class="mono">${p.kalk}-${String(p.pos).padStart(2, '0')}</td></tr>`).join('')}</tbody></table></section>
      </div>`;
  }

  /* ═════════════ ETTERMARKED ═════════════ */
  function vEttermarked() {
    const levert = D.prosjekter.filter(ferdigAlt);
    return hode('Ettermarked', 'Ettermarked', 'Søk opp en levert trapp på nummer, kunde eller adresse og se nøyaktig farge, overflate og deler. Reklamasjon og etterbestilling får samme nummer med R1, R2 ….', '<button class="btn primar" data-h="reklamasjon">+ Ny reklamasjon</button>') +
      `<div class="rutenett"><section class="card blokk s12"><input class="inp" style="font-size:18px;padding:12px 16px" placeholder="Søk: 58598, Kvamme, Lier …"></section>
      ${levert.map((p) => `<section class="card blokk s6"><div class="blokk-hode"><div>${nr(p)}<h2 style="margin-top:4px">${esc(p.kunde)} · ${esc(p.sted)}</h2></div>${statusChip(p)}</div>
        <dl class="detalj"><dt>Produkt</dt><dd>${p.type} · ${p.treslag}</dd><dt>Overflate</dt><dd>${ofl(p.ofl).navn}</dd><dt>Fargekode</dt><dd style="display:flex;gap:8px;align-items:center">${fargeprove(p)} ${farge(p.farge)?.nr} · ${farge(p.farge)?.navn}</dd><dt>Levert</dt><dd>${dato(p.lev, { year: 'numeric' })}</dd><dt>FDV</dt><dd><span class="chip ok">FDV · ${ofl(p.ofl).navn}</span></dd></dl>
        <div class="knapper"><button class="btn liten" data-h="ikke-i-mockup">Etterbestill farge</button><button class="btn liten" data-gaa-knapp="prosjekt/${pid(p)}">Åpne prosjekt</button></div></section>`).join('')}</div>`;
  }

  /* ═════════════ SYSTEM ═════════════ */
  function vArkivet() {
    const pr = [
      ['NT-PRO-001', 'Tegning i Staircon', 'Tegning', 'v8 · med «Delt bjelkelagsåpning»'], ['NT-PRO-002', 'Dekktrinn-bestilling', 'Tegning', 'Gjentakende · tirsdag 08:00'],
      ['NT-PRO-003', 'Salg: henvendelse til ordre', 'Salg', 'Steg i NT-Kalk'], ['NT-PRO-004', 'Overflatelapp', 'Overflate', 'Fra OB · kvittering valgfri'],
      ['NT-PRO-005', 'Pakking og plukkliste', 'Logistikk', 'Møtepunkt for delene'], ['NT-PRO-006', 'Reklamasjon', 'Ettermarked', 'R1, R2 …'], ['NT-PRO-007', 'Glassbestilling', 'Tegning', 'Utløses av tilvalg'],
    ];
    return hode('Modul', 'NT-Arkivet', 'NT-Arkivet blir prosessmotoren i NT-System. Alle prosesser kan legges til, flyttes, endres og fjernes — med versjoner, maler og T-banekart som i dag.', '<button class="btn primar" data-h="ikke-i-mockup">Åpne prosessredigering</button>') +
      `<section class="card blokk"><table class="tabell"><thead><tr><th>ID</th><th>Prosess</th><th>Avdeling</th><th>Merknad</th></tr></thead><tbody>${pr.map(([a, b, c, d]) => `<tr><td class="mono">${a}</td><td>${b}</td><td><span class="chip ingen">${c}</span></td><td class="soft">${d}</td></tr>`).join('')}</tbody></table></section>`;
  }

  function vInnstillinger() {
    return hode('System', 'Innstillinger', 'Alt kan redigeres: kategorier, avdelinger, roller, stasjoner, nummerering. Endringer logges.', '') +
      `<div class="rutenett">
        <section class="card blokk s6"><h2>Nummerering</h2><div class="skjema"><label class="felt"><span>Kalkylenr (løpende)</span><input value="058617"></label><label class="felt"><span>Posisjon</span><input value="01"></label><label class="felt"><span>Kategori</span><select>${D.kategorier.map((k) => `<option>${k.kode} · ${k.navn}</option>`).join('')}</select></label><label class="felt"><span>Produksjon (ååmm)</span><input value="2611"></label></div>
          <div class="notis"><span class="dot" style="font-size:22px">058617-01-TRA · P2611</span><br><span class="soft" style="font-size:12.5px">Tilbudsrevisjon: 058617-B · Reklamasjon: 058617-01-TRA-R1 · Mappenavn: <span class="mono">2026\\058617-01-TRA Kundenavn</span></span></div></section>
        <section class="card blokk s6"><h2>Kategorier</h2><table class="tabell"><tbody>${D.kategorier.map((k) => `<tr><td class="mono">${k.kode}</td><td>${k.navn}</td><td class="soft">Spor: ${k.spor}</td></tr>`).join('')}</tbody></table><button class="btn liten" data-h="ikke-i-mockup" style="justify-self:start">+ Kategori</button></section>
        <section class="card blokk s6"><h2>Avdelingskoder</h2><table class="tabell"><tbody>${D.avdelinger.map((a) => `<tr><td class="mono">${a.nr}</td><td>${a.navn}</td></tr>`).join('')}</tbody></table></section>
        <section class="card blokk s6"><h2>Roller og standard-dashbord</h2><table class="tabell"><tbody>${D.roller.map((r) => `<tr><td>${r.navn}</td><td class="soft" style="font-size:12px">${r.widgets.map((w) => WIDGETS.find((x) => x[0] === w)[1]).join(' · ')}</td></tr>`).join('')}</tbody></table></section>
        <section class="card blokk s12"><h2>Brukere</h2><div class="brukere">${D.brukere.map((b) => `<button><b>${b.id}</b><span>${b.navn}</span><span class="faint">${b.avd}</span></button>`).join('')}</div></section>
      </div>`;
  }

  function vLagring() {
    const tre = `M:\\NT-System\\
├─ data\\            innstillinger, brukere, varer, priser (JSON)
├─ prosesser\\       NT-PRO-001.json … (NT-Arkivet)
├─ prosjekter\\2026\\
│  └─ 058612-01-TRA Familien Dahl\\
│     ├─ prosjekt.json   logg.txt
│     ├─ dokumenter\\    OB, PO, Planview, måleskisse
│     ├─ tegning\\       .dae  .ifc  .dxf per del
│     └─ produksjon\\    start/stopp per stasjon
├─ dekktrinn\\2026\\Uke 42\\
├─ manualer\\        maler + publiserte manualer
└─ backup\\          nt-system-ÅÅÅÅ-MM-DD.zip (30 dager)`;
    return hode('System', 'Lagring og backup', 'Samme prinsipp som NT-Arkivet: alt ligger som lesbare filer på M:. Et lite serverprogram på Ntrapp-App-01 gir stasjonsskjermer og forhandlere (VPN) tilgang uten at de trenger mappetilgang.', '<button class="btn primar" data-h="backup">Ta full backup nå</button>') +
      `<div class="rutenett"><section class="card blokk s7"><h2>Mappestruktur på serveren</h2><pre class="mono" style="margin:0;white-space:pre;overflow-x:auto;font-size:12.5px;line-height:1.6">${esc(tre)}</pre></section>
      <section class="card blokk s5"><h2>Sikring</h2><dl class="detalj"><dt>Server</dt><dd>Ntrapp-App-01 · <span class="chip ok">tilkoblet</span></dd><dt>Daglig kopi</dt><dd>i natt 02:00 · 30 dager</dd><dt>Siste full</dt><dd>07.10.2026 16:02 · OL</dd><dt>Papirkurv</dt><dd>3 elementer · 30 dager</dd><dt>IT-backup</dt><dd>M: tas med i firmaets backup</dd></dl></section></div>`;
  }

  /* ── Modaler ─────────────────────────────────────────── */
  let pinSiffer = '';
  let pinValgt = S.bruker;
  function modal(innhold) { $('#modal-rot').innerHTML = `<div class="modal-bak" data-h="lukk-bak"><div class="card modal">${innhold}</div></div>`; }
  function lukk() { $('#modal-rot').innerHTML = ''; }
  function pinModal() {
    modal(`<span class="label">Bytt bruker</span><h2>Hvem er du?</h2><div class="brukere">${D.brukere.map((b) => `<button data-pinbruker="${b.id}" aria-pressed="${b.id === pinValgt}"><b>${b.id}</b><span>${b.navn}</span></button>`).join('')}</div>
      <div class="pin">${[0, 1, 2, 3].map((i) => `<span>${pinSiffer[i] ? '•' : ''}</span>`).join('')}</div>
      <div class="brukere" style="grid-template-columns:repeat(3,1fr)">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((x) => (x === '' ? '<span></span>' : `<button data-pinsiffer="${x}"><b>${x}</b></button>`)).join('')}</div>
      <span class="faint" style="font-size:12px">Mockup: hvilken som helst 4-sifret kode fungerer.</span>`);
  }
  function typeModal(v, ny) {
    const tekst = {
      'ravare>skaffevare': 'Beholdningen fryses som restlager. Nye ordre lager én bestilling per trapp, og ledetiden legges inn i leveringstiden.',
      'skaffevare>ravare': 'Varen begynner å lagerføres. Sett startbeholdning og minimumsnivå.',
      'skaffevare>lagervare': 'Varen legges på hylla. Sett startbeholdning og minimum — den kommer med i plukklister.',
      'lagervare>skaffevare': 'Varen lagerføres ikke lenger. Restbeholdningen brukes opp først.',
      'ravare>lagervare': 'Varen behandles som ferdigvare og plukkes direkte til pakking.',
      'lagervare>ravare': 'Varen forbrukes i produksjonen i stedet for å plukkes.',
    }[`${v.type}>${ny}`];
    modal(`<span class="label">${v.nr}</span><h2>${TYPENAVN[v.type]} → ${TYPENAVN[ny]}</h2><p>${esc(v.navn)}</p><div class="notis">${tekst}</div>
      ${ny !== 'skaffevare' && v.beh == null ? '<div class="skjema"><label class="felt"><span>Startbeholdning</span><input class="inp" value="0"></label><label class="felt"><span>Minimum</span><input class="inp" value="10"></label></div>' : ''}
      <div class="knapper"><button class="btn" data-h="lukk">Avbryt</button><button class="btn primar" data-byttype="${v.nr}:${ny}">Bytt type</button></div>`);
  }

  /* ── Ruter ───────────────────────────────────────────── */
  let timer = null;
  function vis() {
    const rute = location.hash.replace(/^#\/?/, '');
    const [a, b] = rute.split('/');
    tegnMeny(rute);
    const V = {
      '': vDashbord, oppgaver: vOppgaver, salg: vSalg, kalk: () => vKalk(b), priser: vPriser, prosjekter: vProsjekter, prosjekt: () => vProsjekt(b),
      dekktrinn: vDekktrinn, fabrikk: vFabrikk, stasjon: () => vStasjon(b), plan: vPlan, ressurser: vRessurser, varer: vVarer, logistikk: vLogistikk,
      okonomi: vOkonomi, ettermarked: vEttermarked, arkivet: vArkivet, innstillinger: vInnstillinger, lagring: vLagring,
    };
    $('#side').innerHTML = (V[a] || vDashbord)();
    clearInterval(timer);
    if ($('#tidtaker')) {
      const tikk = () => {
        const s = S.timerStart ? Math.floor((Date.now() - S.timerStart) / 1000) + S.timerPause : S.timerPause || 4711;
        $('#tidtaker') && ($('#tidtaker').textContent = [s / 3600, (s % 3600) / 60, s % 60].map((x) => String(Math.floor(x)).padStart(2, '0')).join(':'));
      };
      tikk();
      timer = setInterval(tikk, 1000);
    }
  }
  const tegnPaNytt = () => { const y = scrollY; vis(); scrollTo(0, y); };

  /* ── Hendelser ───────────────────────────────────────── */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-h],[data-gaa],[data-gaa-knapp],[data-fane],[data-del],[data-filter],[data-niva],[data-pinbruker],[data-pinsiffer],[data-byttype]');
    if (!t) return;
    const d = t.dataset;
    if (d.gaa || d.gaaKnapp) { location.hash = '#/' + (d.gaa || d.gaaKnapp); return; }
    if (d.fane) { S.kalkFane = d.fane; return tegnPaNytt(); }
    if (d.del) { S.valgtDel = d.del; return tegnPaNytt(); }
    if (d.filter) { S.varefilter = d.filter; return tegnPaNytt(); }
    if (d.niva) {
      const [p, s] = d.niva.split(':');
      D.kompetanse[p][s] = ((D.kompetanse[p][s] || 0) + 1) % 4;
      return tegnPaNytt();
    }
    if (d.pinbruker) { pinValgt = d.pinbruker; pinSiffer = ''; return pinModal(); }
    if (d.pinsiffer != null) {
      pinSiffer = d.pinsiffer === '⌫' ? pinSiffer.slice(0, -1) : (pinSiffer + d.pinsiffer).slice(0, 4);
      if (pinSiffer.length === 4) {
        S.bruker = pinValgt; S.rolle = bruker(pinValgt).rolle; lagret.bruker = S.bruker; lagret.rolle = S.rolle; lagre();
        pinSiffer = ''; lukk(); oppdaterTopp(); tegnPaNytt(); melding(`Pålogget som <b>${bruker(S.bruker).navn}</b>`);
        return;
      }
      return pinModal();
    }
    if (d.byttype) {
      const [vnr, ny] = d.byttype.split(':');
      const v = D.varer.find((x) => x.nr === vnr);
      const fra = v.type;
      v.type = ny;
      if (ny === 'skaffevare') { v.beh = null; v.min = null; } else if (v.beh == null) { v.beh = 0; v.min = 10; }
      lukk(); tegnPaNytt(); melding(`${esc(v.navn)}: ${TYPENAVN[fra]} → ${TYPENAVN[ny]}. Endringen er logget.`);
      return;
    }
    switch (d.h) {
      case 'tilpass': S.tilpass = !S.tilpass; return tegnPaNytt();
      case 'nullstill-widgets': delete S.widgets[S.rolle]; lagret.widgets = S.widgets; lagre(); return tegnPaNytt();
      case 'pin': pinSiffer = ''; pinValgt = S.bruker; return pinModal();
      case 'lukk': return lukk();
      case 'lukk-bak': if (e.target === t) lukk(); return;
      case 'hast': S.hast = t.checked; return tegnPaNytt();
      case 'start': S.timerStart = Date.now(); melding('Startet. Tiden registreres på prosjektet og brukes i etterkalkylen.'); return tegnPaNytt();
      case 'pause': if (S.timerStart) { S.timerPause += Math.floor((Date.now() - S.timerStart) / 1000); S.timerStart = null; } return tegnPaNytt();
      case 'ferdig': {
        const sid = location.hash.split('/')[2] || 'lakk';
        const k = koFor(sid)[0];
        if (k) { S.ferdigMeldt.push(pid(k.p) + k.del); melding(`<b>${k.p.kalk}-${String(k.p.pos).padStart(2, '0')} ${k.del.toLowerCase()}</b> ferdig — sendt videre til neste stasjon.`); }
        S.timerStart = null; S.timerPause = 0;
        return tegnPaNytt();
      }
      case 'avvik': return modal(`<span class="label">Avvik</span><h2>Meld avvik</h2><div class="widget-velg">${['Feil mål', 'Skade i materialet', 'Mangler del', 'Feil farge', 'Maskinstopp', 'Annet'].map((x) => `<label><input type="radio" name="avvik"> ${x}</label>`).join('')}</div><label class="felt"><span>Kommentar</span><textarea rows="3"></textarea></label><span class="faint" style="font-size:12px">Avviket havner hos tegner og produksjonsleder, og i prosjektets logg.</span><div class="knapper"><button class="btn" data-h="lukk">Avbryt</button><button class="btn primar" data-h="lukk-melding">Send</button></div>`);
      case 'lukk-melding': lukk(); return melding('Sendt.');
      case 'lapp': return modal(`<span class="label">Overflatelapp</span><h2>Utskrift</h2><div class="card blokk" style="font-family:var(--font-mono);font-size:13px"><b class="dot" style="font-size:26px">058601-01</b><span>Familien Aasen · Askim</span><span>Eik · Beiset/lakkert</span><span><b>Farge 5 · Eikbeis nr.9</b></span><span>Trinn 14 · Vanger 2 · Håndløper 4,2 lm</span>${qr('lapp')}</div><div class="knapper"><button class="btn" data-h="lukk">Lukk</button><button class="btn primar" data-h="lukk-melding">Skriv ut (kvitteringsskriver)</button></div>`);
      case 'tripletex': return melding('Eksportfil laget: <span class="mono">tripletex-ordre-2026-10-09.csv</span> (mockup).');
      case 'backup': return melding('Backup laget: <span class="mono">nt-system-backup-2026-10-09.zip</span> (mockup).');
      case 'dekk-ferdig': return melding('Kan ikke kvittere ut: 2 DXF-filer mangler i ukemappen.', 'fare');
      case 'simuler': return melding('Hasteordre lagt inn: gelender går til 118 % uke 42, 2 prosjekter mister 1 dag buffer, ingen leveranser forsinkes.', 'fare');
      case 'til-ordre': return melding('Ordre opprettet: <b>058612-01-TRA · P2611</b> og <b>058612-02-SPL · P2611</b>. Tegneoppgave sendt til OL.');
      case 'ny-vare': return modal(`<span class="label">Varer</span><h2>Ny vare</h2><div class="skjema"><label class="felt bred"><span>Navn</span><input></label><label class="felt"><span>Type</span><select>${Object.entries(TYPENAVN).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label><label class="felt"><span>Enhet</span><select>${D.enheter.map((x) => `<option>${x}</option>`).join('')}</select></label><label class="felt"><span>Innkjøpspris</span><input></label><label class="felt"><span>Leverandør</span><input></label><label class="felt"><span>Ledetid (dager)</span><input></label><label class="felt"><span>Minimum</span><input></label></div><div class="knapper"><button class="btn" data-h="lukk">Avbryt</button><button class="btn primar" data-h="lukk-melding">Lagre</button></div>`);
      case 'ny-henvendelse': return modal(`<span class="label">NT-Kalk</span><h2>Ny henvendelse</h2><div class="skjema"><label class="felt bred"><span>Kunde</span><input></label><label class="felt"><span>Forhandler</span><select>${D.forhandlere.map((f) => `<option>${f.nr} · ${f.navn}</option>`).join('')}</select></label><label class="felt"><span>Kategori</span><select>${D.kategorier.map((k) => `<option>${k.kode} · ${k.navn}</option>`).join('')}</select></label></div><div class="notis">Får kalkylenummer <b class="mono">058617</b>. Første posisjon blir <b class="mono">058617-01</b>.</div><div class="knapper"><button class="btn" data-h="lukk">Avbryt</button><button class="btn primar" data-h="lukk-melding">Opprett</button></div>`);
      case 'reklamasjon': return modal(`<span class="label">Ettermarked</span><h2>Ny reklamasjon</h2><label class="felt"><span>Prosjekt</span><select>${D.prosjekter.filter(ferdigAlt).map((p) => `<option>${nrTekst(p)} · ${esc(p.kunde)}</option>`).join('')}</select></label><label class="felt"><span>Hva gjelder det?</span><textarea rows="3"></textarea></label><div class="notis">Får nummer <b class="mono">058598-01-TRA-R1</b> og egen produksjonsmåned.</div><div class="knapper"><button class="btn" data-h="lukk">Avbryt</button><button class="btn primar" data-h="lukk-melding">Opprett</button></div>`);
      case 'varetelling': case 'bestill': case 'ny-oppgave': case 'ny-pos': case 'ikke-i-mockup': return melding('Ikke med i mockupen — kommer i systemet.', '');
      case 'lagret': return melding('Lagret (mockup).');
    }
  });

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.widget) {
      const w = new Set(valgteWidgets());
      t.checked ? w.add(t.dataset.widget) : w.delete(t.dataset.widget);
      S.widgets[S.rolle] = WIDGETS.map((x) => x[0]).filter((x) => w.has(x));
      lagret.widgets = S.widgets; lagre();
      return tegnPaNytt();
    }
    if (t.dataset.type) {
      const v = D.varer.find((x) => x.nr === t.dataset.type);
      if (t.value !== v.type) { const ny = t.value; t.value = v.type; typeModal(v, ny); }
      return;
    }
    if (t.dataset.enhet) {
      const v = D.varer.find((x) => x.nr === t.dataset.enhet);
      v.enhet = t.value; melding(`${esc(v.navn)}: enhet satt til <b>${t.value}</b>.`);
      return;
    }
    if (t.dataset.bem) {
      const [p, i] = t.dataset.bem.split(':');
      D.bemanning[p][+i] = t.value;
      return tegnPaNytt();
    }
    if (t.dataset.h === 'velg-stasjon') { location.hash = '#/stasjon/' + t.value; }
  });

  /* ── Topplinje ───────────────────────────────────────── */
  function oppdaterTopp() {
    $('#rolle').innerHTML = D.roller.map((r) => `<option value="${r.id}" ${r.id === S.rolle ? 'selected' : ''}>${r.navn}</option>`).join('');
    $('#bruker').textContent = S.bruker;
  }
  $('#rolle').addEventListener('change', (e) => { S.rolle = e.target.value; lagret.rolle = S.rolle; lagre(); location.hash = '#/'; tegnPaNytt(); });
  $('#bruker').addEventListener('click', () => { pinSiffer = ''; pinValgt = S.bruker; pinModal(); });
  const settTema = (t) => {
    if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = t;
    document.querySelectorAll('[data-tema]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tema === t)));
    lagret.tema = t; lagre();
  };
  document.querySelectorAll('[data-tema]').forEach((b) => b.addEventListener('click', () => settTema(b.dataset.tema)));
  settTema(lagret.tema || 'auto');
  const klokke = () => {
    const n = new Date();
    $('#klokke').textContent = n.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
    $('#dato').textContent = n.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' }) + ` · uke ${uke(n)}`;
  };
  klokke(); setInterval(klokke, 15000);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') lukk(); });

  oppdaterTopp();
  addEventListener('hashchange', () => { vis(); scrollTo(0, 0); });
  vis();
})();
