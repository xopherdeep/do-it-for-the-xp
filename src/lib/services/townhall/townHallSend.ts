/** The store's pure helpers for talking to the site: how a request is sent and how it came out, and the link's credentials. */
import { Capacitor } from "@capacitor/core";
import { townHallFetch, TownHallError, type TownHallAuth } from "./townHallClient";
import type { SendResult } from "./townHallOutbox";
import { bugEnvironment, type PostDraft, type PostRequest } from "./townHallPosts";
import { appVersion, type SiteBoardSlug } from "./townHallSite";
import type { TownHallLink } from "./townHallTypes";

/** The site's text, trimmed, or nothing when it sent something else or an empty string. */
export function textOrUndefined(value: unknown): string | undefined {
  const isText = typeof value === "string";
  if (!isText) return undefined;
  return value.trim() || undefined;
}

/** How a flush went: posts the site took, whether the family's link was given up, whether the account may not post. */
export interface FlushResult {
  sent: number;
  unlinked: boolean;
  forbidden: boolean;
}

type BoardIds = Partial<Record<SiteBoardSlug, number>>;

/** What one flush keeps track of while it runs. */
export interface FlushRun {
  result: FlushResult;
  /** Posts this flush has already had a go at, so a post that went back in the queue is not tried again in the same flush. */
  tried: Set<string>;
  /** The site's board ids, read when the first topic needs them. */
  boardIds: BoardIds | null;
  /** The site said to slow down with comments (one every 15 seconds): the rest of this flush sends none. */
  commentsHeld: boolean;
}

/** What a send that did not come back with a post: the site's refusal as it is (with WordPress's code), anything else as a server error. */
function failureOf(error: unknown): SendResult {
  const isSiteRefusal = error instanceof TownHallError;
  if (!isSiteRefusal) return { ok: false, code: "server" };
  return { ok: false, code: error.code, message: error.message, ...(error.siteCode ? { siteCode: error.siteCode } : {}) };
}

/** A made post answers with its id. A reply without one (a captive portal's page, say) is no sign the site has the post. */
function resultOfReply(data: unknown): SendResult {
  const id = (data as { id?: unknown } | null)?.id;
  return typeof id === "number" ? { ok: true, remoteId: id } : { ok: false, code: "server" };
}

/** Where a bug report was found and what device sent it; the other kinds carry none. */
export function bugDetails(draft: PostDraft, route: string, at: number): { route: string; environment: string } | undefined {
  const isBug = draft.kind === "bug";
  if (!isBug) return undefined;
  const environment = bugEnvironment({ version: appVersion(), route, platform: Capacitor.getPlatform(), userAgent: navigator.userAgent, at });
  return { route, environment };
}

/** One try at sending a request. Whatever goes wrong comes back as a result, never as an error. */
export async function sendRequest(request: PostRequest, withAuth: TownHallAuth): Promise<SendResult> {
  try {
    const { data } = await townHallFetch<unknown>(request.path, { auth: withAuth, method: "POST", body: request.body });
    return resultOfReply(data);
  } catch (e) {
    return failureOf(e);
  }
}

export const basicAuthOf = (link: Pick<TownHallLink, "userLogin" | "appPassword">): TownHallAuth => ({
  kind: "basic",
  userLogin: link.userLogin,
  appPassword: link.appPassword,
});
