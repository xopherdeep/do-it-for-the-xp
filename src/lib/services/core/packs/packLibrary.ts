/**
 * The packs a family added from a file or the Town Hall, beside the built-ins. A pack owns its id (packFormat.ts), so an
 * added pack with the id of one already added is the same pack in a newer version and takes its place; one with the id
 * of a built-in is turned away, because loading it would rewrite the built-in's records. All pure.
 */
import type { XpPack } from "./packFormat";

/** Why a pack can't be added, or null when it can */
export const addProblem = (pack: XpPack, builtIns: readonly XpPack[]): string | null => {
  const builtIn = builtIns.find((candidate) => candidate.id === pack.id);
  if (!builtIn) return null;
  return `This pack uses the id "${pack.id}", which belongs to the built-in ${builtIn.name} pack. Load that one from the list instead.`;
};

/** The added packs with this one in: in place of the one with its id, else at the end */
export const withAdded = (added: readonly XpPack[], pack: XpPack): XpPack[] => {
  const isKnown = added.some((candidate) => candidate.id === pack.id);
  return isKnown ? added.map((candidate) => (candidate.id === pack.id ? pack : candidate)) : [...added, pack];
};

export const withoutAdded = (added: readonly XpPack[], id: string): XpPack[] => added.filter((pack) => pack.id !== id);

export const isAdded = (added: readonly XpPack[], id: string): boolean => added.some((pack) => pack.id === id);

/** A tag for a new pack id: four letters and digits */
export const packTag = (random: () => number = Math.random): string =>
  Array.from({ length: 4 }, () => "abcdefghijkmnpqrstuvwxyz23456789"[Math.floor(random() * 32)]).join("");
