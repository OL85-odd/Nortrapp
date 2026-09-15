# Nortrapp TechDraw-makro

`nortrapp_techdraw.FCMacro` er en FreeCAD-makro som tar en sammenstilling
(assembly), finner alle unike detaljer, og lager to TechDraw-sider klare for
produksjon/CNC.

## Hva den lager

**Side 1 – `Page1_Oversikt`**
- Projeksjonsgruppe med isometrisk, topp-, front- og sidevisning av hele
  sammenstillingen, med skjulte linjer slått på (så alt er synlig, ikke bare
  det som vender mot kamera).
- BOM-/kappliste-tabell: posisjon, betegnelse, antall, material, ytre
  lengde/bredde/tykkelse. Tabellen hentes fra et regneark
  (`Nortrapp_Kappliste`) som også kan kopieres rett inn i et CNC-/
  produksjonsprogram.

**Side 2 – `Page2_Detaljer`**
- Ett rutenett-felt per unike del, sett ovenfra.
- Automatisk målsetting av ytre lengde og bredde.
- Automatisk målsetting av hulldiameter og hullposisjon (X/Y fra delens
  nedre venstre hjørne = origo).
- Tekst med posisjonsnummer, navn, antall, material og tykkelse.

## Bruk

1. Åpne dokumentet med sammenstillingen i FreeCAD.
2. (Valgfritt, men anbefalt) Velg assembly-roten (`App::Part` /
   Assembly-objektet) i modelltreet før du kjører makroen. Finner den ikke
   noe valgt, prøver den å finne roten selv.
3. Makro → Makroer → Kjør... → velg `nortrapp_techdraw.FCMacro`.

   Alternativ installasjon: kopier filen inn i FreeCAD sin makro-mappe
   (Rediger → Innstillinger → Generelt → Makro, feltet "Makro-mappe"), så
   dukker den opp i makro-listen automatisk.
4. Se Rapportvisningen (View → Panels → Report view) for status og
   eventuelle advarsler.
5. Makroen kan kjøres på nytt trygt – den rydder opp forrige kjørings
   objekter (sider, tabell, regneark, detaljtegninger) før den lager nye.

## Hvordan "unike deler" bestemmes

- Deler som er `App::Link` til samme grunnobjekt (vanlig i FreeCAD sin
  Assembly-arbeidsbenk når samme del brukes flere ganger) regnes alltid
  som samme del.
- Andre deler sammenlignes via et enkelt geometrisk fingeravtrykk
  (sorterte ytre mål + volum + areal, uavhengig av plassering/rotasjon).
  Dette fanger opp kopier som ikke er lenket til hverandre.

## Kjente begrensninger

- **Hull-deteksjon** virker for hull som vises som hele sirkler i
  toppvisningen – altså vertikale, gjennomgående hull i flate deler
  (typisk for spiler/lister). Kanthullede/skrå hull må målsettes manuelt
  etterpå.
- **Material** hentes fra en `Material`/`ShapeMaterial`/`MaterialName`-
  egenskap på delen, hvis den finnes. Finnes den ikke, blir feltet "-" og
  må fylles inn manuelt i regnearket eller på delene.
- Fingeravtrykk-metoden kan i sjeldne tilfeller slå sammen speilvendte
  deler med lik ytre form som "like" – sjekk kapplisten før du kutter.
- BOM-tabellobjektet (`TechDraw::DrawViewTable`) og
  målsettings-referanseformatet (`References2D`) har variert litt mellom
  FreeCAD-versjoner. Makroen prøver flere kjente formater og hopper
  defensivt over enkeltmål/tabellen med en advarsel i stedet for å
  krasje, dersom noe ikke stemmer i din versjon. Testet med tanke på
  FreeCAD 0.20/0.21/1.0-serien.
- Ingen automatisk posisjons-"ballong" på oversiktstegningen (side 1) –
  posisjonsnummer vises kun i BOM-tabellen. Kan legges til manuelt med
  TechDraw sitt ballong-verktøy om ønskelig.
- Mal (template) for sidene plukkes automatisk blant FreeCAD sine egne
  A4-landskap-maler. Finner den ingen, må du sette mal manuelt på hver
  side (TechDraw → Sideegenskaper → Mal).

## Justere oppsettet

Øverst i filen ligger en enkel CONFIG-seksjon:

```python
SPREADSHEET_NAME = "Nortrapp_Kappliste"
ITEM_START_NO = 1
ROUND_DECIMALS = 1
DETAIL_MARGIN_MM = 15.0
INNER_PADDING_MM = 6.0
TEXT_BLOCK_HEIGHT_MM = 16.0
```

Juster disse ved behov (f.eks. startnummer på posisjoner, avrunding av mål,
marger på rutenett-siden).

## Videre forbedringer (ikke implementert)

- Egen sidevisning per del for å målsette tykkelse direkte på tegningen
  (nå vises tykkelse kun som tekst).
- Posisjonsballonger på oversiktstegningen.
- Direkte CSV/Excel-eksport av kapplisten (regnearket kan i dag
  eksporteres manuelt via Fil → Eksporter, eller kopieres rett ut).
