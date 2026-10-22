/**
 * Which stores Family Sync carries, who may write each, and how a record in a hero's store names its hero.
 * The stores are the ones a backup file carries (BACKUP_STORES in BackupService), minus `__localSettings`, which is about this device
 * (sound, how the UI looks here). The list is kept here, in BACKUP_STORES order, so this file stays pure and cheap to import: it
 * imports nothing from stores or databases. The server keeps the same table (Xophz_Compass_Xp_Family_Record_Rules in xophz-compass-xp):
 * it refuses any other store name and checks the hero id where the key tells it. Keep both in step.
 */

/**
 * `family`: the whole family shares the store; only the parent's device writes it.
 * `family-any`: the whole family shares it and any phone may write it (chat).
 * `hero`: each record belongs to one hero; a phone writes only its own hero's records.
 */
export type SyncScope = "family" | "family-any" | "hero";

export interface SyncStoreRule {
  store: string;
  scope: SyncScope;
  /** Hero scope only: the hero a record belongs to, from its key or its value; null when the record does not say */
  heroIdOf?: (key: string, value: unknown) => string | null;
}

/** A non-empty string, or null */
const nonEmpty = (text: unknown): string | null => {
  const isText = typeof text === "string" && text !== "";
  return isText ? text : null;
};

/** The string field `field` of a record value, or null when the value is not an object or the field is not a non-empty string */
const fieldOf = (value: unknown, field: string): string | null => {
  const isObject = typeof value === "object" && value !== null;
  return isObject ? nonEmpty((value as Record<string, unknown>)[field]) : null;
};

/** The record key is the hero id (a profile, a hero's notifications) */
const keyIsHero = (key: string): string | null => nonEmpty(key);

const userIdOfValue = (_key: string, value: unknown): string | null => fieldOf(value, "userId");

const heroIdOfValue = (_key: string, value: unknown): string | null => fieldOf(value, "heroId");

/** Temple progress keys are `{userId}:{templeId}`: the hero is the part before the first colon; a key without a colon names no hero */
const beforeFirstColon = (key: string): string | null => {
  const colon = key.indexOf(":");
  return colon === -1 ? null : nonEmpty(key.slice(0, colon));
};

export const SYNC_STORES: readonly SyncStoreRule[] = [
  { store: "__profiles", scope: "hero", heroIdOf: keyIsHero },
  { store: "__achievementCategories", scope: "family" },
  { store: "__beasts", scope: "family" },
  { store: "__achievements", scope: "family" },
  { store: "__abilities", scope: "family" },
  { store: "__accessories", scope: "family" },
  { store: "__shops", scope: "family" },
  { store: "__temples", scope: "family" },
  { store: "__templeProgress", scope: "hero", heroIdOf: beforeFirstColon },
  { store: "__questLog", scope: "hero", heroIdOf: userIdOfValue },
  { store: "__purchaseLog", scope: "hero", heroIdOf: userIdOfValue },
  { store: "__chat", scope: "family-any" },
  { store: "__dosDonts", scope: "family" },
  { store: "__family_settings", scope: "family" },
  { store: "__castLog", scope: "hero", heroIdOf: userIdOfValue },
  { store: "__latePenalties", scope: "hero", heroIdOf: heroIdOfValue },
  { store: "__notifications", scope: "hero", heroIdOf: keyIsHero },
  { store: "__packs", scope: "family" },
];

/** A Map, not an object: a store named `constructor` or `__proto__` must not find anything */
const RULES: ReadonlyMap<string, SyncStoreRule> = new Map(SYNC_STORES.map((rule) => [rule.store, rule]));

export const isSyncedStore = (store: string): boolean => RULES.has(store);

/** The store's scope, or null when the store does not sync */
export const scopeOf = (store: string): SyncScope | null => RULES.get(store)?.scope ?? null;

/** The hero a record belongs to; null for a family store, a store that does not sync, or a record that does not name a hero */
export const heroIdOf = (store: string, key: string, value: unknown): string | null => {
  const derive = RULES.get(store)?.heroIdOf;
  return derive ? derive(key, value) : null;
};

/** Whether a hero's own phone may write this record: any family-any store, or a hero-scope record of its own hero */
export const mayPhoneWrite = (store: string, heroId: string | null, ownHeroId: string): boolean => {
  const scope = scopeOf(store);
  const isOwnHeroRecord = scope === "hero" && heroId !== null && heroId === ownHeroId;
  const mayWrite = scope === "family-any" || isOwnHeroRecord;
  return mayWrite;
};
