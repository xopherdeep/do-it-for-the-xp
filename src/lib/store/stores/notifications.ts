import { defineStore } from "pinia";
import { onScopeDispose, reactive } from "vue";
import { getNotificationsDb } from "@/lib/databases/NotificationsDb";
import { onRecordsLanded, trackWrite } from "@/lib/services/sync/recordSignals";
import debug from "@/lib/utils/debug";
import {
  MAX_NOTIFICATIONS_PER_HERO,
  isDuplicate,
  makeNotification,
  sortNewestFirst,
  unreadCountOf,
} from "@/lib/services/notifications/Notifications";
import type { NewXpNotification, XpNotification } from "@/lib/services/notifications/Notifications";

/**
 * The heroes' notification feeds: in memory per hero, persisted through NotificationsDb.
 *
 * Producers call `push` (quest watch, level-ups, the Game Master's approvals, the shop, the blood moon);
 * the XpNotifications modal reads `forHero` and `unreadCount` and calls `markRead`, `markAllRead`, `clear`.
 * A hero's feed is read from disk once (`load`); pushes made before that read are kept and merged in, so
 * a notification is never lost to the order things start in. Writes made in the same tick coalesce into one. A feed
 * another device wrote that lands here (Family Sync) is read again, replacing the one in memory: the device holding the
 * hero wrote it, so a save from here never puts the stale feed back.
 */
export const useNotificationsStore = defineStore("notifications", () => {
  const byHero = reactive<Record<string, XpNotification[]>>({});
  const loaded = reactive<Record<string, boolean>>({});
  const loading = new Map<string, Promise<void>>();

  const feedOf = (heroId: string): XpNotification[] => {
    const key = String(heroId);
    const hasFeed = !!byHero[key];
    if (!hasFeed) byHero[key] = [];
    return byHero[key];
  };

  /** Stored + in-memory, one per id (memory wins), newest first, capped. */
  const merge = (stored: readonly XpNotification[], memory: readonly XpNotification[]): XpNotification[] => {
    const seen = new Set<string>();
    const all: XpNotification[] = [];
    for (const entry of [...memory, ...stored]) {
      const isBlankOrRepeat = !entry || seen.has(entry.id);
      if (isBlankOrRepeat) continue;
      seen.add(entry.id);
      all.push(entry);
    }
    return sortNewestFirst(all).slice(0, MAX_NOTIFICATIONS_PER_HERO);
  };

  /** Read a hero's feed from disk (once). Safe to call again: it only waits for the first read. */
  function load(heroId: string): Promise<void> {
    const key = String(heroId);
    if (!key) return Promise.resolve();
    const isFeedLoaded = !!loaded[key];
    if (isFeedLoaded) return Promise.resolve();
    const running = loading.get(key);
    if (running) return running;
    const read = (async () => {
      let stored: XpNotification[] = [];
      try {
        stored = await getNotificationsDb().getForHero(key);
      } catch (error) {
        debug.error(`[notifications] failed to read the feed of ${key}`, error);
      }
      byHero[key] = merge(stored, feedOf(key));
      loaded[key] = true;
      loading.delete(key);
    })();
    loading.set(key, read);
    return read;
  }

  /** A feed that landed from another device: read again (and its pending save dropped) once it has been read here at all */
  async function reload(heroId: string): Promise<void> {
    const key = String(heroId);
    await loading.get(key);
    const isFeedLoaded = !!loaded[key];
    if (!isFeedLoaded) return;
    try {
      const stored = await getNotificationsDb().getForHero(key);
      pendingPersist.delete(key);
      byHero[key] = sortNewestFirst(stored).slice(0, MAX_NOTIFICATIONS_PER_HERO);
    } catch (error) {
      debug.error(`[notifications] failed to read the landed feed of ${key}`, error);
    }
  }

  const stopLandings = onRecordsLanded(({ store, keys }) => {
    const isFeeds = store === "__notifications";
    if (isFeeds) keys.forEach((heroId) => void reload(heroId));
  });
  onScopeDispose(stopLandings);

  // --- persistence, coalesced per tick like userStore.persistUser ---
  const pendingPersist = new Set<string>();
  let persistScheduled = false;

  async function flushPersist() {
    persistScheduled = false;
    const heroIds = Array.from(pendingPersist);
    pendingPersist.clear();
    for (const heroId of heroIds) {
      try {
        await load(heroId);
        await getNotificationsDb().saveForHero(heroId, byHero[heroId] ?? []);
      } catch (error) {
        debug.error(`[notifications] failed to persist the feed of ${heroId}`, error);
      }
    }
  }

  function persist(heroId: string) {
    pendingPersist.add(String(heroId));
    if (persistScheduled) return;
    persistScheduled = true;
    // Noted as on its way from now: a hero's turn is not given back before a notice written a moment ago is saved
    void trackWrite(new Promise<void>((resolve) => queueMicrotask(() => void flushPersist().then(resolve, resolve))));
  }

  // --- actions ---

  /**
   * Add a notification. Returns it, or null when the hero already has one of the same kind about the
   * same thing today (quest-due for the same quest, the same approval), so producers can fire freely.
   */
  function push(input: NewXpNotification, now: Date = new Date()): XpNotification | null {
    const heroId = String(input.heroId ?? "");
    if (!heroId) return null;
    const feed = feedOf(heroId);
    if (isDuplicate({ ...input, heroId }, feed)) return null;
    const notification = makeNotification({ ...input, heroId }, now);
    feed.unshift(notification);
    byHero[heroId] = sortNewestFirst(feed).slice(0, MAX_NOTIFICATIONS_PER_HERO);
    persist(heroId);
    return notification;
  }

  function markRead(id: string, at: Date = new Date()): boolean {
    for (const heroId of Object.keys(byHero)) {
      const entry = byHero[heroId].find((candidate) => candidate.id === id);
      if (!entry) continue;
      const isUnread = !entry.readAt;
      if (isUnread) {
        entry.readAt = at.toISOString();
        persist(heroId);
      }
      return true;
    }
    return false;
  }

  /** Read every notification of a kind about one thing, in every feed (a settled claim's notices). Returns how many. */
  function markReadByRef(kind: XpNotification["kind"], refId: string, at: Date = new Date()): number {
    let marked = 0;
    for (const heroId of Object.keys(byHero)) {
      const matches = byHero[heroId].filter((entry) => entry.kind === kind && entry.refId === refId && !entry.readAt);
      for (const entry of matches) entry.readAt = at.toISOString();
      const hasMatches = matches.length > 0;
      if (hasMatches) {
        marked += matches.length;
        persist(heroId);
      }
    }
    return marked;
  }

  function markAllRead(heroId: string, at: Date = new Date()): number {
    const key = String(heroId);
    let marked = 0;
    for (const entry of feedOf(key)) {
      const isRead = !!entry.readAt;
      if (isRead) continue;
      entry.readAt = at.toISOString();
      marked += 1;
    }
    if (marked) persist(key);
    return marked;
  }

  function remove(id: string): boolean {
    for (const heroId of Object.keys(byHero)) {
      const index = byHero[heroId].findIndex((candidate) => candidate.id === id);
      const hasNoMatch = index < 0;
      if (hasNoMatch) continue;
      byHero[heroId].splice(index, 1);
      persist(heroId);
      return true;
    }
    return false;
  }

  function clear(heroId: string): number {
    const key = String(heroId);
    const count = feedOf(key).length;
    byHero[key] = [];
    persist(key);
    return count;
  }

  // --- getters ---

  /** The hero's notifications, newest first. */
  function forHero(heroId: string): XpNotification[] {
    return sortNewestFirst(byHero[String(heroId)] ?? []);
  }

  function unreadCount(heroId: string): number {
    return unreadCountOf(byHero[String(heroId)] ?? []);
  }

  function isLoaded(heroId: string): boolean {
    return Boolean(loaded[String(heroId)]);
  }

  return {
    byHero,
    load,
    push,
    markRead,
    markReadByRef,
    markAllRead,
    remove,
    clear,
    forHero,
    unreadCount,
    isLoaded,
  };
});
