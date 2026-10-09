/* NT-System · mockup. Eksempeldata — alle kunder, adresser og beløp er oppdiktet. */
window.NT = (() => {
  const avdelinger = [
    { nr: 4, navn: 'Buskerud' },
    { nr: 5, navn: 'Oslo Øst & Romerike' },
    { nr: 6, navn: 'Oslo & Follo' },
    { nr: 8, navn: 'Moss' },
    { nr: 12, navn: 'Haugesund' },
    { nr: 14, navn: 'Drammen' },
    { nr: 15, navn: 'Råde' },
    { nr: 16, navn: 'Aust-Agder' },
  ];

  const forhandlere = [
    { nr: 1, navn: 'Rakkestad', avd: null, prov: 0 },
    { nr: 2, navn: 'Buskerud', avd: 4, prov: 1.15 },
    { nr: 3, navn: 'Romerike', avd: 5, prov: 1.15 },
    { nr: 4, navn: 'Oslo/Follo', avd: 6, prov: 1.15 },
    { nr: 5, navn: 'Moss', avd: 8, prov: 1.15 },
    { nr: 6, navn: 'Terje Haraldseide', avd: 12, prov: 1.12 },
    { nr: 7, navn: 'Østby Trevarefabrikk', avd: null, prov: 1.1 },
    { nr: 8, navn: 'Drammen', avd: 14, prov: 1.15 },
    { nr: 9, navn: 'Råde', avd: 15, prov: 1.15 },
    { nr: 10, navn: 'Aust-Agder', avd: 16, prov: 1.15 },
  ];

  const roller = [
    { id: 'leder', navn: 'Daglig leder', widgets: ['kpi', 'flyt', 'fabrikk', 'varsler', 'kapasitet', 'okonomi'] },
    { id: 'tegner', navn: 'Tegner', widgets: ['kpi', 'flyt', 'varsler', 'oppgaver', 'dekktrinn'] },
    { id: 'salg', navn: 'Salg', widgets: ['kpi', 'flyt', 'varsler', 'oppgaver', 'kapasitet'] },
    { id: 'produksjon', navn: 'Produksjonsleder', widgets: ['kpi', 'fabrikk', 'varsler', 'kapasitet', 'oppgaver'] },
    { id: 'regnskap', navn: 'Regnskap', widgets: ['kpi', 'okonomi', 'varsler'] },
    { id: 'forhandler', navn: 'Forhandler (VPN)', widgets: ['kpi', 'flyt', 'oppgaver'] },
    { id: 'operator', navn: 'Operatør', widgets: ['varsler', 'oppgaver'] },
  ];

  const brukere = [
    { id: 'OL', navn: 'Oddgeir', rolle: 'tegner', avd: 'Tegning', admin: true },
    { id: 'RO', navn: 'Roger', rolle: 'tegner', avd: 'Tegning' },
    { id: 'SI', navn: 'Simen', rolle: 'leder', avd: 'Ledelse' },
    { id: 'NI', navn: 'Nina', rolle: 'regnskap', avd: 'Administrasjon' },
    { id: 'KR', navn: 'Kristin', rolle: 'salg', avd: 'Salg' },
    { id: 'TH', navn: 'Thomas', rolle: 'salg', avd: 'Salg' },
    { id: 'AN', navn: 'Andreas', rolle: 'operator', avd: 'Fres' },
    { id: 'MA', navn: 'Marius', rolle: 'operator', avd: 'Fres' },
    { id: 'JO', navn: 'Jonas', rolle: 'operator', avd: 'Gelender' },
    { id: 'PE', navn: 'Petter', rolle: 'operator', avd: 'Gelender' },
    { id: 'EV', navn: 'Eva', rolle: 'operator', avd: 'Gelender' },
    { id: 'LA', navn: 'Lars', rolle: 'operator', avd: 'Puss' },
    { id: 'IN', navn: 'Ingrid', rolle: 'operator', avd: 'Puss' },
    { id: 'KA', navn: 'Kasper', rolle: 'operator', avd: 'Overflate lakk' },
    { id: 'SO', navn: 'Sofie', rolle: 'operator', avd: 'Overflate olje' },
    { id: 'HE', navn: 'Henrik', rolle: 'operator', avd: 'Pakking' },
    { id: 'BJ', navn: 'Bjørn', rolle: 'produksjon', avd: 'Logistikk' },
  ];

  /* Stasjoner fra Simens produksjonsverktøy + tegning/lager/transport.
     x/y/b/h = plassering i fabrikktegningen (viewBox 0 0 960 370). */
  const stasjoner = [
    { id: 'tegning', navn: 'Tegning', sone: 'Kontor', x: 24, y: 30, b: 110, h: 64, last: 0.72, kap: 2, normtid: 3.5, enhet: 't/trapp' },
    { id: 'reich', navn: 'Reichenbacher', sone: 'Fres', x: 180, y: 30, b: 130, h: 64, last: 0.88, kap: 1, normtid: 1.6, enhet: 't/trapp' },
    { id: 'cms', navn: 'CMS', sone: 'Fres', x: 180, y: 110, b: 130, h: 64, last: 0.64, kap: 1, normtid: 1.2, enhet: 't/trapp' },
    { id: 'gelender', navn: 'Gelenderavdeling', sone: 'Gelender', x: 350, y: 30, b: 150, h: 144, last: 1.04, kap: 3, normtid: 6, enhet: 't/trapp' },
    { id: 'kp_vanger', navn: 'Kantpuss vanger', sone: 'Puss', x: 540, y: 30, b: 120, h: 64, last: 0.58, kap: 1, normtid: 0.8, enhet: 't/trapp' },
    { id: 'kp_trinn', navn: 'Kantpuss trinn', sone: 'Puss', x: 540, y: 110, b: 120, h: 64, last: 0.71, kap: 1, normtid: 1, enhet: 't/trapp' },
    { id: 'bredband', navn: 'Bredbåndpusser', sone: 'Puss', x: 540, y: 190, b: 120, h: 64, last: 0.82, kap: 1, normtid: 0.7, enhet: 't/trapp' },
    { id: 'barnesikring', navn: 'Barnesikring', sone: 'Gelender', x: 350, y: 190, b: 150, h: 64, last: 0.4, kap: 1, normtid: 0.5, enhet: 't/stk' },
    { id: 'stuss', navn: 'Stusstrinn', sone: 'Fres', x: 180, y: 190, b: 130, h: 64, last: 0.35, kap: 1, normtid: 0.4, enhet: 't/trapp' },
    { id: 'lakk', navn: 'Lakkmaskin', sone: 'Overflate', x: 700, y: 30, b: 120, h: 64, last: 0.93, kap: 1, normtid: 1.4, enhet: 't/trapp' },
    { id: 'olje', navn: 'Oljeavdeling', sone: 'Overflate', x: 700, y: 110, b: 120, h: 64, last: 0.52, kap: 1, normtid: 1.1, enhet: 't/trapp' },
    { id: 'pakking', navn: 'Pakking', sone: 'Utlevering', x: 840, y: 30, b: 96, h: 144, last: 0.66, kap: 2, normtid: 1.2, enhet: 't/trapp' },
    { id: 'lager', navn: 'Lager / plukk', sone: 'Utlevering', x: 700, y: 286, b: 120, h: 64, last: 0.3, kap: 1, normtid: 0.5, enhet: 't/trapp' },
    { id: 'transport', navn: 'Transport', sone: 'Utlevering', x: 840, y: 286, b: 96, h: 64, last: 0.55, kap: 1, normtid: 0, enhet: '' },
  ];

  /* Delene som går parallelt gjennom fabrikken og møtes i pakking. */
  const sporMaler = {
    trapp: [
      { del: 'Vanger', stopp: ['reich', 'kp_vanger', 'overflate', 'pakking'] },
      { del: 'Trinn', stopp: ['cms', 'kp_trinn', 'bredband', 'overflate', 'pakking'] },
      { del: 'Gelender', stopp: ['gelender', 'barnesikring', 'overflate', 'pakking'] },
      { del: 'Innkjøp', stopp: ['bestilt', 'mottatt', 'pakking'] },
    ],
    spilevegg: [
      { del: 'Spiler', stopp: ['cms', 'gelender', 'overflate', 'pakking'] },
      { del: 'Håndløper', stopp: ['gelender', 'kp_vanger', 'overflate', 'pakking'] },
    ],
    trinnkasse: [
      { del: 'Kasse', stopp: ['reich', 'kp_trinn', 'overflate', 'pakking'] },
      { del: 'Trinn', stopp: ['cms', 'bredband', 'overflate', 'pakking'] },
    ],
  };

  const STOPPNAVN = { overflate: 'Overflate', bestilt: 'Bestilt', mottatt: 'Mottatt' };

  const overflater = [
    { nr: 1, navn: 'Ubehandlet' },
    { nr: 2, navn: 'Oljet' },
    { nr: 3, navn: 'Beiset/lakkert' },
    { nr: 4, navn: 'Lakkert' },
    { nr: 5, navn: 'Malt' },
    { nr: 6, navn: 'Malt – spesialfarge' },
  ];

  const fargekoder = [
    { nr: 1, navn: 'Brunsort nr.1', ofl: 3, hex: '#3b2a22' },
    { nr: 2, navn: 'Antikk nr.5', ofl: 3, hex: '#8a5a32' },
    { nr: 3, navn: 'Brun nr.6', ofl: 3, hex: '#6b4226' },
    { nr: 4, navn: 'Rustikk nr.7', ofl: 3, hex: '#9c6b3f' },
    { nr: 5, navn: 'Eikbeis nr.9', ofl: 3, hex: '#b48553' },
    { nr: 6, navn: 'Grå sommer', ofl: 3, hex: '#a7a196' },
    { nr: 7, navn: 'Skifer 3130', ofl: 3, hex: '#5d5f5f' },
    { nr: 8, navn: 'Hav 3119', ofl: 3, hex: '#7d8a8c' },
    { nr: 9, navn: 'S 0500-N', ofl: 5, hex: '#f3f2ee' },
    { nr: 10, navn: 'S 2002-Y', ofl: 5, hex: '#d4d0c4' },
    { nr: 11, navn: 'S 8000-N', ofl: 5, hex: '#2c2c2b' },
    { nr: 12, navn: 'S 0502-Y', ofl: 5, hex: '#efece0' },
    { nr: 13, navn: 'Spesialfarge', ofl: 6, hex: '#5f7a64' },
    { nr: 14, navn: 'Pulverlakkert', ofl: 6, hex: '#222' },
    { nr: 15, navn: 'Fargeløs', ofl: 2, hex: '#e2c79c' },
    { nr: 16, navn: 'Hardvoksolje 3040 hvit', ofl: 2, hex: '#efe4cf' },
    { nr: 17, navn: 'Hardvoksolje RMC 9000', ofl: 2, hex: '#d9c09a' },
    { nr: 18, navn: 'Hardvoksolje 3129 Kongle', ofl: 2, hex: '#9a7650' },
    { nr: 19, navn: 'Hardvoksolje 3116 Leirgrå', ofl: 2, hex: '#a39b8b' },
  ];

  const typer = ['Rett trapp', 'Kvartsvingt', 'Halvsvingt', 'Dobbel kvartsving', 'Spiraltrapp', 'Spilevegg', 'Trinnkasse'];
  const kategorier = [
    { kode: 'TRA', navn: 'Trapp', spor: 'trapp' },
    { kode: 'SPL', navn: 'Spilevegg', spor: 'spilevegg' },
    { kode: 'TKA', navn: 'Trinnkasse', spor: 'trinnkasse' },
    { kode: 'RPO', navn: 'Reklamasjon / ettermarked', spor: 'trapp' },
  ];

  /* Status langs hovedlinjen (T-bane på dashbordet). */
  const flyt = [
    { id: 'forespørsel', navn: 'Forespørsel' },
    { id: 'tilbud', navn: 'Tilbud' },
    { id: 'ordre', navn: 'Ordre / OB' },
    { id: 'tegning', navn: 'Tegning' },
    { id: 'produksjon', navn: 'Produksjon' },
    { id: 'overflate', navn: 'Overflate' },
    { id: 'pakking', navn: 'Pakking' },
    { id: 'levert', navn: 'Levert' },
    { id: 'ettermarked', navn: 'Ettermarked' },
  ];

  // Hvor langt hvert spor har kommet: indeks i sporets stopp-liste (‑1 = ikke startet).
  const P = (kalk, pos, kat, prod, x) => ({ kalk, pos, kat, prod, ...x });
  const prosjekter = [
    P(58601, 1, 'TRA', '2610', { kunde: 'Familien Aasen', sted: 'Askim', fh: 9, type: 'Kvartsvingt', treslag: 'Eik', ofl: 3, farge: 5, status: 'produksjon', spor: [2, 1, 0, 1], lev: '2026-10-23', buffer: 3, tegner: 'OL', verdi: 148200, haster: false, tillegg: ['dekktrinn'] }),
    P(58603, 1, 'TRA', '2610', { kunde: 'Byggmester Lie AS', sted: 'Lillestrøm', fh: 3, type: 'Rett trapp', treslag: 'Ask', ofl: 4, farge: null, status: 'overflate', spor: [2, 3, 2, 2], lev: '2026-10-16', buffer: 1, tegner: 'RO', verdi: 64900, haster: false, tillegg: [] }),
    P(58604, 1, 'TRA', '2610', { kunde: 'Hansen Bolig', sted: 'Drammen', fh: 8, type: 'Halvsvingt', treslag: 'Eik', ofl: 2, farge: 18, status: 'produksjon', spor: [1, 0, 0, 0], lev: '2026-10-30', buffer: 6, tegner: 'OL', verdi: 172400, haster: false, tillegg: ['glass', 'dekktrinn'] }),
    P(58604, 2, 'SPL', '2610', { kunde: 'Hansen Bolig', sted: 'Drammen', fh: 8, type: 'Spilevegg', treslag: 'Eik', ofl: 2, farge: 18, status: 'produksjon', spor: [1, 0], lev: '2026-10-30', buffer: 6, tegner: 'OL', verdi: 38600, haster: false, tillegg: [] }),
    P(58607, 1, 'TRA', '2610', { kunde: 'Nilsen', sted: 'Moss', fh: 5, type: 'Rett trapp', treslag: 'Furu', ofl: 5, farge: 9, status: 'pakking', spor: [3, 4, 3, 2], lev: '2026-10-13', buffer: 0, tegner: 'RO', verdi: 41200, haster: true, tillegg: [] }),
    P(58609, 1, 'TRA', '2611', { kunde: 'Strand & Co Eiendom', sted: 'Ski', fh: 4, type: 'Dobbel kvartsving', treslag: 'Eik', ofl: 3, farge: 7, status: 'tegning', spor: [-1, -1, -1, 0], lev: '2026-11-13', buffer: 9, tegner: 'OL', verdi: 211800, haster: false, tillegg: ['dekktrinn', 'montering'] }),
    P(58611, 1, 'TKA', '2611', { kunde: 'Berg', sted: 'Haugesund', fh: 6, type: 'Trinnkasse', treslag: 'Eik', ofl: 2, farge: 15, status: 'tegning', spor: [-1, -1], lev: '2026-11-06', buffer: 5, tegner: 'RO', verdi: 22900, haster: false, tillegg: [] }),
    P(58612, 1, 'TRA', '2611', { kunde: 'Familien Dahl', sted: 'Råde', fh: 9, type: 'Kvartsvingt', treslag: 'Eik', ofl: 3, farge: null, status: 'ordre', spor: [-1, -1, -1, -1], lev: '2026-11-20', buffer: 10, tegner: 'OL', verdi: 156300, haster: false, tillegg: ['dekktrinn'] }),
    P(58612, 2, 'SPL', '2611', { kunde: 'Familien Dahl', sted: 'Råde', fh: 9, type: 'Spilevegg', treslag: 'Eik', ofl: 3, farge: null, status: 'ordre', spor: [-1, -1], lev: '2026-11-20', buffer: 10, tegner: 'OL', verdi: 41800, haster: false, tillegg: [] }),
    P(58614, 1, 'TRA', '2611', { kunde: 'Ødegaard', sted: 'Arendal', fh: 10, type: 'Halvsvingt', treslag: 'Bøk', ofl: 4, farge: null, status: 'ordre', spor: [-1, -1, -1, -1], lev: '2026-11-27', buffer: 12, tegner: 'RO', verdi: 133700, haster: false, tillegg: ['glass'] }),
    P(58598, 1, 'TRA', '2609', { kunde: 'Kvamme', sted: 'Lier', fh: 2, type: 'Rett trapp', treslag: 'Eik', ofl: 2, farge: 16, status: 'levert', spor: [3, 4, 3, 2], lev: '2026-10-02', buffer: 0, tegner: 'OL', verdi: 58400, haster: false, tillegg: [] }),
    P(58520, 1, 'RPO', '2610', { kunde: 'Sæther', sted: 'Fredrikstad', fh: 5, type: 'Rett trapp', treslag: 'Eik', ofl: 3, farge: 2, status: 'ettermarked', spor: [3, 4, 3, 2], lev: '2026-10-20', buffer: 4, tegner: 'RO', verdi: 3900, haster: false, tillegg: [], rev: 'R1' }),
  ];

  const henvendelser = [
    { kalk: 58616, kunde: 'Larsen', sted: 'Jessheim', fh: 3, produkt: 'Kvartsvingt trapp i eik', status: 'Kalkuleres', ansv: 'KR', dato: '2026-10-08', verdi: 128000 },
    { kalk: 58615, kunde: 'Johansen Bygg AS', sted: 'Kolbotn', fh: 4, produkt: '2 × rett trapp, ask', status: 'Tilbud sendt', ansv: 'TH', dato: '2026-10-06', verdi: 117500, rev: 'B' },
    { kalk: 58613, kunde: 'Familien Moe', sted: 'Sarpsborg', fh: 9, produkt: 'Halvsvingt + spilevegg', status: 'Tilbud sendt', ansv: 'KR', dato: '2026-10-02', verdi: 198400, rev: 'A' },
    { kalk: 58612, kunde: 'Familien Dahl', sted: 'Råde', fh: 9, produkt: 'Kvartsvingt + spilevegg', status: 'Ordrebekreftelse sendt', ansv: 'KR', dato: '2026-09-29', verdi: 198100, rev: 'C' },
    { kalk: 58610, kunde: 'Vik', sted: 'Kristiansand', fh: 10, produkt: 'Spiraltrapp', status: 'Kalkulert', ansv: 'TH', dato: '2026-09-28', verdi: 94200 },
    { kalk: 58608, kunde: 'Svendsen', sted: 'Hokksund', fh: 2, produkt: 'Trinnkasse, eik oljet', status: 'Tapt', ansv: 'TH', dato: '2026-09-21', verdi: 19800 },
  ];

  /* Varer: råvare / skaffevare / lagervare. Kategori kan endres. */
  const varer = [
    { nr: 'R-1001', navn: 'Eikeplate 42 mm limt', type: 'ravare', enhet: 'm²', kjop: 1180, beh: 38, min: 30, lev: 'Trelast Øst', ledetid: 10 },
    { nr: 'R-1002', navn: 'Askeplate 42 mm limt', type: 'ravare', enhet: 'm²', kjop: 940, beh: 22, min: 15, lev: 'Trelast Øst', ledetid: 10 },
    { nr: 'R-1003', navn: 'Furu lamell 42 mm', type: 'ravare', enhet: 'm²', kjop: 520, beh: 64, min: 20, lev: 'Sagbruket Nord', ledetid: 7 },
    { nr: 'R-1010', navn: 'Eik håndløperemne 60×45', type: 'ravare', enhet: 'lm', kjop: 168, beh: 140, min: 80, lev: 'Trelast Øst', ledetid: 10 },
    { nr: 'R-1020', navn: 'Lakk, matt 10 %', type: 'ravare', enhet: 'l', kjop: 212, beh: 46, min: 40, lev: 'Lakkleverandøren', ledetid: 5 },
    { nr: 'R-1021', navn: 'Hardvoksolje fargeløs', type: 'ravare', enhet: 'l', kjop: 465, beh: 9, min: 12, lev: 'Oljeleverandøren', ledetid: 6 },
    { nr: 'S-2001', navn: 'Dekktrinn eik, etter DXF', type: 'skaffevare', enhet: 'stk', kjop: 890, beh: null, min: null, lev: 'Dekktrinnleverandør', ledetid: 14 },
    { nr: 'S-2002', navn: 'Herdet glass 8 mm, etter mål', type: 'skaffevare', enhet: 'm²', kjop: 1650, beh: null, min: null, lev: 'Glassleverandør', ledetid: 12 },
    { nr: 'S-2003', navn: 'Spesialfarge NCS etter ønske', type: 'skaffevare', enhet: 'l', kjop: 690, beh: null, min: null, lev: 'Lakkleverandøren', ledetid: 4 },
    { nr: 'L-3001', navn: 'Håndløperbrakett, børstet stål', type: 'lagervare', enhet: 'stk', kjop: 64, beh: 412, min: 200, lev: 'Beslag AS', ledetid: 7 },
    { nr: 'L-3002', navn: 'Barnesikringsgrind, standard', type: 'lagervare', enhet: 'stk', kjop: 980, beh: 6, min: 8, lev: 'Beslag AS', ledetid: 14 },
    { nr: 'L-3003', navn: 'Trappeskrue 6×120', type: 'lagervare', enhet: 'pk', kjop: 145, beh: 58, min: 20, lev: 'Beslag AS', ledetid: 5 },
    { nr: 'L-3004', navn: 'Sklisikring, transparent', type: 'lagervare', enhet: 'rull', kjop: 310, beh: 14, min: 10, lev: 'Beslag AS', ledetid: 7 },
    { nr: 'L-3005', navn: 'Stålspiler Ø12, 900 mm', type: 'lagervare', enhet: 'stk', kjop: 38, beh: 920, min: 400, lev: 'Stålhuset', ledetid: 10 },
  ];
  const enheter = ['stk', 'm²', 'lm', 'm³', 'l', 'kg', 'pk', 'rull', 'sett', 't'];

  /* Prisstruktur: grunnpris per type + tillegg (forslag til en «smartere» prisliste). */
  const priser = {
    grunn: { 'Rett trapp': 28900, Kvartsvingt: 41500, Halvsvingt: 49800, 'Dobbel kvartsving': 54200, Spiraltrapp: 61000, Spilevegg: 3400, Trinnkasse: 2900 },
    treslag: { Furu: 0.82, Ask: 0.95, Bøk: 0.97, Eik: 1 },
    bredde: { 800: 0.94, 900: 1, 1000: 1.08 },
    overflate: { 1: 0, 2: 0.06, 3: 0.12, 4: 0.09, 5: 0.14, 6: 0.22 },
  };

  const deler = [
    { id: 'vange_v', navn: 'Vange venstre', ant: 1, enhet: 'stk', mat: 'Eik 42', stasjon: 'reich', fil: '058601-01_vange_v.dxf' },
    { id: 'vange_h', navn: 'Vange høyre', ant: 1, enhet: 'stk', mat: 'Eik 42', stasjon: 'reich', fil: '058601-01_vange_h.dxf' },
    { id: 'trinn', navn: 'Trinn 1–14', ant: 14, enhet: 'stk', mat: 'Eik 42', stasjon: 'cms', fil: '058601-01_trinn.dxf' },
    { id: 'repo', navn: 'Repos / svingtrinn', ant: 3, enhet: 'stk', mat: 'Eik 42', stasjon: 'cms', fil: '058601-01_sving.dxf' },
    { id: 'hl', navn: 'Håndløper', ant: 4.2, enhet: 'lm', mat: 'Eik 60×45', stasjon: 'gelender', fil: '058601-01_handloper.dxf' },
    { id: 'spiler', navn: 'Spiler Ø12', ant: 38, enhet: 'stk', mat: 'Stål', stasjon: 'lager', fil: '—' },
    { id: 'stolpe', navn: 'Stolper', ant: 2, enhet: 'stk', mat: 'Eik 90×90', stasjon: 'gelender', fil: '058601-01_stolpe.dxf' },
    { id: 'dekk', navn: 'Dekktrinn', ant: 14, enhet: 'stk', mat: 'Eik (skaffevare)', stasjon: 'bestilt', fil: '58601-01.dxf' },
  ];

  const oppgaver = [
    { id: 1, tekst: 'Dekktrinn-bestilling uke 42', hvem: 'OL', kol: 'todo', haster: true, frist: 'Tir 08:00' },
    { id: 2, tekst: 'Tegne 058609-01 (dobbel kvartsving)', hvem: 'OL', kol: 'todo', frist: 'Fre' },
    { id: 3, tekst: 'Avklare farge med kunde — 58612', hvem: 'KR', kol: 'todo', haster: true, frist: 'Man' },
    { id: 4, tekst: 'Tegne 058611-01 trinnkasse', hvem: 'RO', kol: 'gang', frist: 'Tor' },
    { id: 5, tekst: 'Kontrollere OB 58612 mot PO', hvem: 'OL', kol: 'gang', frist: 'I dag' },
    { id: 6, tekst: 'Følge opp tilbud 58613', hvem: 'KR', kol: 'venter', frist: 'Ons' },
    { id: 7, tekst: 'Glass bestilt 58604', hvem: 'RO', kol: 'venter', frist: 'Uke 43' },
    { id: 8, tekst: 'Produksjonsordre 58604 sendt', hvem: 'OL', kol: 'ferdig' },
    { id: 9, tekst: 'Overflatelapp 58603', hvem: 'KA', kol: 'ferdig' },
  ];

  /* Bemanning: person × dag → stasjon. */
  const dager = ['Man 12', 'Tir 13', 'Ons 14', 'Tor 15', 'Fre 16'];
  const bemanning = {
    AN: ['reich', 'reich', 'reich', 'reich', 'reich'],
    MA: ['cms', 'cms', 'stuss', 'cms', 'cms'],
    JO: ['gelender', 'gelender', 'gelender', 'syk', 'gelender'],
    PE: ['gelender', 'gelender', 'gelender', 'gelender', 'barnesikring'],
    EV: ['gelender', 'barnesikring', 'gelender', 'gelender', 'gelender'],
    LA: ['kp_vanger', 'kp_vanger', 'kp_trinn', 'kp_vanger', 'bredband'],
    IN: ['kp_trinn', 'bredband', 'bredband', 'kp_trinn', 'kp_trinn'],
    KA: ['lakk', 'lakk', 'lakk', 'lakk', 'lakk'],
    SO: ['olje', 'olje', 'olje', 'olje', 'pakking'],
    HE: ['pakking', 'pakking', 'pakking', 'pakking', 'pakking'],
  };
  /* Kompetanse: 1 = under opplæring, 2 = selvstendig, 3 = kan lære opp andre. */
  const kompetanse = {
    AN: { reich: 3, cms: 2, stuss: 2 },
    MA: { cms: 3, stuss: 3, reich: 1 },
    JO: { gelender: 3, barnesikring: 2 },
    PE: { gelender: 2, barnesikring: 3, kp_vanger: 1 },
    EV: { gelender: 2, barnesikring: 2 },
    LA: { kp_vanger: 3, kp_trinn: 2, bredband: 2 },
    IN: { kp_trinn: 3, bredband: 3, kp_vanger: 2, gelender: 1 },
    KA: { lakk: 3, olje: 2 },
    SO: { olje: 3, lakk: 1, pakking: 2 },
    HE: { pakking: 3, lager: 2 },
  };

  return {
    avdelinger, forhandlere, roller, brukere, stasjoner, sporMaler, STOPPNAVN, overflater, fargekoder,
    typer, kategorier, flyt, prosjekter, henvendelser, varer, enheter, priser, deler, oppgaver,
    dager, bemanning, kompetanse, idag: '2026-10-09',
  };
})();
