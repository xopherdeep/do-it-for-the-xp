import { format } from "date-fns";
import type { ProPlanId } from "./proPlans";

export type MembershipState = "free" | "active" | "lifetime" | "expired";

export interface MembershipInput {
  isPro: boolean;
  plan: ProPlanId | null;
  expiresAt: string | null;
  licenseKey: string;
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

/**
 * What the XP Pro page says about this family. A trial cannot be told apart from a paid subscription on the
 * client, so a live subscription is simply "Active".
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

  return {
    state,
    label: LABELS[state],
    planName: state !== "free" && plan ? PLAN_TITLES[plan] ?? "" : "",
    dateLine,
    maskedKey: maskLicenseKey(licenseKey),
    canManage: state === "active",
  };
}

export type MenuIconKind = "sun" | "moon" | "ribbon";

/** The side menu icon: sun for a yearly or lifetime plan, moon for monthly, a ribbon when free. */
export function proMenuIcon(isPro: boolean, plan: ProPlanId | null): MenuIconKind {
  if (!isPro) return "ribbon";
  return plan === "monthly" ? "moon" : "sun";
}
