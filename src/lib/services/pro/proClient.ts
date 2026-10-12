import { compassRestRoot } from "@/lib/api/apiHost";
import type { ProPlanId } from "./proPlans";

export interface ProStatus {
  pro: boolean;
  licenseKey: string;
  plan: ProPlanId;
  expiresAt: string | null;
  env: "production" | "sandbox";
  familyId: string;
}

export type ProClientErrorCode =
  | "device_limit"
  | "pro_required"
  | "rate_limited"
  | "daily_limit"
  | "invalid_input"
  | "network"
  | "server";

export class ProClientError extends Error {
  constructor(public code: ProClientErrorCode, message?: string) {
    super(message || code);
    this.name = "ProClientError";
  }
}

export interface ProPlanInfo {
  price: number;
  mode: "subscription" | "payment";
  interval: "month" | "year" | null;
  trial_days: number;
  store_product_id: string;
  on_sale: boolean;
}

export type AiTask = "monster_name" | "checklist" | "full_beast" | "schedule";

const base = () => `${compassRestRoot()}/compass/v1/gatekeeper/xp-pro`;

export const REQUEST_TIMEOUT_MS = 8000;

async function call(path: string, body?: unknown): Promise<{ status: number; data: any }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    let res: Response;
    try {
      res = await fetch(`${base()}/${path}`, {
        method: body === undefined ? "GET" : "POST",
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      throw new ProClientError("network");
    }
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

/** Only the Gatekeeper's own "no license" answer is a 404 that turns Pro off; a missing route is a server error. */
const noLicense = (status: number, data: any): boolean => status === 404 && data?.pro === false;

function fail(status: number, data: any): never {
  const code = data?.error;
  if (status === 409) throw new ProClientError("device_limit");
  if (status === 402) throw new ProClientError("pro_required");
  if (status === 400) throw new ProClientError("invalid_input");
  if (status === 429) throw new ProClientError(code === "daily_limit" ? "daily_limit" : "rate_limited");
  throw new ProClientError("server");
}

function toStatus(data: any): ProStatus {
  return {
    pro: Boolean(data?.pro),
    licenseKey: data?.license_key ?? "",
    plan: data?.plan,
    expiresAt: data?.expires_at ?? null,
    env: data?.env === "sandbox" ? "sandbox" : "production",
    familyId: data?.family_id ?? "",
  };
}

export async function fetchPlans(): Promise<Record<ProPlanId, ProPlanInfo>> {
  const { status, data } = await call("plans");
  if (status !== 200) fail(status, data);
  return data;
}

/** The family's license, or null when nothing has arrived for it yet. */
export async function claim(familyId: string, deviceId: string): Promise<ProStatus | null> {
  const { status, data } = await call("claim", { family_id: familyId, device_id: deviceId });
  if (noLicense(status, data)) return null;
  if (status !== 200) fail(status, data);
  return toStatus(data);
}

/** Check a key (also how a second device restores). Null when the key is unknown. */
export async function validate(licenseKey: string, deviceId: string): Promise<ProStatus | null> {
  const { status, data } = await call("validate", { license_key: licenseKey, device_id: deviceId });
  if (noLicense(status, data)) return null;
  if (status !== 200) fail(status, data);
  return toStatus(data);
}

export async function recover(email: string): Promise<void> {
  const { status, data } = await call("recover", { email });
  if (status !== 202 && status !== 200) fail(status, data);
}

export async function manage(
  licenseKey: string,
  returnUrl: string
): Promise<{ url?: string; store?: "APP_STORE" | "PLAY_STORE" }> {
  const { status, data } = await call("manage", { license_key: licenseKey, return_url: returnUrl });
  if (status !== 200) fail(status, data);
  return data;
}

export async function askAi<T>(
  task: AiTask,
  input: Record<string, unknown>,
  licenseKey: string,
  deviceId: string
): Promise<T> {
  const { status, data } = await call("ai", {
    license_key: licenseKey,
    device_id: deviceId,
    task,
    input,
  });
  if (status === 502) throw new ProClientError("server", "ai_unavailable");
  if (status !== 200) fail(status, data);
  return data as T;
}
