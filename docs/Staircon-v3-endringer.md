# Staircon-innhold v3.0 – endringer fra v2.9

Innholdet ligger i `nt-arkivet/src/prosess/staircon/staircon.ts`. Steg som er
nye eller endret er merket i appen med en blå boks («Nytt i v3.0» / «Endret i v3.0»).
Gå gjennom dem og si fra hva som skal beholdes, endres eller fjernes.

## Ny struktur
- **Oppsett er spørsmål i flyten.** Trappetype → ganglinje → vangeoppsett →
  synlig side/omfang → tillegg → repo i bygg → gelenderdetaljer → spesielle
  tilpasninger. Hvert svar bygger resten av stien, og steg bak ubesvarte valg
  vises som «+N steg bak valg».
- **Alle regler er like.** `gjelder` og `skjulHvis` er slått sammen til én type
  regel, så «stusstrinn → 60–60» og «selger har laget kalkylen → hopp over K»
  fungerer på samme måte.

## Rettet eller lagt til fra hjelpefilen (staircon.chm)
| Steg | Endring |
|---|---|
| o05 | «Sett etasjehøyde og bjelkelagstykkelse (Ctrl + F)» gjelder nå **alle** prosjekter. Hjelpefilen sier at verdiene fra forrige prosjekt fylles inn automatisk. |
| b01 / t01 | Hurtigtastene F5 og F6. |
| b02v | **Nytt:** «Huk av Venstresvingt åpning» for venstre opp med sving. Kontroller! |
| b05 | Knappen heter «Plasser ut» (og «Plasser ut + lag trapp»), ikke OK. |
| t02 / t03 | Forklaring fra hjelpefilen: klikk på siden av åpningen. Speilvend med høyre musknapp. |
| e07 | **Nytt forslag:** «Test trappen mot norm» (Shift + F12). Slett hvis dere ikke bruker den. |
| s03 | Alt + F9 lagrer hjørnemål til Egenskaper trapp. |
| v00 | F8 / F9 sletter vangeendringer. |
| v01 | Alt + ← / → viser venstre / høyre vange. **Alt + C står ikke i hjelpefilen**, kontroller. |
| pr01 | Tips: «Lagre som forvalg» / «Les inn forvalg» i F12-dialogen. |
| pr01b / pr04 | Shift + F8 (produksjonsvisning), Shift + F5 (grunnriss). |
| pr07b | Forklaring på «Kjør»-kolonnen (CNC-etterbehandling). |

## Endret logikk
| Steg | Endring |
|---|---|
| p07r | «REPO PÅ BYGG» i Viktige meldinger, flyttet fra repo-fasen til Kalken. |
| p07a | Husk: «Ikke avklart» i fargekoden må avklares før produksjon. |
| p07d | Dekklister vises bare når vangene står mellom vegger. |
| v01 / v02 | Retting av synlige vanger vises bare når det finnes synlige vanger. |
| pr05 | Spiler-utskrift vises bare når trappen har spiler. |
| pr06 | Skrivefeil «S05100-N» → «S0500-N». |

## Ikke verifisert (trenger deg)
- **Ctrl + L / Ctrl + D** for utskrift står ikke i hjelpefilen. Er de riktige i norsk versjon?
- **Alt + C** (flytt i begge akser), se over.
