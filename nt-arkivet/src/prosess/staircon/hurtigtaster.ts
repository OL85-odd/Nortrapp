/* Staircon-hurtigtaster med norsk forklaring.
   Kilde: «Tilgjengelige hurtigtaster» i staircon.chm (oversatt), pluss
   Nortrapps egne, bekreftet i norsk Staircon (Arkiv-menyen) eller av OL.
   `kontroller` = kildene er uenige, må testes i Staircon. */

import type { Hurtigtast } from '../types';

export const HURTIGTASTER: Record<string, Hurtigtast> = Object.fromEntries(
  (
    [
      ['F1', 'Hjelp for vinduet/dialogen du står i'],
      ['F3', 'Automatisk målsetting'],
      ['F5', 'Lag bjelkelagsåpning'],
      ['F6', 'Lage trapp'],
      ['Ctrl + Shift + F6', 'Lag svingtrapp (winder)'],
      ['F7', 'Egenskaper – Trapp'],
      ['F8', 'Regn om ganglinje'],
      ['F9', 'Regn om trinnlegging'],
      ['F10', 'Regn om sideriss'],
      ['F11', 'Regn om rekkverk/gelender'],
      ['F12', 'Regn om produksjonsunderlag (Produksjonsmetode pr objekt)'],
      ['Alt + F9', 'Lagre gjeldende hjørnemål til Egenskaper – Trapp'],
      ['Alt + F12', 'Lag produksjonsunderlag'],
      ['Shift + F12', 'Test trappen mot norm'],
      ['Alt + ←', 'Vis venstre vange i sideriss'],
      ['Alt + →', 'Vis høyre vange i sideriss'],
      ['Alt + X', 'Flytt punkt bare i X-retning (sideriss)'],
      ['Alt + Y', 'Flytt punkt bare i Y-retning (sideriss)'],
      ['Alt + Z', 'Flytt trinnpunkt, behold senter (arbeidsvy)'],
      ['Ctrl + E', 'Markere punkter'],

      ['Ctrl + N', 'Nytt prosjekt'],
      ['Ctrl + O', 'Åpne prosjekt'],
      ['Ctrl + S', 'Lagre prosjektet'],
      ['Ctrl + P', 'Skriv ut aktivt vindu'],
      ['Ctrl + Shift + P', 'Forhåndsvis utskrift'],
      ['Ctrl + Q', 'Mål avstand'],
      ['Ctrl + R', 'Legg til/fjern rekkverk på markert vange'],
      ['Ctrl + Z', 'Angre'],
      ['Ctrl + Page Up', 'Neste trapp (sideriss) / neste del (produksjonsvisning)'],
      ['Ctrl + Page Down', 'Forrige trapp (sideriss) / forrige del (produksjonsvisning)'],
      ['Shift + F5', 'Vis arbeidsvy (grunnriss)'],
      ['Shift + F6', 'Vis sideriss'],
      ['Shift + F7', 'Vis 3D'],
      ['Shift + F8', 'Vis produksjonsvisning'],
      ['Home', 'Zoom hele bildet'],
      ['Mellomrom', 'Tegn alt på nytt'],
    ] as [string, string][]
  )
    .map(([tast, tekst]): [string, Hurtigtast] => [tast, { tast, tekst }])
    .concat([
      ['Alt + C', { tast: 'Alt + C', tekst: 'Flytt punkt (vertex) fritt i alle akser (sideriss)' }],
      ['Ctrl + L', { tast: 'Ctrl + L', tekst: 'Skriv ut produksjonsliste (Arkiv-menyen)' }],
      ['Ctrl + D', { tast: 'Ctrl + D', tekst: 'Skriv ut produksjonstegninger (Arkiv-menyen)' }],
      [
        'Ctrl + F',
        {
          tast: 'Ctrl + F',
          tekst: 'Egenskaper etasje (høyde og bjelkelagstykkelse)',
          kontroller: 'Arkiv-menyen viser Ctrl + F = «Skriv ut på plotter». Hjelpefilen sier Egenskaper etasje.',
        },
      ],
      ['Ctrl + Shift + D', { tast: 'Ctrl + Shift + D', tekst: 'Hoveddatabasen' }],
    ]),
);

/** Taster som er nyttige uansett steg. */
export const ALLTID = ['Shift + F5', 'Shift + F6', 'Shift + F7', 'Shift + F8', 'Ctrl + S', 'F1'];

/** Startlisten for Staircon-prosessen. Redigeres senere i appen. */
export const STAIRCON_TASTER: Hurtigtast[] = Object.values(HURTIGTASTER);
