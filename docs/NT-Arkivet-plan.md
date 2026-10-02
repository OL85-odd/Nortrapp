# NT-Arkivet – plan

> Status: **Godkjent – under bygging** · Versjon 0.3 · 02.10.2026 · Eier: OL

NT-Arkivet er Nortrapps interne system for prosesser, prosedyrer og opplæring.
Det viser hele løpet fra «kunde tar kontakt» til ettermarked som et T-banekart,
holder alle på samme standard, og lar nye ansatte læres opp steg for steg.

Første leveranse er frittstående (ingen abonnement, ingen sky). Datalaget bygges
slik at det kan flyttes til SharePoint senere uten å bygge om appen.

---

## 1. Begreper

| Begrep | Hva det er | Eksempel |
|---|---|---|
| **Linje** | En bane i T-banekartet | Hovedlinjen, Maskiner, HMS, Administrasjon |
| **Stasjon** | Et stopp på en linje. Peker til en prosedyre | «Tegning i Staircon» |
| **Prosedyre** | Instruksjon med NT-nummer, revisjoner og QR-kode | NT-014 Dekktrinn-bestilling |
| **Steg** | Én oppgave i en prosedyre | «Kjør F12 før du printer» |
| **Valg** | Spørsmål som styrer resten av stien | Stusstrinn eller barnesikring? |
| **Regel** | «Gjelder for» / «skjul hvis» – bestemmer hvilke steg som vises | Glass-steg bare når tillegget glass er valgt |
| **Prosjekt** | En konkret trapp som kjøres gjennom linjen | H483-26 |
| **Endring** | Loggført endring på et prosjekt, med dato, initialer og kommentar | «OL 02.10.26 – Vegar: endre bredde» |
| **Revisjon** | Loggført endring på en prosedyre (innholdet) | Rev. 3 – presisert repo-kant |

To typer innhold:

- **Prosedyrer** – statiske instruksjoner (kaffemaskin, avsugsfilter, kantpresse).
  Leses og følges. Kan ha intervall og kvittering.
- **Prosjektløp** – en trapp som går gjennom linjen med avkrysning, valg, logg og tid.
  Stasjonene på linjen *er* prosedyrene.

## 2. Linjekartet

**Hovedlinjen (rød):**

```
Kunde tar kontakt → Tilbud → Ordrebekreftelse → Produksjonsordre (Kalken)
  → Tegning ─┬─ Staircon
             ├─ Fusion 360
             └─ FreeCAD
  → Produksjon → Pakking → Levering → Montering → Oppfølging/vedlikehold → Ettermarked
```

**To typer kort:**
- **Linje** – en prosess der rekkefølgen betyr noe. Tegnes som T-banekart (rundt merke).
- **Samling** – rutiner og oppgaver i organisasjonen uten fast rekkefølge. Vises som
  fliser (firkantet merke). Start: Produksjonsmaskiner · Fasiliteter · HMS · Administrasjon.

Kort, stasjoner og fliser kan legges til, endres, flyttes og slettes i redigeringsmodus.
Stasjoner uten innhold vises som grå «under arbeid».

Forgreninger vises som sidespor. Valgt sti lyser i Nortrapp-rød, bortvalgte
grener blir grå prikker, og steg som må kontrolleres på nytt etter en endring får
en egen markering.

## 3. Moduser

| Modus | For hvem | Innhold |
|---|---|---|
| **Oversikt** | Alle | T-banekartet, se at alle punkter er tatt |
| **Produksjon** | Erfarne | Kompakt: tittel, verdier, hurtigtaster. Detaljer kan åpnes |
| **Opplæring** | Nye | Ett steg om gangen med full forklaring, bilder og hjelpetekst |
| **Redigering** | Admin (OL) | Låst med PIN-kode. Endre linjer, stasjoner, steg, valg og regler |

> PIN-koden i den frittstående versjonen hindrer uhell, men er ikke en ekte
> sikkerhetsbarriere. Ekte rettigheter kommer med SharePoint.

## 4. Prosjektløp (Staircon-stasjonen først)

1. **Nytt prosjekt.** Last inn ordrebekreftelse og plantegning (PDF eller skann),
   eller fyll ut for hånd.
2. **Bekreft uttrekk.** Appen viser hvert felt den fant, *hvor* i dokumentet det
   sto, og du godkjenner eller retter.
3. **Stien bygges** av svarene: trappetype, ganglinje, vanger, tillegg,
   stusstrinn eller barnesikring osv. Nye valg underveis endrer resten av stien.
4. **Arbeid.** Ett aktivt steg om gangen. Fast statuslinje øverst (prosjekt,
   fase, fremdrift, tid). Fast **hurtigtastpanel** som viser Staircon-tastene for
   akkurat dette steget.
5. **Rapport** til produksjonsmappa (utskrift/PDF), som i dag.

**Endringslogg.** Knappen «+ Endring» fylles automatisk med initialer og dato.
Du skriver kommentaren og kan merke hvilke steg som påvirkes. De stegene blir
«Må kontrolleres på nytt» til noen huker dem av igjen.

**Valghistorikk.** Endres et svar slik at utførte steg faller ut av stien,
vises de som «forlatt gren» i loggen. De slettes ikke.

**Tid.**
- Tiden går mens et steg er aktivt.
- **Pause** med hurtigtast. Ved retur kommer et valgfritt spørsmål, «Hva avbrøt?»,
  med svarene Hjelp kollega · Telefon/kunde · Møte · Annet.
- **Inaktiv i 10 min** gir spørsmålet «Jobbet du med prosjektet?», og tiden
  trekkes fra ved nei.
- Resultat: netto tid per steg og prosjekt, pluss en oversikt over avbrytelser.

**Tilbud** beholdes som egen fase (tilbudsnavn, filbane, Sketchfab-lenke,
«Gjør om til prosjekt»).

## 5. Prosedyrer (NT-Arkivet)

- NT-nummer, kategori, status (utkast/aktiv/utgått) og «erstattet av».
- Revisjonshistorikk med dato, forfatter og endringsnotat (påkrevd ved lagring).
- QR-lapp per prosedyre for utskrift og montering på maskin eller arbeidsplass.
- Innholdsblokker: tekst, bilde, video, tegning, sjekkliste, varsel, hurtigtaster
  og verdier.
- **Gjentakende oppgaver** får intervall (dag/uke/måned) og kvittering (hvem og når).
  Forfalte oppgaver markeres rødt.

## 6. Dokumentimport (nivå 1 + 2, ingen abonnement)

- **Lesbar PDF:** tekst hentes ut lokalt med pdf.js.
- **Skannet PDF eller bilde:** lokal OCR med Tesseract (norsk språkdata, kjører
  i nettleseren).
- **Regelbibliotek:** nøkkelord og mønstre gjøres om til felt. Biblioteket kan
  redigeres i appen, for eksempel `«Venstre opp»` → ganglinje = venstre_opp,
  eller `S\d{4}-[A-Z]` → fargekode.
- **Felter i første omgang:** kalkylenr., PO-nr., kunde, trappetype, ganglinje,
  vangeoppsett, tillegg (repo, gelender, glass, megler, TV-ramme, spiler),
  overflatebehandling, antall endelister, trinnkasse, dekklister, lysåpning og
  etasjehøyde.
- Ingenting brukes uten at du har bekreftet det.

### Funn fra eksempeldokumentene (H420-26, H430-26 / 056867, H433-26 / 055242)

Et prosjekt består av fire dokumenttyper:

| Dokument | Kilde | Form | Lesbarhet |
|---|---|---|---|
| **Ordrebekreftelse** | Kalken, skrevet ut i monospace | Skannet (iPhone) | OCR test: alle linjer vi trenger ble lest riktig. Bare beløp hadde småfeil, og dem trenger vi ikke |
| **Måleskisse** | Selger eller måler, håndtegnet | Skannet | Håndskrift kan ikke leses sikkert. Skal vises ved siden av skjemaet for manuell inntasting |
| **Produksjonsordre** (H-nr.) | Kalken, laget av konstruktør | Lesbar PDF | Fullt lesbar |
| **Plan.view** | Staircon, skrevet ut med kontrollmerker | PDF / skann | Tittelfelt: Proj, Etasjehøyde, Bjelkelagstykkelse, Inntrinn, Opptrinn, Frihøyde |

Nøkler i ordrebekreftelsen. Linjene starter med en **varegruppekode**:

| Mønster | Felt |
|---|---|
| `Reg.nr.: 056867` | Kalkylenr. (= «Best.nr.» i produksjonsordren) |
| `Lev.adr. …` | Kunde + leveringsadresse |
| `RETT TRAPP I FURU` | Trappetype + treslag |
| `LØP1: 885mm` | Trappebredde |
| `16 opptrinn` | Antall opptrinn |
| `gangretning Mellom vegger` / `HØYRE opp trappen` | Vangeoppsett **eller** ganglinje (samme felt i Kalken) |
| `13 Håndløper …` / `21 Returgelender … 850 mm` | Gelender |
| `37 TETT TRAPP/STUSSTRINN` vs. `åpen trapp m/barnesikringslist` | Stusstrinn eller barnesikring |
| `41 … fargekoder: S 0500-N / 3409 Hvit` / `ubehandlet` | Overflate |
| `01 Dekktrinn i papp` (vs. massiv papp) | Dekktrinn – kontroll e02 |
| `90 Dekklist …` | Dekklister – valg p07d |
| `Meglere type 11` / `Megler oppe …` | Tillegg megler |
| `Leveringstid: Uke 35` | Leveringsuke |

Funn fra de neste fem produksjonsordrene (H449, H454, H468, H469, H483):

- **Planview er limt inn** i nyere produksjonsordrer, og tittelfeltet fra Staircon kan
  leses som tekst (Etasjehøyde, Bjelkelagstykkelse, Inntrinn, Opptrinn, Frihøyde,
  meglerliste). Én PDF kan altså gi både produksjonsordre og Staircon-verdier.
- **Varegruppekodene er ikke konsekvente.** For eksempel kan `TETT TRAPP/STUSSTRINN`
  ha både kode 37 og kode 01, og `Malt` både 41 og 04. Reglene matcher derfor på tekst
  først, og koden brukes bare som hint.
- **Trappetypen står ikke i produksjonsordren**, bare i ordrebekreftelsen
  («1 stk. RETT TRAPP …»). Mangler den, blir brukeren spurt.
- **Nye nøkler:**
  - `REPO PÅ BYGG` → repo i bygg (tegnes, men leveres ikke)
  - `28 Spilevegg … fra vange til tak` → tillegg spiler
  - `Synlig veggvange m/TV-ramme – løp 2` / `Synlig VV2` → TV-ramme + synlig vange
  - `Returgelender … 1800 mm`, `runde sprosser/balustre 23mm TYPE 1` og
    `håndløper 40x67mm TYPE C` → gelenderets type, sprosser og lengde
  - `Meglere type 11` / `Megler oppe på løp 1 …` → megler
  - `- 2 stk. EL` / `- 0 el` → antall endelister
  - `TRESLAG: I FURU KOMPLETT` → treslag
  - `Ikke avklart` i fargekode → **rødt varsel**, fordi overflaten må avklares før produksjon
- **Idealformelen kan regnes ut automatisk:** 2 × opptrinn + inntrinn fra Staircon-feltet
  skal ligge mellom 600 og 640.
  Kontrollert på eksemplene: H430 = 624,6 · H468 = 607,5 · H483 = 635,5.

### Bekreftelse – regler for innlesing

1. Hvert felt får status **Funnet** (grønn), **Usikker** (gul) eller **Mangler** (rød).
2. Ved usikre eller manglende felt spør appen konkret. Eksempel: «Ganglinjen står ikke
   på ordrebekreftelsen. Se pilen på skissen: høyre eller venstre opp?» Skissen vises
   ved siden av.
3. **Alle felt må bekreftes** før brukeren kommer videre. Det gjelder også dem som ble
   funnet sikkert.
4. Det loggføres hvem som bekreftet, og når.

Kundedokumenter legges **ikke** i Git. Testsettet holdes lokalt, eller anonymiseres
før det legges inn i repoet.

**Automatisk kryss-kontroll**: når ordrebekreftelse, produksjonsordre og
Plan.view er lastet inn, sammenligner appen dem. Den kontrollerer bredde (LØP1 mot
Staircon), antall opptrinn, etasjehøyde (skisse mot Staircon), varelinjer
(ordrebekreftelse mot produksjonsordre), overflate og EL-antall.
Avvik vises som røde punkter på T-banekartet.
Hver kontroll må **bekreftes manuelt** («Jeg har sjekket tallene»), også når alt
stemmer. Avvik krever en kommentar før de kan godkjennes.

## 7. Design

Stilen er Nothing OS fra OddHub, med Nortrapp-farger.

| Token | Mørk | Lys |
|---|---|---|
| Bakgrunn | `#161619` med prikkrutenett | `#F4EFE0` (krem) |
| Kort | `#1C1C20`, tynn kant, avrundet | `#FBF8F0` |
| Tekst | `#ECEBE6` | `#19100E` |
| Aksent / valgt sti | `#A8332F` (Nortrapp-rød), lysnet for kontrast | `#A8332F` |
| Sekundær | `#5C8FC0` (Nortrapp-blå, lysnet) | `#004169` (Nortrapp-blå) |

- **Typografi:** punktmatrise (Doto) for tall og store titler, monospace med
  store bokstaver for etiketter, og en lesbar grotesk for brødtekst.
- **Logo:** hvit variant i mørk modus, farget i lys modus.
- Bytte mellom lys og mørk modus. Lesbarhet har høyeste prioritet.

## 8. Staircon-innhold – kvalitetssikring

Kilder: dagens `prosess.js` (v2.9) + `staircon.chm` (svensk, 187 sider) + den
norske ordlisten i hjelpefilen.

Dette skal rettes eller avklares:

- [ ] **Alt + C** finnes ikke i hjelpefilen. Alt + X / Alt + Y = flytt bare i X / Y
      i sideriss. I arbeidsvyen betyr Alt + X «flytt trinnpunkt, behold motsatt
      side» og Alt + Z «behold senter».
- [ ] **Ctrl + F** heter «Egenskaper etasje» i hjelpefilen.
- [ ] **Ctrl + L / Ctrl + D** for utskrift må verifiseres i norsk versjon.
- [ ] Legge til nyttige taster: F5 (bjelkelagsåpning), F6 (lage trapp),
      Ctrl + Shift + F6 (svingtrapp), F8 / F9 (regn om ganglinje / trinnlegging),
      Alt + F9 (lagre hjørnemål), Shift + F12 (test mot norm), Shift + F5–F8 (bytt vy).
- [ ] Hver Staircon-dialog i stegene kobles til tilsvarende hjelpeside, med
      forklaring oversatt til norsk via ordlisten.
- [ ] Nortrapps egne skjermbilder brukes først. Hjelpefilens bilder brukes der
      vi mangler eget.

## 9. Teknikk

- **Kode:** TypeScript + Vite, bygges til en mappe som kan ligge på fellesdisken.
  Små, lesbare moduler, slik at koden også kan brukes til å lære.
- **Data:** alt innhold (linjer, prosedyrer, regler) og alle prosjekter lagres som
  JSON gjennom et **datalag med adaptere**:
  1. *Lokal* – i nettleseren (prototype)
  2. *Fellesfil* – én `nt-arkivet.json` på fellesdisken, lest og skrevet via Edge/Chrome
  3. *SharePoint* – senere, samme grensesnitt
- **Eksport/import** av hele databasen som fil (backup).
- **Innhold** versjoneres i Git i dette repoet.

## 10. Første leveranse – milepæler

| # | Leveranse | Ferdig når |
|---|---|---|
| M1 ✅ | Rammeverk, designsystem (lys/mørk), T-banekart for hele Nortrapp | Kartet vises med alle linjer, og grå stasjoner er klikkbare |
| M2 ✅ | Staircon-stasjonen: innhold v3.0 (kvalitetssikret), opplærings- og produksjonsmodus, valg som bygger stien, hurtigtastpanel | Et helt prosjekt kan kjøres gjennom |
| M3 | Endringslogg med «må kontrolleres», valghistorikk, tid/pause/avbrudd, rapport, tilbud | Rapporten viser endringer og tid |
| M4 | Dokumentimport: pdf.js + OCR + redigerbart regelbibliotek | Eksempeldokumentene gir riktige felt |
| M5 | Prosedyrebibliotek med QR, revisjoner, intervall/kvittering, 2–3 eksempler | QR-lapp kan skrives ut |
| M6a ✅ | Redigeringsmodus (PIN) for kort, linjer, samlinger og stasjoner: utkast, angre, publisering med kommentar, historikk og tilbakestilling | Kartet kan bygges om uten kode |
| M6b | Redigering av innholdet i prosedyrer: steg, valg og regler | Et nytt steg kan legges til uten kode |

**Ikke med nå:** SharePoint, ekte innlogging, AI-tjenester, integrasjon med den
nye kalkulasjonsappen (vurderes når den finnes). Brukere velger initialer ved oppstart.

## 11. Drift på serveren

Verken Git eller Next.js trengs for å drifte. Git er bare for kildekoden.
I bunn ligger ett lite program på serveren (Windows, driftes av IT-konsulent,
Nortrapp har admin-tilgang). Det serverer appen og lagrer i en lesbar mappestruktur:

```
NT-Arkivet\
  app\                       ← selve nettsiden
  data\
    kart.json                 ← kort, stasjoner og revisjoner
    brukere.json
    prosedyrer\NT-014\        ← prosedyre.json, bilder\, revisjoner\
    prosjekter\2026\H483-26\  ← prosjekt.json, logg.txt, dokumenter\
  backup\                    ← automatisk kopi hver natt
```

Programmet leveres som én `.exe` som kjører som Windows-tjeneste.

## 12. Åpne punkter

1. **Server:** ✅ Avklart. Nortrapp har en server i bygget som alle når. Vi utvikler
   og tester lokalt først, og flytter dit når appen er klar.
2. **Flere eksempler:** svingtrapp, repo, glass, venstre opp og gelender mangler.
