import type { Ability, AbilityStatus, TimePeriod } from "@/types/abilities";
import type { HeroAbilitySnapshot, HeroApWindows } from "@/lib/services/abilities/heroAbilityStatus";

/**
 * What one Power says on its row of the Powers app: the kind, the AP it asks for and how far the hero has come, the
 * cost and frequency, the one line that says why it cannot be cast right now, and whether Cast works.
 * Pure: the page owns the hero, the statuses and the casting. The same words as the Power card of a fight uses
 * (components/XpPowerCard.vue), which stays as it is for the battle sheet.
 */

/** "this week" and friends, for the line that names the AP the Power asks for */
const PERIOD_LABEL: Partial<Record<TimePeriod, string>> = {
  daily: "today",
  weekly: "this week",
  monthly: "this month",
  quarterly: "this quarter",
  yearly: "this year",
};

/** Which AP window the meter reads; periods without a window of their own read the lifetime total */
const AP_WINDOW: Partial<Record<TimePeriod, keyof HeroApWindows>> = {
  daily: "daily",
  weekly: "weekly",
  monthly: "monthly",
  quarterly: "quarterly",
  yearly: "yearly",
};

const FREQUENCY_LABEL: Record<TimePeriod, string> = {
  hourly: "once an hour",
  daily: "once a day",
  weekly: "once a week",
  monthly: "once a month",
  quarterly: "once a quarter",
  biannual: "twice a year",
  yearly: "once a year",
  flat: "anytime",
};

/** When a cooling Power is back, by how often it can be cast */
const BACK_LABEL: Record<TimePeriod, string> = {
  hourly: "in an hour",
  daily: "tomorrow",
  weekly: "next week",
  monthly: "next month",
  quarterly: "next quarter",
  biannual: "in six months",
  yearly: "next year",
  flat: "soon",
};

/** Whole numbers stay whole; a fraction of AP shows one decimal */
export const fmtAp = (n: number): string => String(Math.round(n * 10) / 10);

export interface PowerRow {
  id: string;
  name: string;
  description: string;
  /** Font Awesome icon class for the leading tile (`fa-film`) */
  icon: string;
  type: Ability["type"];
  /** "Spell" or "Privilege" */
  typeLabel: string;
  mpCost: number;
  /** "once a day", "anytime" ... */
  frequencyLabel: string;
  /** AP the Power asks for in its window (0 when it asks for none) */
  needed: number;
  earned: number;
  /** "3/10 AP today" */
  apText: string;
  /** CSS width of the meter fill, "0%" to "100%" */
  meterWidth: string;
  /** Why the Power cannot be cast right now (empty when it can) */
  stateLine: string;
  canCast: boolean;
  locked: boolean;
}

export interface PowerRowOptions {
  /** Set while the hero owes the Hospital: Cast stays disabled and says why */
  groundedReason?: string | null;
  /** This Power is being cast right now, so a double tap cannot charge the MP twice */
  casting?: boolean;
}

export const buildPowerRow = (
  ability: Ability,
  status: AbilityStatus,
  snapshot: HeroAbilitySnapshot,
  options: PowerRowOptions = {}
): PowerRow => {
  const { groundedReason = null, casting = false } = options;
  const needed = Number(ability.apRequirement?.amount) || 0;
  const period: TimePeriod = ability.apRequirement?.period ?? "flat";
  const periodLabel = PERIOD_LABEL[period] ?? "in all";
  const earned = snapshot.ap[AP_WINDOW[period] ?? "total"] ?? 0;
  const ratio = needed > 0 ? Math.min(earned / needed, 1) : 1;

  let stateLine = "";
  // A Power that is still locked, cooling or short of MP keeps saying so; grounded speaks for the ones that were ready
  if (groundedReason && status === "available") {
    stateLine = groundedReason;
  } else {
    switch (status) {
      case "locked":
        stateLine = earned < needed ? `${fmtAp(needed - earned)} AP to go` : "Locked";
        break;
      case "unlocked":
        stateLine = `Need ${ability.mpCost} MP`;
        break;
      case "cooling":
        stateLine = `Cooling · back ${BACK_LABEL[ability.frequency] ?? BACK_LABEL.flat}`;
        break;
      case "used":
        stateLine = "Used";
        break;
      case "active":
        stateLine = "Active";
        break;
      default:
        stateLine = "";
    }
  }

  const icon = ability.icon ?? "";
  return {
    id: ability.id,
    name: ability.name,
    description: ability.description ?? "",
    icon: icon.startsWith("fa-") ? icon : "fa-sparkles",
    type: ability.type,
    typeLabel: ability.type === "in-game" ? "Spell" : "Privilege",
    mpCost: Number(ability.mpCost) || 0,
    frequencyLabel: FREQUENCY_LABEL[ability.frequency] ?? FREQUENCY_LABEL.flat,
    needed,
    earned,
    apText: `${fmtAp(earned)}/${fmtAp(needed)} AP ${periodLabel}`,
    meterWidth: `${Math.round(ratio * 100)}%`,
    stateLine,
    canCast: status === "available" && !groundedReason && !casting,
    locked: status === "locked",
  };
};
