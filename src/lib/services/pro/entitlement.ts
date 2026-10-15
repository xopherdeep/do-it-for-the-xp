import type { ProPlanId } from "./proPlans";

export interface CachedLicense {
  key: string;
  plan: ProPlanId;
  expiresAt: string | null;
  env: "production" | "sandbox";
  pro: boolean;
  lastValidatedAt: string;
  /** When this install first saw this key (the server sends no purchase date); the license card's "member since". */
  since?: string;
}

export const GRACE_DAYS = 3;
export const OFFLINE_DAYS = 30;
export const RECHECK_HOURS = 24;

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

function parse(iso: string | null | undefined): number {
  return iso ? new Date(iso).getTime() : NaN;
}

/** Pro while the cached license is entitled, inside the offline window, and (in production builds) not a sandbox license. */
export function isPro(
  cached: CachedLicense | null,
  now: Date,
  productionBuild: boolean
): boolean {
  const hasNoProLicense = !cached || !cached.pro;
  if (hasNoProLicense) return false;
  const isSandboxLicenseInProduction = productionBuild && cached.env === "sandbox";
  if (isSandboxLicenseInProduction) return false;
  const t = now.getTime();
  const hasExpiry = Boolean(cached.expiresAt);
  if (hasExpiry) {
    const exp = parse(cached.expiresAt);
    const hasLapsedPastGrace = Number.isNaN(exp) || t >= exp + GRACE_DAYS * DAY;
    if (hasLapsedPastGrace) return false;
  }
  const validated = parse(cached.lastValidatedAt);
  if (Number.isNaN(validated)) return false;
  // A last check in the future means the clock moved; do not extend the window.
  const isValidatedInFuture = validated > t;
  if (isValidatedInFuture) return false;
  return t - validated <= OFFLINE_DAYS * DAY;
}

/** True when the server should be asked again. */
export function needsRecheck(cached: CachedLicense | null, now: Date): boolean {
  if (!cached) return true;
  const t = now.getTime();
  const validated = parse(cached.lastValidatedAt);
  const hasUnreliableLastCheck = Number.isNaN(validated) || validated > t;
  if (hasUnreliableLastCheck) return true;
  const isRecheckDue = t - validated > RECHECK_HOURS * HOUR;
  if (isRecheckDue) return true;
  const hasExpiry = Boolean(cached.expiresAt);
  if (hasExpiry) {
    const exp = parse(cached.expiresAt);
    const hasExpired = Number.isNaN(exp) || t >= exp;
    if (hasExpired) return true;
  }
  return false;
}
