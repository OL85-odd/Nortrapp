import { STAIRCON_INNLESING } from './innlesing';
import type { Prosess } from '../types';
import { ALLTID, STAIRCON_TASTER } from './hurtigtaster';

/* ─────────────────────────────────────────────────────────────
   NORTRAPP · Staircon — fra produksjonsordre til produksjonsmappe

   Versjon 3.0 bygger på «Staircon ABC» v2.9 (28.08.26). Endringer:
   - Oppsettet er spørsmål i flyten. Hvert svar bygger resten av stien.
   - Kvalitetssikret mot Staircons hjelpefil (staircon.chm). Steg som er nye
     eller endret har `merknad`, så de kan kontrolleres i appen.

   Regler (`gjelder`):
     { steg: 'trappetype', er: 'rett' }            svaret er «rett»
     { steg: 'tillegg', er: ['repo', 'glass'] }    minst ett av tilleggene er valgt
     { ikke: { steg: 'k02', er: 'ja' } }           selger har IKKE laget kalkylen
   ───────────────────────────────────────────────────────────── */

const SVING = { steg: 'trappetype', er: ['svingtrapp_u', 'svingtrapp_90'] };
const tillegg = (...id: string[]) => ({ steg: 'tillegg', er: id });

export const STAIRCON: Prosess = {
  id: 'staircon',
  navn: 'Staircon',
  versjon: '3.0',
  oppdatert: '2026-10-02',
  beskrivelse: 'Fra produksjonsordre i Kalken til ferdig produksjonsmappe.',
  type: 'programvare',
  prosjekter: true,
  hurtigtaster: STAIRCON_TASTER,
  alltidTaster: ALLTID,
  innlesing: STAIRCON_INNLESING,
  faser: [
    /* ───────────────────────────── 0 · OPPSETT ───────────────────────────── */
    {
      id: 'oppsett',
      tittel: 'Oppsett',
      undertittel: 'Svarene bestemmer resten av stien. Står på ordrebekreftelsen.',
      steg: [
        {
          id: 'trappetype',
          tittel: 'Hvilken trappetype?',
          tekst: 'Står øverst på ordrebekreftelsen, f.eks. «1 stk. RETT TRAPP I FURU».',
          valg: {
            type: 'ett',
            sporsmal: 'Trappetype',
            alternativer: [
              { id: 'rett', navn: 'Rett trapp', beskrivelse: 'Rett løp. Følg Staircon.' },
              { id: 'svingtrapp_90', navn: '90° svingtrapp', beskrivelse: 'Ett hjørne. Hjørnemål og idealformel må justeres.' },
              { id: 'svingtrapp_u', navn: 'Svingtrapp (U) 180°', beskrivelse: 'To hjørner. Hjørnemål og idealformel må justeres.' },
            ],
          },
        },
        {
          id: 'ganglinje',
          tittel: 'Høyre eller venstre opp?',
          tekst: 'Står som «Gangretning» på ordrebekreftelsen. Står det «Mellom vegger», se pilen på skissen.',
          valg: {
            type: 'ett',
            sporsmal: 'Ganglinje',
            alternativer: [
              { id: 'hoyre_opp', navn: 'Høyre opp trapp' },
              { id: 'venstre_opp', navn: 'Venstre opp trapp' },
            ],
          },
        },
        {
          id: 'vange',
          tittel: 'Hvordan står vangene?',
          valg: {
            type: 'ett',
            sporsmal: 'Vangeoppsett',
            alternativer: [
              { id: 'mellom_vegger', navn: 'Mellom 2 vegger', beskrivelse: 'Ingen synlige vanger.' },
              { id: 'en_synlig', navn: '1 synlig vange', beskrivelse: 'Én side mot vegg.' },
              { id: 'to_synlige', navn: '2 synlige vanger', beskrivelse: 'Begge sider synlige, helt eller delvis.' },
            ],
          },
        },
        {
          id: 'vange_side',
          tittel: 'Hvilken vange er synlig?',
          tekst: 'Sett nedenfra, med ansiktet mot trappen.',
          gjelder: { steg: 'vange', er: 'en_synlig' },
          valg: {
            type: 'ett',
            sporsmal: 'Synlig side',
            alternativer: [
              { id: 'venstre', navn: 'Venstre' },
              { id: 'hoyre', navn: 'Høyre' },
            ],
          },
        },
        {
          id: 'vange_omfang',
          tittel: 'Hvor mye av vangen er synlig?',
          gjelder: { steg: 'vange', er: 'en_synlig' },
          valg: {
            type: 'ett',
            sporsmal: 'Synlig del',
            alternativer: [
              { id: 'hele', navn: 'Hele vangen' },
              { id: 'deler', navn: 'Deler av vangen' },
            ],
          },
        },
        {
          id: 'vange_venstre',
          tittel: 'Venstre vange: hvor mye er synlig?',
          gjelder: { steg: 'vange', er: 'to_synlige' },
          valg: {
            type: 'ett',
            sporsmal: 'Venstre vange',
            alternativer: [
              { id: 'hele', navn: 'Hele vangen' },
              { id: 'deler', navn: 'Deler av vangen' },
            ],
          },
        },
        {
          id: 'vange_hoyre',
          tittel: 'Høyre vange: hvor mye er synlig?',
          gjelder: { steg: 'vange', er: 'to_synlige' },
          valg: {
            type: 'ett',
            sporsmal: 'Høyre vange',
            alternativer: [
              { id: 'hele', navn: 'Hele vangen' },
              { id: 'deler', navn: 'Deler av vangen' },
            ],
          },
        },
        {
          id: 'tillegg',
          tittel: 'Hvilke tillegg har trappen?',
          tekst: 'Velg alle som gjelder, eller ingen. Ser du etter nøkkelord: «Returgelender», «Meglere», «REPO», «Glass», «TV-ramme», «Spilevegg».',
          valg: {
            type: 'flere',
            sporsmal: 'Tillegg',
            alternativer: [
              { id: 'gelender', navn: 'Vanlig gelender' },
              { id: 'repo', navn: 'Repo' },
              { id: 'megler', navn: 'Stolpe/megler på toppen' },
              { id: 'glass', navn: 'Glassrekkverk' },
              { id: 'tvramme', navn: 'TV-ramme' },
              { id: 'spiler_tak', navn: 'Spiler til tak' },
              { id: 'spiler_2etg', navn: 'Spiler fortsetter i 2. etasje' },
            ],
          },
        },
        {
          id: 'repo_bygg',
          tittel: 'Er repoet allerede på plass i bygget?',
          tekst: 'Står som «REPO PÅ BYGG» under Viktige meldinger.',
          gjelder: tillegg('repo'),
          valg: {
            type: 'janei',
            sporsmal: 'Repo i bygg?',
            ja: 'Repoet tegnes i Staircon, men skal ikke leveres. Noter det i «Viktige meldinger».',
            nei: 'Repoet tegnes og leveres.',
          },
        },
        {
          id: 'gelender_detaljer',
          tittel: 'Gelender: type, sprosser og meglere',
          tekst: 'Fra ordrebekreftelsen, f.eks. «håndløper 40x67mm TYPE C», «runde sprosser/balustre 23mm TYPE 1», «Meglere type 11, 90x40mm».',
          gjelder: tillegg('gelender'),
          felter: [
            { nokkel: 'gelender_type', etikett: 'Type gelender', plassholder: 'Håndløper 40x67 TYPE C', viktig: true },
            { nokkel: 'gelender_sprosser', etikett: 'Type sprosser', plassholder: 'Runde 23 mm TYPE 1' },
            { nokkel: 'gelender_meglere', etikett: 'Type meglere', plassholder: 'Type 11, 90x40' },
            { nokkel: 'gelender_lengde', etikett: 'Returgelender (mm)', plassholder: '850' },
          ],
        },
        {
          id: 'tillegg_notat',
          tittel: 'Spesielle tilpasninger?',
          tekst: 'Alt som avviker fra standard: glass, TV-ramme, spiler, mål som må kappes osv. La stå tomt hvis ingenting.',
          gjelder: tillegg('megler', 'glass', 'tvramme', 'spiler_tak', 'spiler_2etg'),
          felter: [{ nokkel: 'notat', etikett: 'Notat', plassholder: 'F.eks. TV-ramme løp 2 lages på overmål' }],
        },
      ],
    },

    /* ───────────────────────────── 1 · KALKEN ───────────────────────────── */
    {
      id: 'kalken',
      tittel: 'Kalken',
      undertittel: 'Access 2010 — produksjonsordre og produksjonsseddel',
      steg: [
        { id: 'k01', tittel: 'Åpne Access (Kalken)' },
        {
          id: 'k02',
          tittel: 'Har selger allerede opprettet kalkulasjonen?',
          valg: {
            type: 'janei',
            sporsmal: 'Har selger opprettet kalkulasjon?',
            ja: 'Hopp over K-stegene. Gå rett til «Opprett produksjonsseddel».',
            nei: 'Du må opprette kalkulasjonen selv. Følg K-stegene.',
          },
        },
        {
          id: 'k03',
          gjelder: { steg: 'k02', er: 'nei' },
          tittel: 'Trykk «Kalkulasjoner» i hovedmenyen',
          tekst: 'Under HOVEDFUNKSJONER øverst til venstre.',
          bilder: [{ fil: 'k1-opprett-ny-kalkyle.webp', tekst: 'K1 — Hovedmeny → Kalkulasjoner' }],
        },
        {
          id: 'k04',
          gjelder: { steg: 'k02', er: 'nei' },
          tittel: 'Trykk «Ny» på menylinja til Access',
          tekst: 'Du får et blankt ark.',
          bilder: [{ fil: 'k2-trykk-ny.webp', tekst: 'K2 — Hjem → Poster → Ny' }],
        },
        {
          id: 'k05',
          gjelder: { steg: 'k02', er: 'nei' },
          tittel: 'Fyll inn kalkulasjonen på den nye trappen',
          bilder: [{ fil: 'k3-kalkyle-ny-trapp.webp', tekst: 'K3 — Trappekalkulasjon, fanen Adresser' }],
        },
        {
          id: 'p01',
          tittel: 'Trykk «Produksjonsseddel» i hovedmenyen',
          tekst: 'Under PRODUKSJONSPLANLEGGING. Selger lager kalkulasjonen — du lager produksjonsordren.',
          bilder: [{ fil: 'p1-opprett-produksjonsseddel.webp', tekst: 'P1 — Hovedmeny → Produksjonsseddel' }],
        },
        {
          id: 'p02',
          tittel: 'Produksjonsordren åpner seg',
          bilder: [{ fil: 'p2-produksjonsordre.webp', tekst: 'P2 — Skjemaet Produksjonsordre' }],
        },
        {
          id: 'p03',
          tittel: 'Trykk «Ny» på menylinja til Access',
          bilder: [{ fil: 'p3-trykk-ny.webp', tekst: 'P3 — Hjem → Poster → Ny' }],
        },
        {
          id: 'p04',
          tittel: 'Skriv inn kalkylenummeret i feltet «Nummer»',
          tekst: 'Nummeret henter opp kalkulasjonen og fyller ut produksjonsseddelen.',
          verdier: [
            { navn: 'Format', verdi: '0XXXXX' },
            { navn: 'Eksempel', verdi: '056869' },
          ],
          bilder: [{ fil: 'p4-skriv-kalkylenummer.webp', tekst: 'P4 — Blankt ark, feltet «Nummer»' }],
        },
        {
          id: 'p05',
          tittel: 'Kontroller informasjonen på produksjonsordren',
          tekst: 'Trappetype, prod.nr., kunde, leveringsadresse, byggherre, gangretning, uke og leveringsbetingelser.',
          bilder: [{ fil: 'p5-kontroller-informasjonen.webp', tekst: 'P5 — Fanen Produksjonsordre' }],
        },
        {
          id: 'p06',
          tittel: 'Oppdater varelinjene om nødvendig',
          husk: 'Varelinjene skal stemme med kalkylen. Avvik her følger med hele veien til produksjon.',
          bilder: [{ fil: 'p6-oppdater-varelinjer.webp', tekst: 'P6 — Fanen Varelinjer' }],
        },
        {
          id: 'p07',
          tittel: 'Legg inn «Viktige meldinger» og «Repodeler, BJ. inkl.»',
          tekst: 'Fanen Informasjon. Begge feltene skal fylles ut.',
          bilder: [{ fil: 'p7-viktige-meldinger.webp', tekst: 'P7 — Fanen Informasjon' }],
        },
        {
          id: 'p07r',
          gjelder: { steg: 'repo_bygg', er: 'ja' },
          tittel: 'Skriv «REPO PÅ BYGG» i Viktige meldinger',
          tekst: 'Repoet tegnes i Staircon, men skal ikke leveres. Det må stå tydelig på produksjonsordren.',
          merknad: { type: 'ny', tekst: 'Flyttet fra repo-fasen (r00), så det gjøres mens du står i Kalken.' },
        },
        {
          id: 'p07a',
          tittel: 'Spesifiser overflatebehandlingen fra kalkylen',
          tekst: 'Skriv nøyaktig hvilken overflatebehandling som står på kalkylen, for trinn og for resten av trappen.',
          husk: 'Står det «Ikke avklart» i fargekoden, må overflaten avklares før trappen går i produksjon.',
          verdier: [
            { navn: 'Eks.', verdi: 'TRINN I HARDVOKSOLJE 3072 RAV / RESTEN HVITMALT S0502-Y' },
            { navn: 'Eks.', verdi: 'EIK LAKKBEISET 3409 HVIT / RESTEN MALES S 0500-N' },
          ],
          felter: [{ nokkel: 'overflate', etikett: 'Overflatebehandling', plassholder: 'TRINN I … / RESTEN …', viktig: true }],
        },
        {
          id: 'p07b',
          tittel: 'Hvor mange endelister (EL) er det?',
          tekst: 'Endeliste er en 40x40 list som følger med returgelender. Tell opp antallet i kalkylen. Står som «- 2 stk. EL» under Repodeler.',
          felter: [{ nokkel: 'endelister', etikett: 'Antall endelister (EL)', plassholder: '0', viktig: true }],
        },
        {
          id: 'p07c',
          tittel: 'Skal det være trinnkasse?',
          husk: 'Dimensjoner, material og overflatebehandling på kassa.',
          valg: {
            type: 'janei',
            sporsmal: 'Har trappen trinnkasse?',
            ja: 'Spesifiser trinnkassen i produksjonsordren: dimensjoner, material og overflatebehandling.',
            nei: 'Ingen trinnkasse. Gå videre.',
          },
        },
        {
          id: 'p07d',
          tittel: 'Skal det være dekklister til vanger mellom vegger?',
          gjelder: { steg: 'vange', er: 'mellom_vegger' },
          valg: {
            type: 'janei',
            sporsmal: 'Trengs dekklister?',
            ja: 'Legg inn en kommentar i produksjonsordren: «Dekklist 55x10 for vanger», med én linje per lengde (Lengde 1, Lengde 2 osv.).',
            nei: 'Ingen dekklister. Gå videre.',
          },
          verdier: [{ navn: 'Dimensjon', verdi: '55x10' }],
          merknad: { type: 'endret', tekst: 'Vises nå bare når vangene står mellom vegger.' },
        },
        {
          id: 'p08',
          tittel: 'Huk AV for «Meldinger i bunnen av kalkulasjonen er hensyntatt»',
          bilder: [{ fil: 'p8-huk-av-meldinger.webp', tekst: 'P8 — Avkryssingsboksen nederst på Informasjon' }],
        },
        {
          id: 'p10',
          tittel: 'Trykk «Lagre»',
          tekst: 'Bekreft med «Ja» i dialogen «Lagre endringer».',
          bilder: [{ fil: 'p10-trykk-lagre.webp', tekst: 'P10 — Lagre endringer → Ja' }],
        },
        {
          id: 'p11',
          tittel: 'Trykk forhåndsvis og lagre som PDF',
          bilder: [{ fil: 'p11-forhandsvis-pdf.webp', tekst: 'P11 — Utskriftsknappen nederst i skjemaet' }],
        },
        {
          id: 'k10',
          tittel: 'Noter produksjonsnummer og PO-nummer',
          tekst: 'Fra Kalken får du produksjonsnummeret. Ta med deg PO-nummeret videre til Staircon.',
          felter: [{ nokkel: 'prosjektnr', etikett: 'Prosjektnummer (HXXX-XX)', plassholder: 'H483-26', viktig: true }],
          husk: 'Du trenger også riktige mål på bjelkelagsåpningen og høyden til etasjen før du starter i Staircon.',
        },
      ],
    },

    /* ─────────────────────── 2 · OPPSTART I STAIRCON ─────────────────────── */
    {
      id: 'oppstart',
      tittel: 'Oppstart i Staircon',
      undertittel: 'Nytt dokument eller kopi av eksisterende prosjekt',
      steg: [
        { id: 'o01', tittel: 'Åpne Staircon' },
        {
          id: 'o02',
          tittel: 'Nytt dokument eller kopi?',
          hurtigtaster: ['Ctrl + N', 'Ctrl + O'],
          valg: {
            type: 'janei',
            sporsmal: 'Kopierer du et eksisterende prosjekt?',
            knapper: { ja: 'Kopi', nei: 'Nytt' },
            ja: 'Åpne prosjektet (Ctrl + O) → Arkiv → Prosjektopplysninger → oppdater prosjektnummer og dato → OK. Kontroller så lysåpning, høyde, bjelkelagstykkelse, stusstrinn, gelender osv.',
            nei: 'Opprett nytt dokument (Ctrl + N) og fyll inn opplysningene i de neste stegene.',
          },
        },
        {
          id: 'o03',
          tittel: 'Skriv inn prosjektnummer',
          verdier: [
            { navn: 'Format', verdi: 'HXXX-XX' },
            { navn: 'Eksempel', verdi: 'H483-26' },
          ],
          tekst: 'Bokstav = måned (A = januar, B = februar, C = mars …), XXX = løpenummer, XX = år.',
          hjelp: {
            kilde: 'Prosjektopplysninger',
            tekst: 'Opplysningene her lagres i prosjektet og brukes bl.a. på utskrifter: kunde, adresse, kundens prosjektnummer og vårt prosjektnummer.',
          },
        },
        { id: 'o04', tittel: 'Fyll inn dato og initialer, klikk OK' },
        {
          id: 'o05',
          tittel: 'Sett etasjehøyde og bjelkelagstykkelse',
          hurtigtaster: ['Ctrl + F'],
          tekst: 'Ctrl + F åpner Egenskaper etasje. Høyde måles fra ferdig gulv til neste etasjes ferdige gulv.',
          husk: 'Staircon fyller inn verdiene fra FORRIGE prosjekt. Kontroller alltid mot skissen og kalken, også i nye prosjekter.',
          hjelp: {
            kilde: 'Egenskaper etasje',
            tekst: 'Høyde: fra ferdig gulv til neste etasjes ferdige gulv. Bjelkelagstykkelse: tykkelsen på bjelkelaget. Gulvtykkelse brukes hvis trappen monteres før ferdig gulv. Innskrevne verdier står ferdig utfylt når neste prosjekt opprettes.',
          },
          merknad: {
            type: 'endret',
            tekst: 'Gjaldt før bare kopierte prosjekter. Hjelpefilen viser at verdiene alltid hentes fra forrige prosjekt. OBS: Arkiv-menyen viser Ctrl + F = «Skriv ut på plotter» — test hvilken dialog Ctrl + F åpner.',
          },
        },
      ],
    },

    /* ────────────────────── 3 · BJELKELAGSÅPNING ────────────────────── */
    {
      id: 'bjelkelag',
      tittel: 'Bjelkelagsåpning',
      undertittel: 'Lysåpningen legges inn i bjelkelaget',
      steg: [
        { id: 'b01', tittel: 'Trykk «Lag bjelkelagsåpning»', hurtigtaster: ['F5'], merknad: { type: 'endret', tekst: 'La til hurtigtasten F5.' } },
        {
          id: 'b02',
          tittel: 'Velg riktig form på åpningen',
          tekst: 'Bla med pilknappene under bildet: firkantet, L-formet, U-formet eller rund åpning.',
          hjelp: {
            kilde: 'Lag bjelkelagsåpning',
            tekst: 'Huk av «Venstresvingt åpning» for å bytte til den venstresvingte varianten av åpningen. Bildet i dialogen endres tilsvarende.',
          },
        },
        {
          id: 'b02v',
          gjelder: { alle: [{ steg: 'ganglinje', er: 'venstre_opp' }, SVING] },
          tittel: 'Huk av «Venstresvingt åpning»',
          tekst: 'Trappen går venstre opp med sving, så åpningen må også være venstresvingt.',
          merknad: { type: 'ny', tekst: 'Fra hjelpefilen. Kontroller at dette stemmer med hvordan dere tegner.' },
        },
        {
          id: 'b03',
          tittel: 'Legg inn dimensjonene',
          tekst: 'Mål A, B (og C, D … for L-, U- og runde åpninger) som vist på bildet i dialogen.',
          husk: 'Riktige mål på bjelkelagsåpningen og høyden til etasjen kommer fra kalken og skissen.',
        },
        { id: 'b04', tittel: 'Huk av hvilke sider som skal ha vegger' },
        {
          id: 'b05',
          tittel: 'Klikk «Plasser ut»',
          tekst: '«Plasser ut + lag trapp» plasserer åpningen og åpner «Lage trapp» med en gang.',
          merknad: { type: 'endret', tekst: 'Knappen heter «Plasser ut» i hjelpefilen, ikke OK.' },
        },
      ],
    },

    /* ───────────────────────── 4 · LAGE TRAPP ───────────────────────── */
    {
      id: 'lagetrapp',
      tittel: 'Lage trapp',
      undertittel: 'Trappen plasseres i åpningen',
      steg: [
        { id: 't01', tittel: 'Trykk «Lage trapp»', hurtigtaster: ['F6'], merknad: { type: 'endret', tekst: 'La til hurtigtasten F6.' } },
        {
          id: 't02',
          tittel: 'Klikk på siden av åpningen trappen skal festes mot',
          tekst: '«Lage trapp»-vinduet kommer opp automatisk. Målene på åpningen brukes som trappens yttermål.',
          hjelp: {
            kilde: 'Lage trapp',
            tekst: 'Trappens yttermål hentes automatisk når du klikker på ønsket side av bjelkelagsåpningen. Uten åpning kan trappen plasseres direkte.',
          },
        },
        {
          id: 't02b',
          gjelder: { steg: 'trappetype', er: 'svingtrapp_90' },
          tittel: 'Velg trappemodell',
          tekst: 'Skal trappen ha hjørnemegler/stolpe, må du velge «Std m/hjørnemegler» i listen over trappemodeller (Egenskaper trapp).',
        },
        {
          id: 't03',
          tittel: 'Fyll inn dimensjoner og formen på trappen',
          tekst: 'Bla med pilknappene under bildet til riktig form: rett, L, U osv.',
          hjelp: {
            kilde: 'Lage trapp',
            tekst: 'Huk av «Venstresvingt trapp» for venstresving. Trappen kan også speilvendes ved utplassering: hold inne høyre musknapp og velg «Speilvend».',
          },
        },
      ],
    },

    /* ─────────────────── 5 · EGENSKAPER — KONTROLL MOT KALKYLE ─────────────────── */
    {
      id: 'egenskaper',
      tittel: 'Egenskaper – Trapp',
      undertittel: 'Alt her skal kontrolleres mot kalkylen',
      steg: [
        {
          id: 'e01',
          tittel: 'Stusstrinn eller barnesikring?',
          tekst: 'Står på ordrebekreftelsen: «TETT TRAPP/STUSSTRINN» eller «åpen trapp m/barnesikringslist».',
          husk: 'Én av delene skal alltid være valgt. Sjekk kalkylen.',
          valg: {
            type: 'janei',
            sporsmal: 'Hva har denne trappen?',
            knapper: { ja: 'Stusstrinn', nei: 'Barnesikring' },
            ja: 'Stusstrinn. Overlapp settes til 60 – 60. Punktet for barnesikring faller bort.',
            nei: 'Barnesikring. Overlapp settes til 40 – 40. Punktet for stusstrinn faller bort.',
          },
          verdier: [{ navn: 'Stusstrinn', verdi: 'vanligvis 15 mm' }],
        },
        {
          id: 'e02',
          tittel: 'Kontroller dekktrinn mot kalkylen',
          tekst: 'Vi har alltid dekktrinn. Sjekk kalkylen at det ikke står massiv papp («01 Dekktrinn i papp»).',
        },
        {
          id: 'e03',
          gjelder: { steg: 'e01', er: 'nei' },
          tittel: 'Sett overlapp på trinn med barnesikring',
          verdier: [{ navn: 'BS-overlapp', verdi: '40 – 40' }],
          tekst: 'Merk alle trinnene — ikke det siste trinnet som er gulvet (f.eks. 15). Høyreklikk, trykk Egenskaper og velg Trinn. Pass på at alle de andre trinnene er merket (f.eks. 1 til 14). Stå på fanen Allment, som viser to bokser med overlapp venstre / høyre. Med barnesikring skal den stå på 40 – 40.',
          bilder: [{ fil: 'e-trinn-allment-overlapp.webp', tekst: 'Egenskaper – Trinn → fanen Allment → overlapp venstre / høyre' }],
        },
        {
          id: 'e04',
          gjelder: { steg: 'e01', er: 'ja' },
          tittel: 'Sett overlapp på trinn med stusstrinn',
          verdier: [{ navn: 'Stusstrinn-overlapp', verdi: '60 – 60' }],
          tekst: 'Merk alle trinnene — ikke det siste trinnet som er gulvet (f.eks. 15). Høyreklikk, trykk Egenskaper og velg Trinn. Pass på at alle de andre trinnene er merket (f.eks. 1 til 14). Stå på fanen Allment, som viser to bokser med overlapp venstre / høyre. Med stusstrinn skal den stå på 60 – 60.',
          bilder: [{ fil: 'e-trinn-allment-overlapp.webp', tekst: 'Egenskaper – Trinn → fanen Allment → overlapp venstre / høyre' }],
        },
        {
          id: 'e05',
          tittel: 'Kontroller idealformelen',
          hurtigtaster: ['F7'],
          verdier: [
            { navn: 'Idealformel', verdi: '600 – 640' },
            { navn: 'Formel', verdi: '2 × opptrinn + 1 × inntrinn' },
          ],
          tekst: 'F7 åpner Egenskaper – Trapp. Idealformelen ligger på fanen Ganglinje/Trinnlegging.',
          bilder: [{ fil: 'sving-idealformel.webp', tekst: 'Juster «Avstand vange/radius» til idealformelen ligger mellom 600 og 640' }],
          hjelp: {
            kilde: 'Egenskaper trapp – Ganglinje/Trinnlegging',
            tekst: 'Avstand vange/radius: avstand fra referansevangen til ganglinjen, og radius på ganglinjen i svinger. Referansen (venstre/høyre vange) velges øverst på fanen.',
          },
        },
        { id: 'e06', tittel: 'Velg materiale hvis noe skal vises for kunde eller i 3D-modell' },
        {
          id: 'e07',
          tittel: 'Test trappen mot norm',
          hurtigtaster: ['Shift + F12'],
          tekst: 'Staircon kontrollerer trappen mot byggeforskriftene og viser resultatet i en egen dialog.',
          merknad: { type: 'ny', tekst: 'Forslag fra hjelpefilen. Slett steget hvis dere ikke bruker normtesten.' },
        },
      ],
    },

    /* ────────────────────────── 6 · REPOTRAPP ────────────────────────── */
    {
      id: 'repotrapp',
      tittel: 'Repotrapp',
      undertittel: 'Nortrapp-metoden',
      gjelder: tillegg('repo'),
      steg: [
        {
          id: 'r01',
          tittel: 'Velg metode for repoet',
          valg: {
            type: 'janei',
            sporsmal: 'Staircon-metoden eller Nortrapp-metoden?',
            knapper: { ja: 'Staircon-metoden', nei: 'Nortrapp-metoden' },
            ja: 'Staircon-metoden: fyll inn målene. Du må inn i trappen og justere manuelt etterpå. (Roger liker ikke denne.)',
            nei: 'Nortrapp-metoden: tegn repoet manuelt. Manuell metode, men ikke mye mer tidkrevende.',
          },
        },
        { id: 'r02', gjelder: { steg: 'r01', er: 'nei' }, tittel: 'Tegn repoet manuelt' },
        { id: 'r03', tittel: 'Tegn inn 2 trapper og still inn høyden ift. repoet' },
        {
          id: 'r04',
          tittel: 'Lag hakk i vange til repoet',
          tekst: 'Funksjoner → Hakk i vange.',
          bilder: [{ fil: 'repo-hakk-i-vange.webp', tekst: 'Funksjoner → Hakk i vange' }],
        },
      ],
    },

    /* ─────────────────────── 7 · SVINGTRAPP ─────────────────────── */
    {
      id: 'svingtrapp',
      tittel: 'Svingtrapp',
      undertittel: 'Idealformel og hjørnemål (vanger og midtmegler ligger i «Vanger og retting»)',
      gjelder: SVING,
      steg: [
        {
          id: 's01',
          tittel: 'Juster idealformelen først',
          hurtigtaster: ['F7'],
          verdier: [{ navn: 'Idealformel', verdi: '600 – 640' }],
          tekst: 'Egenskaper – Trapp → Ganglinje/Trinnlegging. Juster «Avstand vange/radius» (v/h).',
          bilder: [{ fil: 'sving-idealformel.webp', tekst: 'Juster disse to feltene til idealformelen treffer' }],
        },
        {
          id: 's02',
          tittel: 'Juster hjørnemål for trinnene',
          tekst: 'Egenskaper – Trapp → fanen Avansert, Dekklist → Metode: Kontur → rad «Hjørnemål».',
          bilder: [{ fil: 'sving-justere-hjornemal.webp', tekst: 'Hjørnemål settes per kontur (1, 2, 3)' }],
          hjelp: {
            kilde: 'Egenskaper trapp – Avansert',
            tekst: 'Metoden «Kontur, hjørnetrinn innside» lar deg styre hjørnemålene selv. Med «90 grader» kan kontur og hjørne ikke endres.',
          },
        },
        {
          id: 's03',
          tittel: 'Bruk forslag til hjørnemål på bred trapp',
          hurtigtaster: ['Alt + F9'],
          tekst: 'Juster hjørnemål for å få trinnene ut fra hjørnet. Alt + F9 lagrer gjeldende hjørnemål til Egenskaper trapp.',
          husk: 'Dette justeres på Ganglinje/Trinnlegging-fanen også.',
          verdier: [
            { navn: 'Kontur 1', verdi: '110,50' },
            { navn: 'Kontur 2', verdi: '110,50' },
          ],
          bilder: [{ fil: 'sving-hjornemal-bred-trapp.webp', tekst: 'Forslag på bred trapp' }],
          merknad: { type: 'endret', tekst: 'La til Alt + F9 fra hjelpefilen.' },
        },
        {
          id: 's04',
          tittel: 'Kontroller hvordan trinnene går rundt hjørnene',
          tekst: 'Et hjørnetrinn skal ikke treffe begge vangene i hjørnet samtidig. På bildet går trinn 9 rundt hjørnet på det smale partiet, men ikke på det brede. Det gjør monteringen enklere for montørene.',
          husk: 'Justeres med hjørnemål og «Bytt hjørnetrinn» — samme sted som overlapp på trinnene settes.',
          bilder: [{ fil: 'sving-avansert-dekklist-innhjorne.webp', tekst: 'Trinn 9 går rundt hjørnet på det smale partiet, ikke på det brede' }],
        },
      ],
    },

    /* ───────────────────── 8 · TOPPTRINN OG MEGLER ───────────────────── */
    {
      id: 'topptrinn',
      tittel: 'Topptrinn og megler',
      undertittel: 'Alle trapper med stolpe/megler på toppen',
      gjelder: tillegg('megler'),
      steg: [
        {
          id: 'm01',
          tittel: 'Velg øverste trinn → Egenskaper → Kobling mot vange',
          tekst: 'Megleren skal tres inn etter at vanger og trinn er montert.',
          verdier: [
            { navn: 'Tapp D, venstre', verdi: '7' },
            { navn: 'Tapp D, høyre', verdi: '40' },
          ],
          bilder: [{ fil: 'topptrinn-1-kobling-mot-vange.webp', tekst: 'Egenskaper – Trinn → Kobling mot vange → Tapp' }],
        },
        {
          id: 'm03',
          tittel: 'Kontroller resultatet',
          tekst: 'Sporet skal normalt bare lages på én side, vanligvis høyre. Unntak: trapper der megleren skal tres ned på begge sider (altså ikke monteres oppå gulvet på den andre siden sammen med gelenderet) — da lages det likevel spor bare på én side.',
          bilder: [{ fil: 'topptrinn-3-ferdig-resultat.webp', tekst: 'Ferdig resultat — spor i hjørnet' }],
        },
      ],
    },

    /* ───────────────────── 9 · VANGER, RETTING OG OMREGNING ───────────────────── */
    {
      id: 'vanger',
      tittel: 'Vanger og retting',
      undertittel: 'Rekkefølgen her er kritisk',
      steg: [
        {
          id: 'v00',
          tittel: 'Juster trinn og ganglinje FØRST',
          hurtigtaster: ['F8', 'F9'],
          husk: 'Ikke rett formen på vangene før trinn og ganglinje er ferdige. «Regn om ganglinje» (F8) og «Regn om trinnlegging» (F9) sletter alle endringer du har gjort på vangene.',
          merknad: { type: 'endret', tekst: 'La til F8 / F9 fra hjelpefilen.' },
        },
        {
          id: 'v01',
          tittel: 'Rett inn de synlige vangene',
          gjelder: { steg: 'vange', er: ['en_synlig', 'to_synlige'] },
          hurtigtaster: ['Ctrl + E', 'Alt + ←', 'Alt + →', 'Alt + X', 'Alt + Y', 'Alt + C'],
          tekst: 'De med gelender. Juster høyden på vangene i sideriss. Alt + ← / → viser venstre / høyre vange. Ctrl + E = markere punkter. Når du drar et punkt: Alt + C = fritt i alle akser, Alt + X = kun X, Alt + Y = kun Y.',
          bilder: [{ fil: 'sving-justering-av-vanger.webp', tekst: 'Justering av vanger i sideriss' }],
          merknad: { type: 'endret', tekst: 'Vises bare når det er synlige vanger. La til Alt + ← / → fra hjelpefilen.' },
        },
        {
          id: 'v02',
          tittel: 'Rett inn en del mellom to punkter',
          gjelder: { steg: 'vange', er: ['en_synlig', 'to_synlige'] },
          hurtigtaster: ['Ctrl + E', 'Alt + X', 'Alt + Y'],
          tekst: 'Velg «Markere punkter» (Ctrl + E) og merk de ytre punktene du vil lage en rett linje mellom. Høyreklikk og velg «Rett del».',
          bilder: [{ fil: 'v-rett-inn-linje-mellom-punkter.webp', tekst: 'Merk punktene, høyreklikk, «Rett del»' }],
        },
        {
          id: 'v03',
          tittel: 'Regn om underside',
          verdier: [{ navn: 'Antall ganger', verdi: 'minst 2' }],
          tekst: 'Stå i sideriss → trykk på vangen → høyreklikk → «Regn om underside». Roger sier 3 ganger, men det er usikkert hvorfor.',
          bilder: [{ fil: 'v-regn-om-underside-vanger.webp', tekst: 'Regn om undersiden av vangene etter at topp-kurvaturen er oppdatert' }],
        },
        {
          id: 'v04',
          tittel: 'Regn om gelender hvis du har flyttet på vanger',
          hurtigtaster: ['F11'],
          husk: 'F11 kan forandre ting som allerede er gjort. Kontroller trappen etterpå.',
        },
      ],
    },

    /* ──────────────────────────── 10 · GLASS ──────────────────────────── */
    {
      id: 'glass',
      tittel: 'Glass',
      undertittel: 'Kantbearbeiding på glassfelt',
      gjelder: tillegg('glass'),
      steg: [
        {
          id: 'g01',
          tittel: 'Marker punktene på glasset',
          hurtigtaster: ['Shift + F8', 'Ctrl + E'],
          bilder: [{ fil: 'glass-2-velg-punkter.webp', tekst: 'Markere punkter i produksjonsvisning' }],
        },
        {
          id: 'g02',
          tittel: 'Høyreklikk → «Velg kantbearbeiding»',
          bilder: [{ fil: 'glass-3-kantbearbeiding.webp', tekst: 'Høyreklikkmenyen på punktet' }],
        },
        {
          id: 'g03',
          tittel: 'Velg profil 0',
          verdier: [{ navn: 'Profil', verdi: '0' }],
          bilder: [{ fil: 'glass-4-velg-0.webp', tekst: 'Velg profile → 0 → OK' }],
        },
      ],
    },

    /* ────────────────────────── 11 · TV-RAMME ────────────────────────── */
    {
      id: 'tvramme',
      tittel: 'TV-ramme',
      undertittel: 'Fyll ut beskrivelsen når rutinen er avklart',
      gjelder: tillegg('tvramme'),
      steg: [
        {
          id: 'tv01',
          tittel: 'Sett opp TV-rammen',
          tekst: 'Beskrivelsen mangler foreløpig — skjermbildene viser resultatet.',
          bilder: [{ fil: 'tv-ramme-2.webp', tekst: 'TV-ramme, sideriss med mål' }],
        },
        {
          id: 'tv02',
          tittel: 'Kontroller mål og spilerplassering',
          bilder: [{ fil: 'tv-ramme-1.webp', tekst: 'Egenskaper – Gelender (ekstra gelender)' }],
        },
      ],
    },

    /* ────────────────────────── 11b · SPILER ────────────────────────── */
    {
      id: 'spiler',
      tittel: 'Spiler',
      undertittel: 'Spilevegg fra vange til tak',
      gjelder: tillegg('spiler_tak', 'spiler_2etg'),
      steg: [
        {
          id: 'sp01',
          gjelder: tillegg('spiler_tak'),
          tittel: 'Legg inn spilevegg fra vange til tak',
          tekst: 'Sjekk dimensjon og lengde mot varelinjene i produksjonsordren («28 Spilevegg i FURU 40x60 mm … 3797 mm»).',
        },
        {
          id: 'sp02',
          gjelder: tillegg('spiler_2etg'),
          tittel: 'Kontroller at spilene fortsetter i 2. etasje',
          tekst: 'Spilene skal føres videre i 2. etasje. Beskrivelsen fylles ut når rutinen er avklart.',
        },
        {
          id: 'sp03',
          tittel: 'Se egne tegninger for spilevegger',
          husk: 'Spiler printes som eget dokument og leveres på toppen til Simen i produksjonsordren.',
        },
      ],
    },

    /* ─────────────── 12 · PRODUKSJONSDOKUMENTER ─────────────── */
    {
      id: 'produksjon',
      tittel: 'Produksjonsdokumenter',
      undertittel: 'Utskrift, farger og arkivering',
      steg: [
        {
          id: 'pr01',
          tittel: 'Kjør F12 før du printer',
          hurtigtaster: ['F12'],
          tekst: 'F12 åpner Produksjonsmetode pr objekt. Huk av Prod.underlag for vanger, trinn, stusstrinn og stolper. Omfang: Etasje. Trinnoptimering: Inkludere rette.',
          bilder: [{ fil: 'pr1-f12-produksjonsunderlag.webp', tekst: 'Produksjonsmetode pr objekt — huk av det som skal ha produksjonsunderlag' }],
          hjelp: {
            kilde: 'Produksjonsmetode pr objekt',
            tekst: 'Tips: «Lagre som forvalg» husker avkryssingene. I neste prosjekt henter «Les inn forvalg» dem tilbake, så du slipper å krysse av hver gang.',
          },
          merknad: { type: 'endret', tekst: 'La til tipset om forvalg fra hjelpefilen.' },
        },
        {
          id: 'pr01b',
          tittel: 'Kontroller alle delene til produksjon',
          hurtigtaster: ['Shift + F8', 'Ctrl + Page Up', 'Ctrl + Page Down'],
          tekst: 'Shift + F8 viser produksjonsvisningen. Bla igjennom delene med Ctrl + Page Up og Ctrl + Page Down og kontroller dem.',
          bilder: [{ fil: 'pr-bla-igjennom-deler.webp', tekst: 'Bla igjennom delene med Ctrl + Page Up / Page Down' }],
        },
        {
          id: 'pr02',
          tittel: 'Print produksjonsliste',
          hurtigtaster: ['Ctrl + L'],
          tekst: 'Arkiv → «Skriv ut produksjonsliste…». Arkiver som PDF i din egen prosjektmappe, med navnet HXXX-XX – Prod.liste. Deretter printes 2 eksemplarer for arbeidsmappen.',
          bilder: [{ fil: 'pr2-skriv-ut-produksjonsliste.webp', tekst: 'Arkiv → Skriv ut produksjonsliste (Ctrl + L)' }],
        },
        {
          id: 'pr03',
          tittel: 'Print produksjonstegninger',
          hurtigtaster: ['Ctrl + D'],
          tekst: 'Arkiv → «Skriv ut produksjonstegninger…». Arkiver som PDF i din egen prosjektmappe, med navnet HXXX-XX – Vanger. Deretter printes 1 eksemplar for arbeidsmappen. Er vangene i andre spesielle materialer, printes 2 eksemplarer.',
          bilder: [{ fil: 'pr3-skriv-ut-produksjonstegninger.webp', tekst: 'Arkiv → Skriv ut produksjonstegninger (Ctrl + D)' }],
        },
        {
          id: 'pr04',
          tittel: 'Print produksjonsordre (planview)',
          hurtigtaster: ['Shift + F5', 'Ctrl + Shift + P'],
          tekst: 'Gjøres i Grunnriss (Shift + F5): trykk forhåndsvis ved siden av printersymbolet. Arkiveres som HXXX-XX – Plan.view. Printes i ett eksemplar og brukes til manuell kontroll av målene mot kalkylen og dine egne tegninger. Produksjonsordren fra Kalken har planview limt inn nederst.',
          bilder: [{ fil: 'pr4-produksjonsordre-planview.webp', tekst: 'Produksjonsordre med planview' }],
        },
        {
          id: 'pr05',
          gjelder: tillegg('spiler_tak', 'spiler_2etg'),
          tittel: 'Print spiler som eget dokument',
          hurtigtaster: ['Shift + F6'],
          tekst: 'Naviger til Sideriss → Returgelender. Leveres på toppen til Simen i produksjonsordren, så kan han delegere jobbene.',
          bilder: [
            { fil: 'pr-finne-view-gelender-spiler.webp', tekst: 'Sideriss → Returgelender — finne viewet for gelendere og spiler' },
            { fil: 'pr5-eksempel-spiler.webp', tekst: 'Eksempel på spiler — mål, c/c-avstand og beskrivelse i tekstfeltet' },
          ],
          merknad: { type: 'endret', tekst: 'Vises nå bare når trappen har spiler.' },
        },
        {
          id: 'pr05b',
          tittel: 'Kontroller alle dimensjoner mot kalkyle og skisse',
          tekst: 'Ta HXXX-XX – Plan.view som er printet ut og gå over alle dimensjoner: at det stemmer med kalkylen og skissen fra selger. Idealformel = 2 × opptrinn + inntrinn fra tittelfeltet.',
          bilder: [{ fil: 'pr-kontroller-dimensjoner-planview.webp', tekst: 'Kontroller alle dimensjoner og funksjoner mot kalkyle og skisse' }],
        },
        {
          id: 'pr06',
          tittel: 'Sorter arkene etter fargeoversikten',
          tekst: 'Alle ark printes og stiftes sammen etter malen, i en produksjonsmappe sammen med tilbud, skisse og kontrollapp. Lappene er kontrollsjekken før trappen sendes videre.',
          husk: 'Huskeregel: de eneste fargene som ikke trenger gul lapp med beskrivelse av behandlingen, er S0502-Y og S0500-N.',
          dokument: { fil: 'lappesystem-kontrollsjekk.pdf', tekst: 'Åpne «Lappesystem for produksjon» (PDF, 28.08.26)' },
          farger: [
            { farge: 'Gul — gelender', hex: '#c9a63a', tekst: 'Følger alltid gelenderproduksjon.' },
            {
              farge: 'Gul — overflate',
              hex: '#d6b855',
              tekst: 'Komplett malt S0502-Y eller S0500-N trenger ingen gul lapp til overflatebehandling. Malt S0502-Y/S0500-N + én annen farge: 1 stk gul (totalt 2 med gelender). Komplett eik, ask eller furu: 1 stk gul.',
            },
            {
              farge: 'Gul — 2 stk overflate',
              hex: '#e0c877',
              tekst: 'Når behandlingen har 2 farger — gjelder ikke S0502-Y og S0500-N: 2 gule lapper til overflate, totalt 3 med gelender. Beiset / oljet / lakkert i andre farger skal ha overflatebeskrivelse (farge/behandling) på lappen.',
            },
            { farge: 'Blå', hex: '#4a72c0', tekst: 'Til trinn.' },
            { farge: 'Hvit — vange', hex: '#e4e7f5', tekst: 'Til vanger — produksjonstegning.' },
            { farge: 'Hvit — bs/stusstrinn', hex: '#cfd3e5', tekst: 'Til stusstrinn eller barnesikring, stiftet bak (egen prodseddel).' },
            { farge: 'Hvit — repo', hex: '#bfc4da', tekst: 'Til repo — stemplet «REPO» med repotegning stiftet bak.' },
            {
              farge: 'Rød',
              hex: '#c0564a',
              tekst: 'Materialer som må finnes frem manuelt, ligger ikke klart ved CNC. Alt annet enn HDF i vanger → rød. Vanger over 4800 mm males på furu (HDF maks 4800 mm) → rød. Umalte vanger som skal males → rød. Annen farge enn S0502-Y / S0500-N → rød. Vanger over 4800 mm krever furu FS → rød + plantegning av vanger.',
            },
            { farge: 'Rosa', hex: '#c07ba0', tekst: 'Internt bruk.' },
            { farge: 'Grønn', hex: '#5aa07a', tekst: 'Til montør.' },
          ],
          merknad: { type: 'endret', tekst: 'Rettet skrivefeil «S05100-N» → «S0500-N» under Rød.' },
        },
        {
          id: 'pr07',
          tittel: 'Legg lappene og dokumentene i rekkefølge i plastmappa',
          tekst: 'Rekkefølge foran til bak: 1. gul(e) lapp(er) · 2. blå lapp · 3. hvit lapp – vange · 4. hvit lapp – bs/stusstrinn · 5. rosa · 6. grønn · 7. Staircon-tegning · 8. kalkulasjon · 9. måletegning.',
          husk: 'Hvit–vange og hvit–bs/stusstrinn festes sammen med binders.',
        },
        {
          id: 'pr07b',
          tittel: 'Lag produksjonsunderlag',
          hurtigtaster: ['Alt + F12'],
          tekst: 'Arkiv → «Lage produksjonsunderlag…» (Alt + F12). I vinduet Produksjonsunderlag: huk AV «Kjør» og trykk OK.',
          bilder: [
            { fil: 'pr-staircon-lag-produksjonsunderlag.webp', tekst: 'Arkiv → Lage produksjonsunderlag (Alt + F12)' },
            { fil: 'pr-lag-produksjonsunderlag-altf12.webp', tekst: 'Produksjonsunderlag — huk AV «Kjør» og trykk OK' },
          ],
          hjelp: {
            kilde: 'Lag produksjonsunderlag',
            tekst: '«Kjør»-kolonnen bestemmer om etterbehandlingsprogrammet (CNC-styrefilene) kjøres automatisk. Produksjonsfilene lagres der «Sti til produksjonsfiler» peker i Innstillinger.',
          },
        },
        {
          id: 'p09',
          tittel: 'Gå tilbake til Kalken og arkiver produksjonsordren',
          tekst: 'Trykk mappeikonet øverst til høyre og flytt produksjonsordren dit.',
          husk: 'Gjøres helt til slutt: når trappen er ferdig og slippes fra konstruksjonsavdelingen. Planview skal være limt inn i ordren.',
          bilder: [{ fil: 'p9-mappeikonet.webp', tekst: 'P9 — Mappeikonet øverst til høyre' }],
        },
        {
          id: 'pr08',
          tittel: 'Lever mappa til Simen',
          tekst: 'Simen fyller inn overflatebehandling og sender mappa inn i produksjon.',
        },
      ],
    },
  ],
};
