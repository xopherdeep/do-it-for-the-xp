import { BACKUP_STORES } from "@/lib/services/core/BackupService";
import { heroIdOf, isSyncedStore, mayPhoneWrite, scopeOf, SYNC_STORES } from "@/lib/services/sync/syncScopes";

describe("SYNC_STORES", () => {
  it("lists every backup store but Settings, with the spec's scopes", () => {
    const expected = BACKUP_STORES.map((s) => s.name).filter((name) => name !== "__localSettings");
    expect(SYNC_STORES.map((rule) => rule.store)).toEqual(expected);

    const scopes = Object.fromEntries(SYNC_STORES.map((rule) => [rule.store, rule.scope]));
    expect(scopes).toEqual({
      __profiles: "hero",
      __achievementCategories: "family",
      __beasts: "family-any",
      __achievements: "family-any",
      __abilities: "family",
      __accessories: "family",
      __shops: "family",
      __temples: "family",
      __templeProgress: "hero",
      __questLog: "hero",
      __purchaseLog: "hero",
      __chat: "family-any",
      __dosDonts: "family",
      __family_settings: "family",
      __castLog: "hero",
      __latePenalties: "hero",
      __notifications: "hero",
      __packs: "family",
    });
  });

  it("knows a synced store and its scope, and nothing else", () => {
    expect(isSyncedStore("__beasts")).toBe(true);
    expect(isSyncedStore("__localSettings")).toBe(false);
    expect(isSyncedStore("__nope")).toBe(false);
    expect(scopeOf("__chat")).toBe("family-any");
    expect(scopeOf("__profiles")).toBe("hero");
    expect(scopeOf("__achievements")).toBe("family-any");
    expect(scopeOf("__localSettings")).toBeNull();
  });

  it("does not let a name from the object prototype pass as a store", () => {
    expect(isSyncedStore("toString")).toBe(false);
    expect(scopeOf("constructor")).toBeNull();
    expect(heroIdOf("__proto__", "k", { userId: "h-1" })).toBeNull();
  });
});

describe("heroIdOf", () => {
  it("derives the hero id per store", () => {
    expect(heroIdOf("__profiles", "h-1", { id: "h-1" })).toBe("h-1");
    expect(heroIdOf("__templeProgress", "h-1:temple-x", {})).toBe("h-1");
    expect(heroIdOf("__questLog", "log-1", { userId: "h-2" })).toBe("h-2");
    expect(heroIdOf("__purchaseLog", "buy-1", { userId: "h-4" })).toBe("h-4");
    expect(heroIdOf("__castLog", "cast-1", { userId: "h-5" })).toBe("h-5");
    expect(heroIdOf("__latePenalties", "late-1", { heroId: "h-3" })).toBe("h-3");
    expect(heroIdOf("__notifications", "h-6", [])).toBe("h-6");
    expect(heroIdOf("__achievements", "q-1", { userId: "h-2" })).toBeNull();
  });

  it("is null for family stores, whatever the record holds", () => {
    expect(heroIdOf("__chat", "m-1", { userId: "h-1" })).toBeNull();
    expect(heroIdOf("__beasts", "b-1", { heroId: "h-1" })).toBeNull();
  });

  it("is null when the record does not name a hero", () => {
    expect(heroIdOf("__questLog", "log-1", {})).toBeNull();
    expect(heroIdOf("__questLog", "log-1", null)).toBeNull();
    expect(heroIdOf("__questLog", "log-1", "text")).toBeNull();
    expect(heroIdOf("__questLog", "log-1", { userId: 7 })).toBeNull();
    expect(heroIdOf("__questLog", "log-1", { userId: "" })).toBeNull();
    expect(heroIdOf("__latePenalties", "late-1", { userId: "h-3" })).toBeNull();
    expect(heroIdOf("__templeProgress", ":temple-x", {})).toBeNull();
    expect(heroIdOf("__templeProgress", "no-colon", {})).toBeNull();
    expect(heroIdOf("__profiles", "", {})).toBeNull();
  });

  it("is null for a store that does not sync", () => {
    expect(heroIdOf("__localSettings", "volume", { userId: "h-1" })).toBeNull();
    expect(heroIdOf("__nope", "k", {})).toBeNull();
  });
});

describe("mayPhoneWrite", () => {
  it("lets a phone write chat, its own hero's records, and nothing else", () => {
    expect(mayPhoneWrite("__chat", null, "h-1")).toBe(true);
    expect(mayPhoneWrite("__profiles", "h-1", "h-1")).toBe(true);
    expect(mayPhoneWrite("__questLog", "h-1", "h-1")).toBe(true);
    expect(mayPhoneWrite("__profiles", "h-2", "h-1")).toBe(false);
    expect(mayPhoneWrite("__questLog", null, "h-1")).toBe(false);
    // a temple run's quests, a quick task and a painted beast: the site keeps a hero key to its own rows
    expect(mayPhoneWrite("__achievements", null, "h-1")).toBe(true);
    expect(mayPhoneWrite("__beasts", null, "h-1")).toBe(true);
    expect(mayPhoneWrite("__temples", null, "h-1")).toBe(false);
    expect(mayPhoneWrite("__localSettings", null, "h-1")).toBe(false);
    expect(mayPhoneWrite("__nope", "h-1", "h-1")).toBe(false);
  });
});
