import type { Prosess, Steg } from '../types';

/* Beskriver forskjellen mellom to versjoner av en prosess med vanlige ord. */

const FELT: [keyof Steg, string][] = [
  ['tekst', 'tekst'],
  ['husk', '«Husk!»'],
  ['bilder', 'bilder'],
  ['video', 'video'],
  ['verdier', 'verdier'],
  ['hurtigtaster', 'hurtigtaster'],
  ['valg', 'valg'],
  ['felter', 'felter'],
  ['hjelp', 'hjelpetekst'],
  ['dokument', 'dokument'],
  ['lenke', 'lenke'],
  ['farger', 'fargelapper'],
  ['gjelder', 'regel'],
];

export function beskrivProsessEndringer(for_: Prosess, etter: Prosess): string[] {
  const ut: string[] = [];
  if (for_.navn !== etter.navn) ut.push(`Prosessen heter nå «${etter.navn}»`);
  for (const [k, navn] of [
    ['type', 'type'],
    ['kunLesing', '«Kun lesing»'],
    ['intervallDager', 'intervall'],
    ['kjektAVite', '«Kjekt å vite»'],
    ['hurtigtaster', 'hurtigtastlisten'],
    ['beskrivelse', 'beskrivelse'],
  ] as [keyof Prosess, string][]) {
    if (JSON.stringify(for_[k] ?? null) !== JSON.stringify(etter[k] ?? null)) ut.push(`Endret ${navn}`);
  }

  const fA = new Map(for_.faser.map((f) => [f.id, f]));
  const fB = new Map(etter.faser.map((f) => [f.id, f]));
  for (const f of etter.faser) {
    const g = fA.get(f.id);
    if (!g) ut.push(`Ny fase: ${f.tittel}`);
    else {
      if (g.tittel !== f.tittel) ut.push(`Fasen «${g.tittel}» heter nå «${f.tittel}»`);
      if (JSON.stringify(g.gjelder ?? null) !== JSON.stringify(f.gjelder ?? null)) ut.push(`${f.tittel}: ny regel`);
    }
  }
  for (const f of for_.faser) if (!fB.has(f.id)) ut.push(`Fase slettet: ${f.tittel}`);
  const rekke = (p: Prosess, andre: Map<string, unknown>) => p.faser.filter((f) => andre.has(f.id)).map((f) => f.id).join();
  if (rekke(for_, fB) !== rekke(etter, fA)) ut.push('Ny rekkefølge på fasene');

  const sA = new Map(for_.faser.flatMap((f) => f.steg.map((s) => [s.id, { s, fase: f.id }] as const)));
  const sB = new Map(etter.faser.flatMap((f) => f.steg.map((s) => [s.id, { s, fase: f.id }] as const)));
  for (const [id, { s, fase }] of sB) {
    const g = sA.get(id);
    if (!g) {
      ut.push(`Nytt steg: ${s.tittel}`);
      continue;
    }
    if (g.s.tittel !== s.tittel) ut.push(`«${g.s.tittel}» heter nå «${s.tittel}»`);
    const endret = FELT.filter(([k]) => JSON.stringify(g.s[k] ?? null) !== JSON.stringify(s[k] ?? null)).map(([, n]) => n);
    if (endret.length) ut.push(`${s.tittel}: endret ${endret.join(', ')}`);
    if (g.fase !== fase) ut.push(`${s.tittel}: flyttet til fasen «${fB.get(fase)?.tittel}»`);
  }
  for (const [id, { s }] of sA) if (!sB.has(id)) ut.push(`Steg slettet: ${s.tittel}`);

  // Rekkefølge innen faser (bare steg som finnes begge steder)
  for (const f of etter.faser) {
    const g = fA.get(f.id);
    if (!g) continue;
    const felles = (liste: Steg[], andre: Steg[]) => liste.filter((s) => andre.some((a) => a.id === s.id)).map((s) => s.id).join();
    if (felles(g.steg, f.steg) !== felles(f.steg, g.steg)) ut.push(`Ny rekkefølge i ${f.tittel}`);
  }
  return ut;
}
