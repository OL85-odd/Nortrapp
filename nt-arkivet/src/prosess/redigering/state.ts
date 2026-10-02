import { signal } from '@preact/signals';
import { gjeldende, publiserProsess } from '../arkiv';
import { beskrivProsessEndringer } from './endringer';
import type { Prosess } from '../types';

/* ─────────────────────────────────────────────────────────────
   Utkast for prosessredigering — samme prinsipp som for kartet:
   endringer samles i et utkast per prosess, kan angres, og blir
   gjeldende først når de publiseres med en kommentar.
   Utkastene huskes på maskinen.
   ───────────────────────────────────────────────────────────── */

const NOKKEL = 'nt-arkivet.prosessutkast';

function les(): Record<string, Prosess> {
  try {
    return JSON.parse(localStorage.getItem(NOKKEL) || '{}');
  } catch {
    return {};
  }
}

function skriv(u: Record<string, Prosess>) {
  try {
    localStorage.setItem(NOKKEL, JSON.stringify(u));
  } catch {
    /* full lagring — utkastet lever likevel til siden lukkes */
  }
}

export const prosessUtkast = signal<Record<string, Prosess>>(les());
const angre = new Map<string, Prosess[]>();
export const angreVersjon = signal(0); // trigger for «kan angre»-knappen

/** Utkastet hvis det finnes, ellers gjeldende versjon. */
export function arbeidskopi(id: string): Prosess | undefined {
  return prosessUtkast.value[id] ?? gjeldende(id);
}

export function endreProsess(id: string, fn: (p: Prosess) => Prosess) {
  const for_ = arbeidskopi(id);
  if (!for_) return;
  const etter = fn(for_);
  if (etter === for_) return;
  angre.set(id, [...(angre.get(id) ?? []).slice(-49), for_]);
  angreVersjon.value++;
  const neste = { ...prosessUtkast.value, [id]: etter };
  prosessUtkast.value = neste;
  skriv(neste);
}

export function kanAngre(id: string): boolean {
  void angreVersjon.value;
  return (angre.get(id)?.length ?? 0) > 0;
}

export function angreProsess(id: string) {
  const stabel = angre.get(id);
  if (!stabel?.length) return;
  const forrige = stabel.pop()!;
  angreVersjon.value++;
  const neste = { ...prosessUtkast.value, [id]: forrige };
  prosessUtkast.value = neste;
  skriv(neste);
}

export function forkastProsess(id: string) {
  const neste = { ...prosessUtkast.value };
  delete neste[id];
  angre.delete(id);
  angreVersjon.value++;
  prosessUtkast.value = neste;
  skriv(neste);
}

export function endringerI(id: string): string[] {
  const u = prosessUtkast.value[id];
  const g = gjeldende(id);
  return u && g ? beskrivProsessEndringer(g, u) : [];
}

export async function publiserUtkast(id: string, kommentar: string) {
  const u = prosessUtkast.value[id];
  if (!u) return;
  await publiserProsess(id, u, kommentar);
  forkastProsess(id);
}
