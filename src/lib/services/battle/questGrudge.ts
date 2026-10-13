/**
 * Grudge marks (docs/Quest-Rooms-Spec.md 5.7). Running from a fight that carries a quest leaves one mark on that
 * quest's beast for that hero, up to three. Each mark makes the beast's strikes 25% harder (so 1.75x at the most)
 * until the quest is done: a logged completion, whatever the way, clears them. Nothing grows by itself over time.
 *
 * Pure rules over the hero's `questGrudges` record, keyed by quest id. No store, no Vue, nothing throws: the record may
 * be missing (a hero from before grudges), hold an old shape, or hold a mark count someone typed by hand, so every
 * reader clamps what it finds. The record also holds `lastAmbushAt`, which the ambush rule owns (questAmbush.ts); the
 * rules here keep it as they find it.
 */

/** The most marks a beast holds against a hero (tunable) */
export const MAX_GRUDGE_MARKS = 3;
/** The extra strike damage each mark adds (tunable) */
export const GRUDGE_PER_MARK = 0.25;
/** The factor at the most marks: 1.75 */
export const MAX_GRUDGE_FACTOR = 1 + MAX_GRUDGE_MARKS * GRUDGE_PER_MARK;

/** One quest's entry in the hero's record. Only `marks` is the grudge's; the stamps say when. */
export interface QuestGrudge {
  /** 0 to 3 */
  marks: number;
  /** When the hero last ran from this quest's fight (epoch milliseconds, or an ISO string) */
  lastFledAt?: number | string;
  /** When this quest last ambushed the hero (epoch milliseconds, or an ISO string); the ambush rule's own */
  lastAmbushAt?: number | string;
}

/** The hero's grudges: quest id to entry */
export type QuestGrudges = Record<string, QuestGrudge>;

/** True for a plain object: not null, not an array. */
export const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A mark count from anything the profile might hold: a whole number from 0 to 3, 0 for what cannot be read. */
export const clampMarks = (value: unknown): number => {
  const isReadable = typeof value === "number" || typeof value === "string";
  if (!isReadable) return 0;
  const count = Number(value);
  if (!Number.isFinite(count)) return 0;
  return Math.max(0, Math.min(MAX_GRUDGE_MARKS, Math.floor(count)));
};

/** The multiplier on every strike of a beast that holds this many marks: 1 + 0.25 a mark, from 1 to 1.75. */
export const grudgeFactor = (marks: unknown): number => 1 + clampMarks(marks) * GRUDGE_PER_MARK;

/** The marks a factor stands for (the inverse of grudgeFactor); 0 for a factor of 1 or less or one that cannot be read. */
export const marksOfFactor = (factor: unknown): number => {
  const isReadable = typeof factor === "number" && Number.isFinite(factor);
  if (!isReadable) return 0;
  return clampMarks(Math.round((factor - 1) / GRUDGE_PER_MARK));
};

const keyOf = (questId: unknown): string => (questId === undefined || questId === null ? "" : String(questId));

/** The entry a record holds for a quest, if it is an object. */
const entryOf = (grudges: unknown, questId: unknown): Record<string, unknown> | null => {
  const key = keyOf(questId);
  const record = isPlainRecord(grudges) ? grudges : {};
  const entry = key ? record[key] : undefined;
  return isPlainRecord(entry) ? entry : null;
};

/** The marks this quest's beast holds against the hero, from their (possibly missing or odd) record. */
export const marksFor = (grudges: unknown, questId: unknown): number => clampMarks(entryOf(grudges, questId)?.marks);

/** The factor on this quest's beast's strikes for the hero: 1 when the record holds nothing. */
export const grudgeFactorFor = (grudges: unknown, questId: unknown): number => grudgeFactor(marksFor(grudges, questId));

/** A copy of the record, or an empty one for anything that is not one. */
const copyOf = (grudges: unknown): QuestGrudges => (isPlainRecord(grudges) ? { ...(grudges as QuestGrudges) } : {});

/**
 * The record after the hero ran from this quest's fight: one more mark (three at the most) and the moment they fled.
 * The ambush stamp stays. A new record; the one given is not edited.
 */
export const addGrudgeMark = (grudges: unknown, questId: unknown, nowMs: number = Date.now()): QuestGrudges => {
  const next = copyOf(grudges);
  const key = keyOf(questId);
  if (!key) return next;
  const entry = entryOf(grudges, key) ?? {};
  next[key] = { ...(entry as Partial<QuestGrudge>), marks: Math.min(MAX_GRUDGE_MARKS, clampMarks(entry.marks) + 1), lastFledAt: nowMs };
  return next;
};

/**
 * The record after the quest was done: its marks gone. The ambush stamp is kept (the cooldown is the ambush rule's), so an
 * entry that holds one stays at 0 marks and an entry that holds nothing else is dropped. A new record.
 */
export const clearGrudgeMarks = (grudges: unknown, questId: unknown): QuestGrudges => {
  const next = copyOf(grudges);
  const key = keyOf(questId);
  const entry = entryOf(grudges, key);
  const hasNothingToClear = !entry;
  if (hasNothingToClear) return next;
  const lastAmbushAt = entry.lastAmbushAt as QuestGrudge["lastAmbushAt"];
  const hasCooldownToKeep = lastAmbushAt !== undefined && lastAmbushAt !== null;
  if (hasCooldownToKeep) next[key] = { marks: 0, lastAmbushAt };
  else delete next[key];
  return next;
};

/**
 * What the marks say, for a screen reader and the beast's tooltip: "Holds a grudge: 2 marks, hits 50% harder".
 * Empty for a beast with no grudge.
 */
export const grudgeLabel = (marks: unknown): string => {
  const count = clampMarks(marks);
  const hasNoGrudge = count === 0;
  if (hasNoGrudge) return "";
  return `Holds a grudge: ${count} ${count === 1 ? "mark" : "marks"}, hits ${Math.round(count * GRUDGE_PER_MARK * 100)}% harder`;
};
