import type { SignupStatus } from "./types";

export const STATUS_CYCLE: SignupStatus[] = [
  "mangler_svar",
  "tilmeldt",
  "maaske",
  "bekraeftet",
  "frameldt",
];

export const STATUS_LABEL: Record<SignupStatus, string> = {
  mangler_svar: "Mangler svar",
  tilmeldt: "Tilmeldt",
  maaske: "Måske",
  bekraeftet: "Bekræftet",
  frameldt: "Deltager ikke",
};

export const STATUS_SHORT: Record<SignupStatus, string> = {
  mangler_svar: "?",
  tilmeldt: "T",
  maaske: "M",
  bekraeftet: "✓",
  frameldt: "–",
};

export const STATUS_STYLE: Record<SignupStatus, string> = {
  mangler_svar: "bg-slate-100 text-slate-500 border-slate-200",
  tilmeldt: "bg-blue-100 text-blue-700 border-blue-300",
  maaske: "bg-amber-100 text-amber-700 border-amber-300",
  bekraeftet: "bg-emerald-100 text-emerald-700 border-emerald-300",
  frameldt: "bg-rose-100 text-rose-700 border-rose-300",
};

export function nextStatus(current: SignupStatus): SignupStatus {
  const idx = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]!;
}
