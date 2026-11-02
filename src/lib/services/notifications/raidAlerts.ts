/**
 * Raid alerts: a heads-up a day before a raid beast flees while it still stands, so the heroes on this device get one
 * last chance to strike. The plan is pure: the raids, the heroes and the clock are handed in, and nothing here books or
 * rings anything (raidAlertWatch.ts does that). The device's on/off choice is kept here too.
 *
 * One alert per raid for the whole device: on a shared phone, two heroes in the same raid hear it once.
 */
import debug from "@/lib/utils/debug";
import { raidEndsAt, raidState, type Raid } from "@/lib/services/party/raidRules";

/** How long before the raid window closes the alert rings */
export const RAID_ALERT_LEAD_MS = 24 * 60 * 60 * 1000;

/** Raid alert ids sit in their own block, clear of the fixed alert ids (7001, 7002, ...) */
const RAID_ALERT_ID_BASE = 7_100_000;
const RAID_ALERT_ID_SPAN = 100_000;

export interface RaidAlert {
  raidId: string;
  /** The device alert id: the same raid always gets the same id, so booking it again replaces it */
  alertId: number;
  /** When to ring it; null rings it now (the raid is already inside its last day and nobody was told) */
  at: Date | null;
  title: string;
  body: string;
  /** The party page of the first hero on this device who is in the raid */
  link: string;
}

/** A stable alert id for a raid */
export const raidAlertIdOf = (raidId: string): number => {
  let hash = 0;
  for (let i = 0; i < raidId.length; i++) hash = (hash * 31 + raidId.charCodeAt(i)) | 0;
  return RAID_ALERT_ID_BASE + (Math.abs(hash) % RAID_ALERT_ID_SPAN);
};

/** The moment the alert rings: the lead time before the raid window closes */
export const raidAlertTimeOf = (raid: Pick<Raid, "startedAt" | "window">): Date =>
  new Date(raidEndsAt(raid).getTime() - RAID_ALERT_LEAD_MS);

/** The words of a raid's alert */
export const raidAlertCopy = (beastName: string, hp: number): { title: string; body: string } => ({
  title: `${beastName} is about to flee!`,
  body: `One day left and it still has ${hp} HP. Finish a chore to land a blow before it gets away.`,
});

export interface RaidAlertPlanArgs {
  raids: readonly Raid[];
  /** Every hero on this device */
  heroIds: readonly string[];
  now: Date;
  /** The raids whose alert was already booked or rung on this device */
  told: ReadonlySet<string>;
  beastNameOf: (beastId: string) => string;
}

/** The raids that still stand and have a hero of this device in it, with the first such hero */
export const liveRaidsFor = (raids: readonly Raid[], heroIds: readonly string[], now: Date): { raid: Raid; hero: string }[] => {
  const ours = new Set(heroIds.map(String));
  const live: { raid: Raid; hero: string }[] = [];
  for (const raid of raids) {
    const isStanding = raidState(raid, now).status === "active";
    const hero = raid.memberIds.map(String).find((id) => ours.has(id));
    const isOurs = hero !== undefined;
    if (isStanding && isOurs) live.push({ raid, hero });
  }
  return live;
};

/**
 * The alerts this device should have: one per raid that still stands, has a hero of this device in it, and has not
 * fled. A raid whose last day has not begun is booked for the start of it; one already inside its last day rings now,
 * once (a raid already told is left out, so nothing rings twice).
 */
export const raidAlertPlan = ({ raids, heroIds, now, told, beastNameOf }: RaidAlertPlanArgs): RaidAlert[] => {
  const plan: RaidAlert[] = [];
  for (const { raid, hero } of liveRaidsFor(raids, heroIds, now)) {
    const ringAt = raidAlertTimeOf(raid);
    const isAhead = ringAt.getTime() > now.getTime();
    const isAlreadyTold = told.has(raid.id);
    const isLastDayUntold = !isAhead && !isAlreadyTold;
    const shouldPlan = isAhead || isLastDayUntold;
    if (!shouldPlan) continue;

    plan.push({
      raidId: raid.id,
      alertId: raidAlertIdOf(raid.id),
      at: isAhead ? ringAt : null,
      ...raidAlertCopy(beastNameOf(raid.beastId), raidState(raid, now).hp),
      link: `/my-portal/${hero}/my-party`,
    });
  }
  return plan;
};

export type RaidAlertChoice = "on" | "off";

const CHOICE_KEY = "xp.raidAlerts";

/** Whether this device wants raid alerts. On until someone turns them off, like chore reminders. */
export const raidAlertsChoice = (): RaidAlertChoice => {
  try {
    const isOff = localStorage.getItem(CHOICE_KEY) === "off";
    return isOff ? "off" : "on";
  } catch (error) {
    debug.warn("[raidAlerts] could not read the raid alerts choice", error);
    return "on";
  }
};

export const setRaidAlertsChoice = (choice: RaidAlertChoice): void => {
  try {
    localStorage.setItem(CHOICE_KEY, choice);
  } catch (error) {
    // private mode or blocked storage: the device keeps the default
    debug.warn("[raidAlerts] could not keep the raid alerts choice", error);
  }
};
