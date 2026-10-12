import type { ProPlanId } from "./proPlans";

export interface CachedLicense {
  key: string;
  plan: ProPlanId;
  expiresAt: string | null;
  env: "production" | "sandbox";
  pro: boolean;
  lastValidatedAt: string;
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
  if (!cached || !cached.pro) return false;
  if (productionBuild && cached.env === "sandbox") return false;
  const t = now.getTime();
  if (cached.expiresAt) {
    const exp = parse(cached.expiresAt);
    if (Number.isNaN(exp) || t >= exp + GRACE_DAYS * DAY) return false;
  }
  const validated = parse(cached.lastValidatedAt);
  if (Number.isNaN(validated)) return false;
  // A last check in the future means the clock moved; do not extend the window.
  if (validated > t) return false;
  return t - validated <= OFFLINE_DAYS * DAY;
}

/** True when the server should be asked again. */
export function needsRecheck(cached: CachedLicense | null, now: Date): boolean {
  if (!cached) return true;
  const t = now.getTime();
  const validated = parse(cached.lastValidatedAt);
  if (Number.isNaN(validated) || validated > t) return true;
  if (t - validated > RECHECK_HOURS * HOUR) return true;
  if (cached.expiresAt) {
    const exp = parse(cached.expiresAt);
    if (Number.isNaN(exp) || t >= exp) return true;
  }
  return false;
}
