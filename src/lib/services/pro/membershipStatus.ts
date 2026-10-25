import { format } from "date-fns";
import { isProductionBuild } from "./entitlement";
import type { ProClientErrorCode } from "./proClient";
import { PRO_PLANS } from "./proPlans";
import type { ProPlanId } from "./proPlans";

export type MembershipState = "free" | "active" | "lifetime" | "expired";

/** Why Pro is off, when the app can tell. */
export type MembershipReason =
  | "trial-ended"
  | "period-ended"
  | "sandbox-in-production"
  | "device-limit"
  | "unreachable";

export interface MembershipInput {
  isPro: boolean;
  plan: ProPlanId | null;
  expiresAt: string | null;
  licenseKey: string;
  /** The license environment the server last reported. */
  env?: "production" | "sandbox" | null;
  /** A production build never honours a sandbox (test-mode) license. */
  productionBuild?: boolean;
  /** The code of the last check that failed; null once a check worked. */
  lastError?: ProClientErrorCode | null;
  /** When this install first saw the key: with expiresAt it tells a trial from a paid period. */
  memberSince?: string | null;
  /** The clock; defaults to now. */
  now?: Date;
}

export interface MembershipStatus {
  state: MembershipState;
  /** "Free", "Active", "Lifetime" or "Expired". */
  label: string;
  /** "Monthly", "Yearly" or "Founder's Lifetime"; empty when there is no plan. */
  planName: string;
  /** "Renews Jan 1, 2099" or "Ended Jan 1, 2020"; empty when there is no date to show. */
  dateLine: string;
  /** XP-PRO-****-****-ABCD, or empty without a key. */
  maskedKey: string;
  /** Only a live subscription has a billing portal to open. */
  canManage: boolean;
  /** Why Pro is off; null while it is on, or when nothing known explains it. */
  reason: MembershipReason | null;
  /** The reason in the game's voice, one line; empty when there is no reason. */
  reasonLine: string;
}

export const PLAN_TITLES: Record<ProPlanId, string> = {
  monthly: "Monthly",
  yearly: "Yearly",
  lifetime: "Founder's Lifetime",
};

const LABELS: Record<MembershipState, string> = {
  free: "Free",
  active: "Active",
  lifetime: "Lifetime",
  expired: "Expired",
};

/** XP-PRO-****-****-ABCD: only the last group shows. */
export const maskLicenseKey = (key: string): string => (key ? `XP-PRO-****-****-${key.slice(-4)}` : "");

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : format(date, "MMM d, yyyy");
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** A failed check that leaves the cached state standing: the shopkeeper was offline, down or too busy. */
const UNREACHABLE_CODES: ProClientErrorCode[] = ["network", "server", "rate_limited"];

/**
 * The period has ended: a trial when it began no more than the plan's trial_days before it ended, else a paid
 * period. The server sends no purchase date, so the start is when this install first saw the key.
 */
function lapseReason(
  plan: ProPlanId | null,
  expiresAt: string | null,
  memberSince: string | null | undefined,
  now: Date
): "trial-ended" | "period-ended" | null {
  const end = expiresAt ? new Date(expiresAt).getTime() : NaN;
  const hasNoDate = Number.isNaN(end);
  if (hasNoDate) return null;
  const hasNotEnded = end > now.getTime();
  if (hasNotEnded) return null;
  const trialDays = plan ? PRO_PLANS[plan]?.trialDays ?? 0 : 0;
  const start = memberSince ? new Date(memberSince).getTime() : NaN;
  const isFirstPeriodShort = !Number.isNaN(start) && end >= start && end - start <= trialDays * DAY_MS;
  const isTrial = trialDays > 0 && isFirstPeriodShort;
  return isTrial ? "trial-ended" : "period-ended";
}

function reasonOf(input: MembershipInput): MembershipReason | null {
  const { isPro, plan, expiresAt, licenseKey, env, productionBuild, lastError, memberSince } = input;
  if (isPro) return null;
  const isTestLicenseInProduction = Boolean(licenseKey) && Boolean(productionBuild) && env === "sandbox";
  if (isTestLicenseInProduction) return "sandbox-in-production";
  const isDeviceLimit = lastError === "device_limit";
  if (isDeviceLimit) return "device-limit";
  const lapse = licenseKey ? lapseReason(plan, expiresAt, memberSince, input.now ?? new Date()) : null;
  if (lapse) return lapse;
  const isUnreachable = lastError ? UNREACHABLE_CODES.includes(lastError) : false;
  return isUnreachable ? "unreachable" : null;
}

/** One line per reason, in the shopkeeper's voice; the dated ones say when the period ended. */
const REASON_LINES: Record<MembershipReason, (endedOn: string) => string> = {
  "trial-ended": (endedOn) => `Your trial ended ${endedOn}`,
  "period-ended": (endedOn) => `Your plan ended ${endedOn}`,
  "sandbox-in-production": () => "This is a test-mode license; it only works in development builds",
  "device-limit": () => "This key is already on 10 devices",
  unreachable: () => "The shopkeeper could not be reached; showing the last known state",
};

const reasonLineOf = (reason: MembershipReason | null, endedOn: string): string =>
  reason ? REASON_LINES[reason](endedOn) : "";

/** The Restore toast when the key is found but Pro stays off. */
export const KEY_INACTIVE_MESSAGE = "That key is not active right now.";

/** The Restore toast with the reason as a second sentence, when there is one. */
export const keyInactiveMessage = (reasonLine: string): string =>
  reasonLine ? `${KEY_INACTIVE_MESSAGE} ${reasonLine}.` : KEY_INACTIVE_MESSAGE;

/**
 * What the XP Pro page says about this family. A trial cannot be told apart from a paid subscription on the
 * client while it runs, so a live subscription is simply "Active"; once it has ended the reason says which it was.
 */
export function membershipStatus(input: MembershipInput): MembershipStatus {
  const { isPro, plan, expiresAt, licenseKey } = input;
  let state: MembershipState = "free";
  if (isPro) state = plan === "lifetime" ? "lifetime" : "active";
  else if (licenseKey) state = "expired";

  const date = formatDate(expiresAt);
  let dateLine = "";
  const isRenewing = state === "active" && Boolean(date);
  const hasEnded = state === "expired" && Boolean(date);
  if (isRenewing) dateLine = `Renews ${date}`;
  else if (hasEnded) dateLine = `Ended ${date}`;

  const reason = reasonOf(input);

  return {
    state,
    label: LABELS[state],
    planName: state !== "free" && plan ? PLAN_TITLES[plan] ?? "" : "",
    dateLine,
    maskedKey: maskLicenseKey(licenseKey),
    canManage: state === "active",
    reason,
    reasonLine: reasonLineOf(reason, date),
  };
}

/** The part of the pro store the status reads (the store's own fields, so a component passes the store itself). */
export type ProStateLike = Pick<MembershipInput, "isPro" | "plan" | "expiresAt" | "licenseKey"> &
  Partial<Pick<MembershipInput, "env" | "lastError" | "memberSince">>;

/** The status for the pro store as it stands, on this build. */
export function membershipOf(pro: ProStateLike, now?: Date): MembershipStatus {
  return membershipStatus({
    isPro: pro.isPro,
    plan: pro.plan,
    expiresAt: pro.expiresAt,
    licenseKey: pro.licenseKey,
    env: pro.env,
    lastError: pro.lastError,
    memberSince: pro.memberSince,
    productionBuild: isProductionBuild(),
    now,
  });
}

export type MenuIconKind = "sun" | "moon" | "ribbon";

/** The side menu icon: sun for a yearly or lifetime plan, moon for monthly, a ribbon when free. */
export function proMenuIcon(isPro: boolean, plan: ProPlanId | null): MenuIconKind {
  if (!isPro) return "ribbon";
  return plan === "monthly" ? "moon" : "sun";
}
