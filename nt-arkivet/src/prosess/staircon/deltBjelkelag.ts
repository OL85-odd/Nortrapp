import type { Fase, Hurtigtast, Prosess } from '../types';

/* ─────────────────────────────────────────────────────────────
   Delt bjelkelagsåpning — fanger opp skjeve vegger og bjelkelag.

   Velges som tillegg i Oppsett. Gir en egen fase rett etter
   «Egenskaper – Trapp». Menynavn og hurtigtaster er kontrollert mot
   staircon.chm (ordlisten: «Dele bjelkelagsåpningsside» = Split Floor
   Opening Side; hurtigtastlisten: Ctrl+F5/Ctrl+F7 viser/skjuler
   bjelkelagsåpninger/vanger; dialogen «Egenskaper – Bjelkelagsåpningsside»
   har Fra/Til X/Y).
   ───────────────────────────────────────────────────────────── */

export const DELT_ALTERNATIV = { id: 'delt_bjelkelag', navn: 'Delt bjelkelagsåpning' };

export const DELT_TASTER: Hurtigtast[] = [
  { tast: 'Ctrl + F5', tekst: 'Vis/skjul bjelkelagsåpninger' },
  { tast: 'Ctrl + F7', tekst: 'Vis/skjul vanger' },
];

export const DELT_FASE: Fase = {
  id: 'deltbjelkelag',
  tittel: 'Delt bjelkelagsåpning',
  undertittel: 'Fanger opp skjeve vegger og bjelkelag',
  gjelder: { steg: 'tillegg', er: 'delt_bjelkelag' },
  steg: [
    {
      id: 'db1',
      tittel: 'Sjekk kalkyletegningen: må bjelkelaget deles, og hvor mye?',
      tekst:
        'Sammenlign målene på kalkyletegningen/måleskissen med målene i Staircon. Er en vegg eller bjelkelaget skjevt, må bjelkelagsåpningen deles der avviket er. Eksempel: Staircon viser 2001 mm, skissen 2005 mm, så punktet skal flyttes 4 mm.',
      husk: 'Noter avviket og hvor det er før du begynner. Det er målet du skal flytte punktet til.',
      hurtigtaster: ['F3', 'Ctrl + Q'],
      felter: [
        { nokkel: 'delt_avvik', etikett: 'Avvik', type: 'tall', enhet: 'mm', plassholder: '4', viktig: true },
        { nokkel: 'delt_hvor', etikett: 'Hvor', plassholder: 'F.eks. venstre vegg, nede ved trinn 15' },
      ],
      bilder: [{ fil: 'db1-kalkyletegning-avvik.webp', tekst: 'Kalkyletegningen viser 2005 mm, Staircon 2001 mm: 4 mm avvik' }],
    },
    {
      id: 'db2',
      tittel: 'Funksjoner → Dele bjelkelagsåpningsside',
      tekst: 'I menylinjen: Funksjoner → Dele bjelkelagsåpningsside. Klikk på punktet på åpningssiden der den skal deles, og bekreft med Enter.',
      husk: 'Er det vanskelig å treffe åpningssiden fordi vangen ligger over? Skjul vangene med Ctrl + F7, og vis dem igjen etterpå.',
      hurtigtaster: ['Ctrl + F7', 'Ctrl + F5'],
      bilder: [{ fil: 'db2-funksjoner-dele-bjelkelagsapningsside.webp', tekst: 'Funksjoner → Dele bjelkelagsåpningsside, og punktet som skal deles' }],
    },
    {
      id: 'db3',
      tittel: 'Flytt det nye punktet, og deretter vangen til samme punkt',
      tekst:
        'Høyreklikk på det nye punktet → Flytte → Bjelkelagsåpninger, og flytt punktet til riktig mål. Høyreklikk så på samme punkt → Flytte → Vanger, og flytt vangen til det samme punktet. Kontroller til slutt med F3 at målet stemmer med kalkyletegningen.',
      husk: 'Rekkefølgen er viktig: først bjelkelagsåpningen, så vangen. Vangen skal ende nøyaktig i det nye punktet.',
      hurtigtaster: ['F3', 'Ctrl + Q'],
      hjelp: {
        kilde: 'Staircon-hjelpen: Egenskaper – Bjelkelagsåpningsside',
        tekst: 'Alternativ til å dra: dobbeltklikk på åpningssiden og skriv inn nøyaktig Fra/Til X/Y i dialogen.',
      },
      merknad: {
        type: 'test',
        tekst: 'Forslag: Alt + Y flytter bare i Y-retning, men hjelpefilen sier det gjelder i sideriss. Test om det også virker i grunnriss før det tas inn som fast tast.',
      },
      bilder: [{ fil: 'db3-flytte-bjelkelag-og-vange.webp', tekst: 'Høyreklikk → Flytte → Bjelkelagsåpninger / Vanger (her 4 mm ned)' }],
    },
  ],
};

/**
 * Legger inn valget og fasen i en Staircon-prosess. Gir null hvis det allerede finnes,
 * eller hvis prosessen mangler tilleggs-spørsmålet.
 */
export function medDeltBjelkelag(p: Prosess): Prosess | null {
  const harFase = p.faser.some((f) => f.id === DELT_FASE.id);
  const tilleggSteg = p.faser.flatMap((f) => f.steg).find((s) => s.id === 'tillegg');
  if (harFase || !tilleggSteg?.valg || tilleggSteg.valg.type !== 'flere') return null;
  if (tilleggSteg.valg.alternativer.some((a) => a.id === DELT_ALTERNATIV.id)) return null;

  const faser = p.faser.map((f) => ({
    ...f,
    steg: f.steg.map((s) =>
      s.id === 'tillegg' && s.valg?.type === 'flere'
        ? { ...s, tekst: s.tekst?.replace('«Spilevegg».', '«Spilevegg». Delt bjelkelagsåpning velges når vegger eller bjelkelag er skjeve.'), valg: { ...s.valg, alternativer: [...s.valg.alternativer, DELT_ALTERNATIV] } }
        : s,
    ),
  }));
  const etter = faser.findIndex((f) => f.id === 'egenskaper');
  faser.splice(etter >= 0 ? etter + 1 : faser.length, 0, structuredClone(DELT_FASE));
  const taster = p.hurtigtaster ?? [];
  return {
    ...p,
    faser,
    hurtigtaster: [...taster, ...DELT_TASTER.filter((t) => !taster.some((x) => x.tast === t.tast))],
  };
}
