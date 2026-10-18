/**
 * Two-phone play end to end (FAMILY_EVENTS.md): a family device and a kid's phone, each with its own module graph and
 * its own disk, talking over the real wire code (familyServer, townHallFetch) to an in-memory family server that keeps
 * the rules the contract sets: who may write each kind, who reads what, dedupe by event id.
 *
 * Only the edges are faked: the disks (an in-memory @ionic/storage per device), the Town Hall link, the device ids, the
 * profile and notification disks. The family store, the hero phone sync, completeQuest, the approval flow and the quest
 * rules are the real ones.
 */
import { EVENT_KINDS, type FamilyEventKind } from "@/lib/services/multiplayer/familyEvents";

type Device = "home" | "phone";
type Glob = typeof globalThis & { __xpDevice?: Device; __xpDisks?: Record<string, Map<string, unknown>> };
const glob = globalThis as Glob;

const FAMILY = "3f6c2a1e-8b4d-4c7a-9e2f-1a2b3c4d5e6f";

jest.mock("@ionic/storage", () => {
  class Storage {
    private data: Map<string, unknown>;
    constructor(opts: { name?: string } = {}) {
      const g = globalThis as Glob;
      const disks = (g.__xpDisks = g.__xpDisks ?? {});
      const key = `${g.__xpDevice ?? "none"}:${opts.name ?? "_ionicstorage"}`;
      this.data = disks[key] = disks[key] ?? new Map();
    }
    async create() {
      return this;
    }
    async get(key: string) {
      return this.data.has(key) ? JSON.parse(JSON.stringify(this.data.get(key))) : null;
    }
    async set(key: string, value: unknown) {
      this.data.set(key, JSON.parse(JSON.stringify(value)));
    }
    async remove(key: string) {
      this.data.delete(key);
    }
    async keys() {
      return [...this.data.keys()];
    }
    async clear() {
      this.data.clear();
    }
  }
  return { __esModule: true, Storage, Drivers: { IndexedDB: "asyncStorage", LocalStorage: "localStorageWrapper" } };
});

jest.mock("@/lib/services/multiplayer/multiplayerFlag", () => ({ __esModule: true, multiplayerEnabled: () => true }));

// The family device is linked to the parent's Town Hall account; the phone never is
jest.mock("@/lib/store/stores/townHall", () => {
  const isHome = (globalThis as Glob).__xpDevice === "home";
  const store = {
    isLinked: isHome,
    auth: isHome ? { kind: "basic", userLogin: "famparent", appPassword: "abcd efgh" } : { kind: "none" },
    init: async () => undefined,
    forgetLink: async () => undefined,
  };
  return { __esModule: true, useTownHallStore: () => store };
});

jest.mock("@/lib/services/pro/familyIdentity", () => {
  const deviceId = (globalThis as Glob).__xpDevice === "home" ? "HOME-DEVICE" : "MIA-PHONE";
  return {
    __esModule: true,
    ensureIdentity: async () => ({ familyId: "3f6c2a1e-8b4d-4c7a-9e2f-1a2b3c4d5e6f", deviceId }),
    adoptFamily: async () => undefined,
  };
});

jest.mock("@/lib/databases/ProfileDb", () => {
  class MockProfileDb {
    setProfile = jest.fn();
    getAll = jest.fn().mockResolvedValue([]);
  }
  return { __esModule: true, ProfileDb: MockProfileDb, default: MockProfileDb };
});
jest.mock("@/lib/services/core/StorageService", () => ({
  __esModule: true,
  default: { saveUsers: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock("@/lib/databases/NotificationsDb", () => ({
  __esModule: true,
  getNotificationsDb: () => ({
    getForHero: jest.fn().mockResolvedValue([]),
    saveForHero: jest.fn().mockResolvedValue(undefined),
  }),
}));

// --- The family server, in memory ---

interface StoredEvent {
  seq: number;
  id: string;
  hero_id: string;
  device_id: string;
  kind: FamilyEventKind;
  at: string;
  data: Record<string, unknown>;
  scope: "public" | "family";
  received_at: string;
}

type Reply = { status: number; body: unknown };

const json = (status: number, body: unknown): Reply => ({ status, body });

class FakeFamilyServer {
  events: StoredEvent[] = [];
  heroes = new Map<string, { nickname: string; age_group: string }>();
  phones: { id: number; hero_id: string; label: string; created_at: string; last_seen_at: string | null; key: string }[] = [];
  codes = new Map<string, string>();
  offline = new Set<Device>();
  requests: { who: Device; method: string; path: string }[] = [];

  private whoOf(headers: Record<string, string>): { who: Device; heroKey?: string; isParent: boolean } {
    const heroKey = headers["X-XP-Hero-Key"];
    if (heroKey) return { who: "phone", heroKey, isParent: false };
    const isParent = Boolean(headers.Authorization);
    return { who: isParent ? "home" : "phone", isParent };
  }

  private cardOf(heroId: string): Record<string, unknown> | null {
    const card = [...this.events].reverse().find((e) => e.kind === "hero.card" && e.hero_id === heroId);
    return card ? { ...card.data, updated_at: card.at } : null;
  }

  private keep(kind: FamilyEventKind, data: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(EVENT_KINDS[kind].fields.filter((f) => data?.[f] !== undefined).map((f) => [f, data[f]]));
  }

  private mayWrite(kind: FamilyEventKind, heroId: string, isParent: boolean, phoneHero: string | undefined): boolean {
    const writer = EVENT_KINDS[kind]?.writer;
    if (!writer || writer === "server") return false;
    if (isParent) return true;
    return writer === "home-or-phone" && phoneHero === heroId;
  }

  handle(method: string, path: string, query: URLSearchParams, headers: Record<string, string>, body: any): Reply {
    const { who, heroKey, isParent } = this.whoOf(headers);
    this.requests.push({ who, method, path });
    const phone = heroKey ? this.phones.find((p) => p.key === heroKey) : undefined;
    const isRevokedKey = Boolean(heroKey) && !phone;
    if (isRevokedKey) return json(403, { code: "xp_family_key_revoked", message: "This phone was unlinked." });
    const route = `${method} ${path}`;
    if (route === "POST xp-family/v1/family") return json(200, { answer: "created" });
    if (route === "GET xp-family/v1/family") {
      const ids = phone ? [phone.hero_id] : [...this.heroes.keys()];
      return json(200, { family_id: FAMILY, heroes: ids.map((id) => ({ hero_id: id, nickname: this.heroes.get(id)?.nickname, card: this.cardOf(id) })) });
    }
    const hero = path.match(/^xp-family\/v1\/heroes\/([^/]+)$/);
    if (hero && method === "POST") {
      this.heroes.set(decodeURIComponent(hero[1]), { nickname: body.nickname, age_group: body.age_group });
      return json(200, {});
    }
    const linkCode = path.match(/^xp-family\/v1\/heroes\/([^/]+)\/link-codes$/);
    if (linkCode && isParent) {
      this.codes.set("ABCD2345", decodeURIComponent(linkCode[1]));
      return json(200, { code: "ABCD2345", expires_at: "2099-01-01T00:00:00Z" });
    }
    if (route === "POST xp-family/v1/devices/claim") {
      const heroId = this.codes.get(body.code);
      if (!heroId) return json(400, { code: "xp_family_code_invalid", message: "No such code." });
      this.codes.delete(body.code);
      const key = `hero-key-${this.phones.length + 1}`;
      this.phones.push({ id: this.phones.length + 1, hero_id: heroId, label: body.label, created_at: "2026-10-18T09:00:00Z", last_seen_at: null, key });
      return json(200, { key, family_id: FAMILY, hero_id: heroId, card: this.cardOf(heroId) });
    }
    if (route === "GET xp-family/v1/devices" && isParent) return json(200, this.phones.map(({ key: _key, ...row }) => row));
    if (route === "POST xp-family/v1/events") {
      const accepted: string[] = [];
      const duplicate: string[] = [];
      const rejected: { id: string; code: string; message: string }[] = [];
      for (const e of body.events) {
        const isDuplicate = this.events.some((stored) => stored.id === e.id);
        if (isDuplicate) {
          duplicate.push(e.id);
          continue;
        }
        const mayWrite = this.mayWrite(e.kind, e.hero_id, isParent, phone?.hero_id);
        if (!mayWrite) {
          rejected.push({ id: e.id, code: "xp_family_writer", message: "This device may not send that." });
          continue;
        }
        const scope = EVENT_KINDS[e.kind as FamilyEventKind].scope;
        this.events.push({ seq: this.events.length + 1, ...e, data: this.keep(e.kind, e.data), scope, received_at: new Date().toISOString() });
        accepted.push(e.id);
      }
      return json(200, { accepted, duplicate, rejected });
    }
    if (route === "GET xp-family/v1/events") {
      const since = Number(query.get("since") ?? 0);
      const limit = Number(query.get("limit") ?? 100);
      // A phone reads its own hero's events; the parent reads the whole family's
      const seen = this.events.filter((e) => e.seq > since && (!phone || e.hero_id === phone.hero_id));
      return json(200, seen.slice(0, limit));
    }
    return json(404, { code: "rest_no_route", message: route });
  }

  fetch = async (url: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}) => {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/^\/wp-json\//, "");
    const headers = init.headers ?? {};
    const { who } = this.whoOf(headers);
    const isOffline = this.offline.has(who);
    if (isOffline) throw new TypeError("Failed to fetch");
    const reply = this.handle(init.method ?? "GET", path, parsed.searchParams, headers, init.body ? JSON.parse(init.body) : undefined);
    return { ok: reply.status < 400, status: reply.status, json: async () => reply.body, headers: { get: () => null } };
  };

  of(kind: FamilyEventKind): StoredEvent[] {
    return this.events.filter((e) => e.kind === kind);
  }
}

// --- One module graph per device ---

/* eslint-disable @typescript-eslint/no-explicit-any */
interface DeviceApp {
  name: Device;
  family: () => any;
  users: () => any;
  questLog: () => any;
  achievements: () => any;
  approval: any;
  quests: any;
  phoneClaims: any;
}

const boot = (name: Device): DeviceApp => {
  glob.__xpDevice = name;
  let app!: DeviceApp;
  jest.isolateModules(() => {
    const pinia = require("pinia");
    pinia.setActivePinia(pinia.createPinia());
    const achievementDb = require("@/lib/databases/AchievementDb");
    app = {
      name,
      family: require("@/lib/store/stores/family").useFamilyStore,
      users: require("@/lib/store/stores/user").useUserStore,
      questLog: require("@/lib/databases/QuestLogDb").getQuestLogDb,
      achievements: () => new achievementDb.AchievementDb(achievementDb.achievementStorage),
      approval: require("@/lib/services/quests/approvalFlow"),
      quests: require("@/lib/services/quests/QuestCompletionService"),
      phoneClaims: require("@/lib/services/multiplayer/phoneClaims"),
    };
  });
  return app;
};

/** Runs on one device: its disks are the ones a storage made from here on uses */
const on = async <T>(app: DeviceApp, fn: () => Promise<T> | T): Promise<T> => {
  glob.__xpDevice = app.name;
  return fn();
};

const stats = () => ({
  level: 1,
  xp: { now: 0, next_level: 283 },
  hp: { now: 20, max: 100 },
  mp: { now: 10, max: 80 },
  gp: { wallet: 0, savings: 0, debt: 0, limit: 1000 },
  ap: { total: 0, history: [] },
});

const DISHES = { id: "q-dishes", achievementName: "Wash the dishes", xp: 30, gp: 40, ap: 2, difficulty: 3, requiresApproval: true, assignee: ["mia"], type: "single" };
const BED = { id: "q-bed", achievementName: "Make the bed", xp: 10, gp: 5, ap: 1, difficulty: 1, requiresApproval: false, assignee: ["mia"], type: "single" };

let server: FakeFamilyServer;
let home: DeviceApp;
let phone: DeviceApp;
let apps: DeviceApp[] = [];

/** The family device with a Game Master and Mia, two chores, linked to the family on the server */
const setUpHome = async (): Promise<void> => {
  home = boot("home");
  apps.push(home);
  await on(home, async () => {
    home.users().addUser({ id: "mum", name: { nick: "Mum" }, jobClass: "Warrior", isAdult: true, stats: stats() });
    home.users().addUser({ id: "mia", name: { nick: "Mia" }, jobClass: "Warrior", isAdult: false, stats: stats() });
    await home.achievements().setTask(DISHES);
    await home.achievements().setTask(BED);
    await home.family().init();
    await home.family().bind();
    await home.family().flush();
  });
};

/** Mia's phone, linked with a code from the family device, and started the way the app starts */
const linkPhone = async (): Promise<void> => {
  const { code } = await on(home, () => home.family().linkCode("mia"));
  phone = boot("phone");
  apps.push(phone);
  await on(phone, async () => {
    expect(await phone.family().claim(code)).toBe("linked");
    await phone.family().init();
  });
  // The family device sees the new phone on its next bind and sends Mia's sheet
  await on(home, () => home.family().loadPhones());
  await homeRound();
  await phoneRound();
};

/** The family device's round: send, read the phones' claims, answer them, send the answers and the sheets */
async function homeRound(): Promise<void> {
  await on(home, async () => {
    await home.family().flush();
    await home.family().queueSheets();
    await home.family().flush();
  });
}

async function phoneRound(): Promise<void> {
  await on(phone, () => phone.family().syncPhone());
}

const phoneState = () => phone.family().phoneState;
const claimable = () => phone.phoneClaims.claimableQuests(phoneState());
const sheetQuest = (questId: string) => phoneState().sheet.quests.find((q: any) => q.questId === questId);
const homeLog = () => on(home, () => home.questLog().getEntries());
const miaOnHome = () => home.users().users.mia;

beforeEach(async () => {
  glob.__xpDisks = {};
  server = new FakeFamilyServer();
  (globalThis as any).fetch = server.fetch;
  apps = [];
  await setUpHome();
  await linkPhone();
});

afterEach(() => {
  for (const app of apps) {
    glob.__xpDevice = app.name;
    app.family().$dispose();
  }
});

describe("two-phone play", () => {
  it("shows Mia her own sheet on her phone: her numbers and the chores she can claim", () => {
    expect(phoneState().sheet.stats).toMatchObject({ level: 1, gp: 0, hp: 20, maxHp: 100 });
    expect(claimable().map((q: any) => q.questId).sort()).toEqual(["q-bed", "q-dishes"]);
    expect(sheetQuest("q-dishes")).toMatchObject({ name: "Wash the dishes", xp: 30, gp: 40, needsApproval: true });
    expect(sheetQuest("q-bed")).toMatchObject({ needsApproval: false });
  });

  it("a chore claimed on the phone waits for the Game Master on the family device, and her pay reaches the phone", async () => {
    await on(phone, () => phone.family().claimOnPhone(sheetQuest("q-dishes")));
    await phoneRound();
    expect(server.of("quest.claimed")).toHaveLength(1);
    expect(phoneState().claims[0]).toMatchObject({ questId: "q-dishes", status: "waiting" });
    expect(claimable().map((q: any) => q.questId)).toEqual(["q-bed"]);

    await homeRound();
    const held = (await homeLog()).find((entry: any) => entry.questId === "q-dishes");
    expect(held).toMatchObject({ userId: "mia", status: "pending", source: "phone", phoneClaimId: phoneState().claims[0].id });
    expect(miaOnHome().stats.gp.wallet).toBe(0);
    // The family device does not echo the phone's claim back as one of its own
    expect(server.of("quest.claimed")).toHaveLength(1);

    await phoneRound();
    expect(phoneState().claims[0]).toMatchObject({ status: "pending" });

    const verdict = await on(home, () => home.approval.approveClaim(held.id, "mum"));
    expect(verdict.ok).toBe(true);
    expect(miaOnHome().stats.gp.wallet).toBe(40);
    await homeRound();

    await phoneRound();
    expect(phoneState().claims[0]).toMatchObject({ status: "approved", paid: { xp: 30, gp: 40, ap: 2 } });
    expect(phoneState().sheet.stats.gp).toBe(40);
    // A daily chore once done is off the board in the newer sheet
    expect(claimable().map((q: any) => q.questId)).toEqual(["q-bed"]);
  });

  it("a rejection reaches the phone with the Game Master's note, and the chore opens again", async () => {
    await on(phone, () => phone.family().claimOnPhone(sheetQuest("q-dishes")));
    await homeRound();
    const held = (await homeLog()).find((entry: any) => entry.questId === "q-dishes");
    await on(home, () => home.approval.rejectClaim(held.id, "mum", "Still a pan in the sink"));
    await homeRound();
    await phoneRound();
    expect(phoneState().claims[0]).toMatchObject({ status: "rejected", note: "Still a pan in the sink" });
    expect(claimable().map((q: any) => q.questId).sort()).toEqual(["q-bed", "q-dishes"]);
    expect(miaOnHome().stats.gp.wallet).toBe(0);
  });

  it("an honor chore claimed on the phone is paid at once by the family device", async () => {
    await on(phone, () => phone.family().claimOnPhone(sheetQuest("q-bed")));
    await homeRound();
    expect(miaOnHome().stats.gp.wallet).toBe(5);
    await phoneRound();
    expect(phoneState().claims[0]).toMatchObject({ status: "approved", paid: { xp: 10, gp: 5, ap: 1 } });
  });

  it("a resent claim (its answer lost on the way) is a duplicate on the server and is logged once", async () => {
    await on(phone, () => phone.family().claimOnPhone(sheetQuest("q-bed")));
    await phoneRound();
    const [sent] = server.of("quest.claimed");
    const resend = server.handle("POST", "xp-family/v1/events", new URLSearchParams(), { "X-XP-Hero-Key": server.phones[0].key }, {
      events: [{ id: sent.id, hero_id: sent.hero_id, device_id: sent.device_id, kind: sent.kind, at: sent.at, data: sent.data }],
    });
    expect(resend.body).toMatchObject({ accepted: [], duplicate: [sent.id] });
    await homeRound();
    await homeRound();
    expect((await homeLog()).filter((entry: any) => entry.source === "phone")).toHaveLength(1);
  });

  it("an offline claim waits on the phone, survives a restart, and is paid once when the phone is back", async () => {
    server.offline.add("phone");
    await on(phone, () => phone.family().claimOnPhone(sheetQuest("q-bed")));
    expect(server.of("quest.claimed")).toHaveLength(0);
    expect(phoneState().outbox).toHaveLength(1);
    expect(phoneState().claims[0]).toMatchObject({ status: "waiting" });

    // The app is closed and opened again while still offline: the claim is on the phone's disk
    await on(phone, () => phone.family().$dispose());
    phone = boot("phone");
    apps.push(phone);
    await on(phone, () => phone.family().init());
    expect(phoneState().claims).toHaveLength(1);
    expect(phoneState().outbox).toHaveLength(1);

    server.offline.delete("phone");
    await phoneRound();
    expect(phoneState().outbox).toHaveLength(0);
    // Extra rounds on both sides change nothing: the family device takes the claim once
    await phoneRound();
    await homeRound();
    await homeRound();
    expect((await homeLog()).filter((entry: any) => entry.source === "phone")).toHaveLength(1);
    expect(miaOnHome().stats.gp.wallet).toBe(5);
    await phoneRound();
    expect(phoneState().claims[0]).toMatchObject({ status: "approved" });
  });

  it("a claim for a chore already done on the family device is turned away, and nothing is paid twice", async () => {
    await on(phone, () => phone.family().claimOnPhone(sheetQuest("q-bed")));
    // Meanwhile Mia ticks the same chore on the family device
    const bed = await on(home, () => home.achievements().get("q-bed"));
    await on(home, () => home.quests.completeQuest(bed, "mia"));
    expect(miaOnHome().stats.gp.wallet).toBe(5);

    await homeRound();
    expect(miaOnHome().stats.gp.wallet).toBe(5);
    await phoneRound();
    expect(phoneState().claims[0]).toMatchObject({ status: "rejected", note: "You already tamed this quest." });
  });

  it("the family device keeps playing while it is offline and catches up with the phone after", async () => {
    await on(phone, () => phone.family().claimOnPhone(sheetQuest("q-dishes")));
    server.offline.add("home");
    await homeRound();
    expect((await homeLog()).some((entry: any) => entry.source === "phone")).toBe(false);
    server.offline.delete("home");
    await homeRound();
    expect((await homeLog()).find((entry: any) => entry.source === "phone")).toMatchObject({ status: "pending" });
  });

  it("a phone may only claim for its own hero: the server turns anything else away and the phone says so", async () => {
    const forged = { ...sheetQuest("q-bed") };
    await on(phone, async () => {
      // A claim sent with Mia's phone key in her mum's name
      phone.family().device.heroId = "mum";
      await phone.family().claimOnPhone(forged);
      await phone.family().syncPhone();
      phone.family().device.heroId = "mia";
    });
    expect(server.of("quest.claimed")).toHaveLength(0);
    expect(phoneState().claims[0]).toMatchObject({ status: "refused" });
  });

  it("an unlinked phone stops syncing and shows the unlinked screen", async () => {
    server.phones = [];
    await phoneRound();
    expect(phone.family().device.unlinked).toBe(true);
  });
});
