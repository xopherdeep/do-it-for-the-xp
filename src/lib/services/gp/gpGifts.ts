/**
 * Send and request GP between heroes of the family (the wallet's Send / Request). A gift moves GP from one wallet to
 * another at once (anything past the receiver's wallet limit lands in their savings, like every GP credit). A request
 * waits on the asked hero's purse (`stats.gp.requests`) until they pay it or say no; either way the asker hears back.
 * The list rules are pure; `sendGp`, `askForGp`, `payRequest` and `declineRequest` touch the store.
 */
import { useUserStore } from "@/lib/store/stores/user";
import { notify } from "@/lib/services/notifications/notify";
import type { NewXpNotification } from "@/lib/services/notifications/Notifications";

export interface GpRequest {
  id: string;
  /** Who is asking */
  fromId: string;
  amount: number;
  /** ISO timestamp */
  at: string;
}

/** A hero keeps at most this many open requests; the oldest fall off. */
export const MAX_GP_REQUESTS = 20;

const isRequest = (value: any): value is GpRequest =>
  Boolean(value) && typeof value === "object" && typeof value.id === "string" && Number(value.amount) > 0 && Boolean(value.fromId);

/** The requests the purse holds, oldest first (older saves hold none). */
export const requestsOf = (gp?: { requests?: unknown } | null): GpRequest[] =>
  Array.isArray(gp?.requests) ? (gp!.requests as unknown[]).filter(isRequest) : [];

/** The list with a request added; a second ask from the same hero replaces their first. */
export const addRequest = (requests: readonly GpRequest[], request: GpRequest): GpRequest[] =>
  [...requests.filter((r) => r.fromId !== request.fromId), request].slice(-MAX_GP_REQUESTS);

export const removeRequest = (requests: readonly GpRequest[], id: string): GpRequest[] => requests.filter((r) => r.id !== id);

/** A hero's name as the wallet says it */
export const heroName = (hero?: { name?: { nick?: string; first?: string; full?: string } } | null, fallback = "A hero"): string =>
  hero?.name?.nick || hero?.name?.first || hero?.name?.full?.split(" ")[0] || fallback;

let sequence = 0;
const newId = (prefix: string): string => `${prefix}-${Date.now().toString(36)}-${(sequence++).toString(36)}`;

const goldNote = (heroId: string, refId: string, title: string, body: string): NewXpNotification => ({
  heroId,
  kind: "gold",
  refId,
  title,
  body,
  link: `/my-gold-points/${heroId}/`,
});

export type GiftResult = { ok: true; amount: number } | { ok: false; reason: "hero" | "self" | "amount" | "short" };

/** Move GP from one wallet to another and tell the receiver. */
export async function sendGp(fromId: string, toId: string, gp: number): Promise<GiftResult> {
  const store = useUserStore();
  const from = store.users[fromId];
  const to = store.users[toId];
  if (!from || !to) return { ok: false, reason: "hero" };
  if (String(fromId) === String(toId)) return { ok: false, reason: "self" };
  const amount = Math.round(Number(gp) || 0);
  if (amount <= 0) return { ok: false, reason: "amount" };
  const wallet = Number(from.stats?.gp?.wallet) || 0;
  if (amount > wallet) return { ok: false, reason: "short" };

  // Both wallets move before the first await, so a double tap can't spend the same GP twice
  const sent = store.updateUserGP({ userId: fromId, wallet: -amount, kind: "send", note: `Sent to ${heroName(to)}`, withId: toId });
  const received = store.updateUserGP({ userId: toId, wallet: amount, kind: "receive", note: `From ${heroName(from)}`, withId: fromId });
  await Promise.all([sent, received]);
  notify(goldNote(toId, newId("gift"), "GP received!", `${heroName(from)} sent you ${amount} GP.`));
  return { ok: true, amount };
}

/** Ask another hero for GP: the request waits in their wallet and they hear of it. */
export function askForGp(fromId: string, toId: string, gp: number): GpRequest | null {
  const store = useUserStore();
  const from = store.users[fromId];
  const to = store.users[toId];
  const amount = Math.round(Number(gp) || 0);
  const isUnaskable = !from || !to || String(fromId) === String(toId) || amount <= 0;
  if (isUnaskable) return null;
  const request: GpRequest = { id: newId("ask"), fromId: String(fromId), amount, at: new Date().toISOString() };
  const stats = (to.stats = to.stats || {});
  stats.gp = { ...(stats.gp || {}), requests: addRequest(requestsOf(stats.gp), request) };
  store.persistUser(toId);
  notify(goldNote(toId, request.id, "GP request", `${heroName(from)} asked you for ${amount} GP.`));
  return request;
}

const dropRequest = (heroId: string, requestId: string): GpRequest | null => {
  const store = useUserStore();
  const hero = store.users[heroId];
  const request = requestsOf(hero?.stats?.gp).find((r) => r.id === requestId) ?? null;
  if (!hero || !request) return null;
  hero.stats.gp = { ...hero.stats.gp, requests: removeRequest(requestsOf(hero.stats.gp), requestId) };
  store.persistUser(heroId);
  return request;
};

/** Pay a request out of the wallet. A request the wallet can't cover stays open. */
export async function payRequest(heroId: string, requestId: string): Promise<GiftResult> {
  const store = useUserStore();
  const request = requestsOf(store.users[heroId]?.stats?.gp).find((r) => r.id === requestId);
  if (!request) return { ok: false, reason: "hero" };
  const wallet = Number(store.users[heroId]?.stats?.gp?.wallet) || 0;
  if (request.amount > wallet) return { ok: false, reason: "short" };
  dropRequest(heroId, requestId);
  return sendGp(heroId, request.fromId, request.amount);
}

/** Say no to a request; the asker hears of it. */
export function declineRequest(heroId: string, requestId: string): boolean {
  const request = dropRequest(heroId, requestId);
  if (!request) return false;
  const hero = useUserStore().users[heroId];
  notify(goldNote(request.fromId, newId("no"), "Request declined", `${heroName(hero)} said no to your ${request.amount} GP request.`));
  return true;
}
