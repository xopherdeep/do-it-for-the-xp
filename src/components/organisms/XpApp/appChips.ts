/** The kinds of stat chip a row can wear: "12 XP", "5 GP", "3 AP", "25 MP", "40 HP", "x3" (qty) or a plain tag. */
export type AppChipKind = "xp" | "gp" | "ap" | "mp" | "hp" | "qty" | "tag";

/** One chip of a row's chips line, as XpAppChips draws it. */
export interface AppChipSpec {
  kind: AppChipKind;
  value: string | number;
  /** Optional Font Awesome duotone glyph, e.g. `fa-camera` */
  icon?: string;
  class?: string;
}

const REWARD_KINDS = ["xp", "gp", "ap"] as const;

/** A quest's rewards as chips, in XP, GP, AP order, leaving out the ones it does not pay. */
export function rewardChips(rewards: { xp?: number; gp?: number; ap?: number }): AppChipSpec[] {
  return REWARD_KINDS.filter((kind) => rewards[kind]).map((kind) => ({ kind, value: Number(rewards[kind]) }));
}
