import { TOWN_HALL_TIMEOUT_MS, townHallRestRoot } from "./townHallSite";

/**
 * How a request proves who sends it: nothing (a guest), the host page's nonce, a linked account's Application Password,
 * or a kid phone's hero key (the family routes only; it acts for one hero and has none of the parent's powers).
 */
export type TownHallAuth =
  | { kind: "none" }
  | { kind: "nonce"; nonce: string }
  | { kind: "basic"; userLogin: string; appPassword: string }
  | { kind: "hero"; key: string };

export type TownHallErrorCode = "offline" | "unauthorized" | "forbidden" | "invalid" | "server";

export class TownHallError extends Error {
  /**
   * @param siteCode The WordPress error code in the body (`xp_family_moved` and so on), so a caller can tell cases apart
   * @param retryAfterSec The `Retry-After` header in seconds
   */
  constructor(
    public code: TownHallErrorCode,
    message?: string,
    public status?: number,
    public siteCode?: string,
    public retryAfterSec?: number
  ) {
    super(message || code);
    this.name = "TownHallError";
  }
}

/** 400 is the kid's input, 401 and 403 are the account; anything else (404 included) is the site's trouble. */
export function errorCodeFor(status: number): TownHallErrorCode {
  if (status === 400) return "invalid";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  return "server";
}

/** UTF-8 bytes as a binary string, because btoa alone throws on a login like "josé". */
function utf8Base64(text: string): string {
  const binary = encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
  return btoa(binary);
}

export function authHeaders(auth: TownHallAuth): Record<string, string> {
  if (auth.kind === "nonce") return { "X-WP-Nonce": auth.nonce };
  if (auth.kind === "basic") return { Authorization: `Basic ${utf8Base64(`${auth.userLogin}:${auth.appPassword}`)}` };
  if (auth.kind === "hero") return { "X-XP-Hero-Key": auth.key };
  return {};
}

export interface TownHallRequest {
  auth?: TownHallAuth;
  method?: "GET" | "POST" | "DELETE";
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  /** Defaults to the Town Hall site's REST root. */
  root?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

function urlFor(root: string, path: string, query: TownHallRequest["query"]): string {
  const params = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined) params.append(key, String(value));
  });
  const search = params.toString();
  return `${root}/${path}${search ? `?${search}` : ""}`;
}

/** The site's message when it sent one (WordPress answers `{ code, message }`). */
function messageFrom(data: unknown): string | undefined {
  const message = (data as { message?: unknown } | null)?.message;
  return typeof message === "string" && message ? message : undefined;
}

/** The site's error code when it sent one (`{ code: "xp_family_moved", message }`). */
function siteCodeFrom(data: unknown): string | undefined {
  const code = (data as { code?: unknown } | null)?.code;
  const isCode = typeof code === "string" && code !== "";
  return isCode ? code : undefined;
}

/** The `Retry-After` header when it is a number of seconds (a date reads as nothing). */
function retryAfterFrom(headers: Headers): number | undefined {
  const raw = headers.get("Retry-After");
  if (!raw) return undefined;
  const seconds = Number(raw);
  const isSeconds = Number.isFinite(seconds) && seconds >= 0;
  return isSeconds ? seconds : undefined;
}

/**
 * One call to the Town Hall site. `path` is relative to the REST root ("wp/v2/posts"). A network failure or a
 * timeout is `offline`; a status of 400 or more becomes a TownHallError that carries the site's message and status.
 */
export async function townHallFetch<T>(path: string, req: TownHallRequest = {}): Promise<{ data: T; headers: Headers }> {
  const { auth = { kind: "none" }, method = "GET", query, body, root = townHallRestRoot(), fetchImpl = fetch, timeoutMs = TOWN_HALL_TIMEOUT_MS } = req;
  const headers: Record<string, string> = { Accept: "application/json", ...authHeaders(auth) };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let res: Response;
    try {
      res = await fetchImpl(urlFor(root, path, query), {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      throw new TownHallError("offline");
    }
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      // A body that is not JSON (an empty 204, an HTML error page) reads as null, unless the clock ran out mid-read.
      if (controller.signal.aborted) throw new TownHallError("offline");
    }
    if (!res.ok) throw new TownHallError(errorCodeFor(res.status), messageFrom(data), res.status, siteCodeFrom(data), retryAfterFrom(res.headers));
    return { data: data as T, headers: res.headers };
  } finally {
    clearTimeout(timer);
  }
}
