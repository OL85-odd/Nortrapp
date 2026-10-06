# NT-Arkivet

Nortrapps interne system for prosesser, prosedyrer og opplæring. Se
[`docs/NT-Arkivet-plan.md`](../docs/NT-Arkivet-plan.md) for planen.

## Kom i gang

```bash
cd nt-arkivet
npm install
npm run dev        # utvikling med automatisk oppdatering, http://localhost:5173
npm run build      # typekontroll + ferdig bygg i dist/
npm run preview    # test det ferdige bygget lokalt
npm run build:fil  # én HTML-fil i dist-fil/ som kan åpnes med dobbeltklikk
npm test           # tester for redigering, migrering, prosessmotor og Staircon-innholdet
```

`dist-fil/index.html` er hele appen i én fil (fonter og logo bakt inn). Den
kan sendes på e-post eller legges på en minnepinne og åpnes uten installasjon.

Innholdet i `dist/` er en statisk nettside som kan legges på serveren i
bygget. Den trenger ikke internett, og fontene er inkludert.

## Struktur

| Mappe | Innhold |
|---|---|
| `src/theme/` | Designtokens (farger og fonter for lys og mørk modus) og grunnstiler |
| `src/data/` | Datamodell (`types.ts`), startinnhold (`seed.ts`) og lagring (`store.ts`) |
| `src/map/` | T-banekartet: `layout.ts` regner ut posisjoner, `MetroMap.tsx` tegner |
| `src/ui/` | Toppfelt, temavalg, velger for initialer og felles dialog |
| `src/edit/` | Redigeringsmodus: operasjoner (`ops.ts`), utkast/PIN/publisering (`state.ts`), paneler og dialoger |
| `src/prosess/` | Prosessmotoren (`motor.ts`), prosjekter (`prosjekter.ts`), Staircon-innholdet (`staircon/`) og visningene for opplæring, produksjon og oversikt (`ui/`) |
| `src/import/` | Innlesing av ordrebekreftelse, produksjonsordre og Planview: lesing med pdf.js og OCR (`les.ts`), mønsterspråket (`monster.ts`), tolking (`tolk.ts`) og dialogen (`InnlesingDialog.tsx`). Regelbiblioteket for Staircon ligger i `src/prosess/staircon/innlesing.ts` |
| `src/views/` | Sider: oversikt, stasjonspanel, arbeidsflate (prosjektliste) og prosjektvisning |

Data lagres foreløpig i nettleseren. `store.ts` har et `Lager`-grensesnitt,
så lagringen kan byttes til en fil på serveren eller SharePoint uten å endre
resten av appen.

## Endre Staircon-innholdet

Innholdet ligger i `src/prosess/staircon/staircon.ts`. Bildene ligger i
`src/prosess/staircon/bilder/`. Kjør `npm test` etter endringer: testene sjekker at
alle steg-ID-er er unike, at reglene peker på steg som finnes, at bildene finnes og
at hurtigtastene er forklart. Se [`docs/Staircon-v3-endringer.md`](../docs/Staircon-v3-endringer.md).

## Innlesing av ordre (OCR)

«⇩ Les inn ordre» på Staircon-siden tar imot ordrebekreftelse, produksjonsordre og
Planview som PDF eller bilde. Alt leses lokalt i nettleseren:

- **Lesbar PDF** leses med pdf.js. Kolonner markeres med «│».
- **Skannet PDF/bilde** leses med Tesseract (norsk språkdata, `@tesseract.js-data/nor`).
- Motoren, arbeideren og språkdataene settes sammen til ett arbeider-skript.
  Bare slik virker OCR også fra en enkelt HTML-fil (`file://`).
- Hvert felt får status funnet/usikker/mangler, vises med linjen det ble funnet i og
  må bekreftes. Dokumentene lagres med prosjektet (IndexedDB).
- Reglene redigeres under *Rediger prosess → Innlesing av ordre* og kan testes der.

Kundedokumenter skal ikke i Git. Testene i `src/import/tolk.test.ts` bruker oppdiktede linjer.

## Lagring og backup

Se *Lagring og backup* i appen (`#/lagring`) og `docs/NT-Arkivet-plan.md` kapittel 11.

- **Fellesmappe** (`src/data/lagring/mappe.ts`): databasen skrives som lesbare filer
  (`format.ts`). Endringer fra to PC-er flettes (`flett`), og det lages én daglig zip.
- **Manuell backup** (`backup.ts`) gir én zip med alt. Gjenoppretting gjelder både zip-filer
  og daglige kopier.
- **Papirkurv** (`src/data/papirkurv.ts`) beholder det som slettes i 30 dager.
