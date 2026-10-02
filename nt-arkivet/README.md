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
| `src/ui/` | Toppfelt, temavalg og velger for initialer |
| `src/views/` | Sider: oversikt og stasjonspanel |

Data lagres foreløpig i nettleseren. `store.ts` har et `Lager`-grensesnitt,
så lagringen kan byttes til en fil på serveren eller SharePoint uten å endre
resten av appen.
