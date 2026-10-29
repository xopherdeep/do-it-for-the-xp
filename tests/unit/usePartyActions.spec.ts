import { reactive } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { usePartyControls } from "@/hooks/usePartyControls";
import { usePartyMembership } from "@/hooks/usePartyMembership";
import { usePartyRaids } from "@/hooks/usePartyRaids";
import { usePartyStore } from "@/lib/store/stores/party";
import { useUserStore } from "@/lib/store/stores/user";
import type { WireParty } from "@/lib/services/party/partyWire";
import { TownHallError } from "@/lib/services/townhall/townHallClient";

/**
 * What a Game Master does with parties: form one, ask to join by a code, answer a request, leave, change the code, block,
 * send a word. Each call checks XP Pro and the linked account first, keeps a hero who stays home out of other families'
 * parties, and refreshes what the screens show once the site said yes.
 */

const AUTH = { kind: "basic", userLogin: "mom", appPassword: "x" };
const mockTownHall = reactive({ isLinked: true, auth: AUTH as unknown });
jest.mock("@/lib/store/stores/townHall", () => ({ __esModule: true, useTownHallStore: () => mockTownHall }));

const mockPro = reactive({ isPro: true, familyId: "fam-1" });
jest.mock("@/lib/store/stores/pro", () => ({ __esModule: true, useProStore: () => mockPro }));

const mockGetState = jest.fn().mockResolvedValue(null);
jest.mock("@/lib/databases/PartyDb", () => ({
  __esModule: true,
  getPartyDb: () => ({ getState: (...args: unknown[]) => mockGetState(...args), saveState: async () => undefined }),
}));

const mockClient = {
  formParty: jest.fn(),
  joinByCode: jest.fn(),
  resolveRequest: jest.fn(),
  leaveParty: jest.fn(),
  rotateCode: jest.fn(),
  blockCode: jest.fn(),
  sendPreset: jest.fn(),
  startPartyRaid: jest.fn(),
  myParties: jest.fn(),
};
jest.mock("@/lib/services/party/partyClient", () => {
  const actual = jest.requireActual("@/lib/services/party/partyClient");
  return {
    ...actual,
    formParty: (...a: unknown[]) => mockClient.formParty(...a),
    joinByCode: (...a: unknown[]) => mockClient.joinByCode(...a),
    resolveRequest: (...a: unknown[]) => mockClient.resolveRequest(...a),
    leaveParty: (...a: unknown[]) => mockClient.leaveParty(...a),
    rotateCode: (...a: unknown[]) => mockClient.rotateCode(...a),
    blockCode: (...a: unknown[]) => mockClient.blockCode(...a),
    sendPreset: (...a: unknown[]) => mockClient.sendPreset(...a),
    startPartyRaid: (...a: unknown[]) => mockClient.startPartyRaid(...a),
    myParties: (...a: unknown[]) => mockClient.myParties(...a),
  };
});

/** Both hooks' actions in one place, as a Game Master's screen uses them */
const actions = () => ({ ...usePartyMembership(), ...usePartyControls() });

const seedHeroes = (): void => {
  Object.assign(useUserStore().users, {
    ana: { id: "ana", isAdult: false, name: { nick: "Ana", full: "Pat Example" }, stats: { level: 4 }, jobClass: "knight", pin: "1234" },
    ben: { id: "ben", isAdult: false, name: { nick: "Ben" }, stats: { level: 2 }, jobClass: "mage" },
  });
};

beforeEach(() => {
  setActivePinia(createPinia());
  seedHeroes();
  mockTownHall.isLinked = true;
  mockPro.isPro = true;
  mockPro.familyId = "fam-1";
  for (const fn of Object.values(mockClient)) fn.mockReset();
  mockClient.myParties.mockResolvedValue({ parties: [], incoming: [], outgoing: [] });
  usePartyStore().setMode("ana", "open");
  usePartyStore().setMode("ben", "ask");
});

describe("usePartyActions: the checks before any call", () => {
  it("asks nothing of the site for a family without XP Pro or an account that is not linked", async () => {
    mockPro.isPro = false;
    expect(await actions().rotateCode("p1")).toEqual({ ok: false, problem: "pro-required" });
    mockPro.isPro = true;
    mockTownHall.isLinked = false;
    expect(await actions().rotateCode("p1")).toEqual({ ok: false, problem: "unlinked" });
    expect(mockClient.rotateCode).not.toHaveBeenCalled();
  });

  it("turns a refusal from the site into a problem and refreshes nothing", async () => {
    mockClient.rotateCode.mockRejectedValue(new TownHallError("forbidden", "no", 403, "xp_party_forbidden"));
    const result = await actions().rotateCode("p1");
    expect(result).toEqual({ ok: false, problem: "forbidden" });
    expect(mockClient.myParties).not.toHaveBeenCalled();
  });
});

describe("usePartyActions: forming and joining", () => {
  it("forms a party led by a hero, sending the public card and nothing more, then refreshes", async () => {
    mockClient.formParty.mockResolvedValue({ party: { id: "p1" }, code: "ABCD2345" });
    const result = await actions().createParty({ name: "Raiders", emblem: "dragon", inviteRule: "leader", leaderId: "ana" });
    expect(result).toEqual({ ok: true, value: { party: { id: "p1" }, code: "ABCD2345" } });
    const [auth, sent] = mockClient.formParty.mock.calls[0];
    expect(auth).toEqual(AUTH);
    expect(sent).toEqual({
      name: "Raiders",
      emblem: "dragon",
      inviteRule: "leader",
      leader: { heroId: "ana", nickname: "Ana", level: 4, jobClass: "knight", look: null },
    });
    expect(mockClient.myParties).toHaveBeenCalledTimes(1);
  });

  it("keeps a hero who stays home out of other families' parties, without asking the site", async () => {
    usePartyStore().setMode("ana", "home");
    const formed = await actions().createParty({ name: "Raiders", emblem: "dragon", inviteRule: "leader", leaderId: "ana" });
    const joined = await actions().requestJoin("ABCD2345", "ana");
    expect(formed).toEqual({ ok: false, problem: "forbidden" });
    expect(joined).toEqual({ ok: false, problem: "forbidden" });
    expect(mockClient.formParty).not.toHaveBeenCalled();
    expect(mockClient.joinByCode).not.toHaveBeenCalled();
  });

  it("asks to join with the hero's card, and remembers the Game Master approved that party for that hero", async () => {
    mockClient.joinByCode.mockResolvedValue({ id: "q1", partyId: "p1", partyName: "Raiders" });
    const result = await actions().requestJoin("abcd-2345", "ben");
    expect(result.ok).toBe(true);
    expect(mockClient.joinByCode).toHaveBeenCalledWith(AUTH, "abcd-2345", { heroId: "ben", nickname: "Ben", level: 2, jobClass: "mage", look: null });
    expect(usePartyStore().isApproved("ben", "p1")).toBe(true);
  });

  it("does not remember an approval when the site said no", async () => {
    mockClient.joinByCode.mockRejectedValue(new TownHallError("server", "no", 404, "xp_party_code_unknown"));
    const result = await actions().requestJoin("ZZZZ2345", "ben");
    expect(result).toEqual({ ok: false, problem: "code-unknown" });
    expect(usePartyStore().approvedParties).toEqual({});
  });

  it("refuses a hero it does not know", async () => {
    expect(await actions().requestJoin("ABCD2345", "nobody")).toEqual({ ok: false, problem: "invalid" });
    expect(mockClient.joinByCode).not.toHaveBeenCalled();
  });
});

describe("usePartyActions: a hero who stays home", () => {
  const card = (heroId: string) => ({ heroId, nickname: heroId, level: 3, jobClass: "knight", look: null });
  const partyWith = (id: string, name: string, heroes: [string, string][]): WireParty => ({
    id,
    name,
    emblem: "dragon",
    inviteRule: "leader",
    leader: { familyId: heroes[0][0], heroId: heroes[0][1] },
    members: heroes.map(([familyId, heroId]) => ({ familyId, heroId, card: card(heroId), role: "member" as const, joinedAt: "" })),
    raid: null,
    seq: 1,
  });
  const seedParties = (): void =>
    usePartyStore().applyServer({
      parties: [
        partyWith("p1", "Raiders", [["fam-1", "ana"], ["fam-2", "dot"]]),
        partyWith("p2", "Dragons", [["fam-3", "eli"], ["fam-1", "ana"], ["fam-1", "ben"]]),
        partyWith("p3", "Knights", [["fam-1", "ben"], ["fam-2", "dot"]]),
      ],
      incoming: [],
      outgoing: [],
    });

  it("takes a hero out of every party with other families they are in, and no other hero", async () => {
    seedParties();
    mockClient.leaveParty.mockResolvedValue({ disbanded: false });
    const result = await usePartyMembership().removeHeroFromParties("ana");
    expect(result).toEqual({ ok: true, value: 2 });
    expect(mockClient.leaveParty).toHaveBeenCalledTimes(2);
    expect(mockClient.leaveParty).toHaveBeenCalledWith(AUTH, "p1", "fam-1", "ana");
    expect(mockClient.leaveParty).toHaveBeenCalledWith(AUTH, "p2", "fam-1", "ana");
  });

  it("asks the site for nothing when the hero is in no party with other families", async () => {
    seedParties();
    expect(await usePartyMembership().removeHeroFromParties("cam")).toEqual({ ok: true, value: 0 });
    expect(mockClient.leaveParty).not.toHaveBeenCalled();
  });

  it("answers the first refusal in words and stops there", async () => {
    seedParties();
    mockClient.leaveParty.mockRejectedValue(new TownHallError("offline", "no", undefined, undefined));
    const result = await usePartyMembership().removeHeroFromParties("ana");
    expect(result).toEqual({ ok: false, problem: "offline" });
    expect(mockClient.leaveParty).toHaveBeenCalledTimes(1);
  });

  /** A fresh start: the saved record says Ana stays home, and nothing has read it yet */
  const freshStartWithAnaHome = (): void => {
    setActivePinia(createPinia());
    seedHeroes();
    mockGetState.mockResolvedValue({ heroModes: { ana: "home" } });
  };

  it("knows from the saved modes that a hero who stays home cannot ask to join, as the first thing done after the app starts", async () => {
    freshStartWithAnaHome();
    expect(await actions().requestJoin("ABCD2345", "ana")).toEqual({ ok: false, problem: "forbidden" });
    expect(mockClient.joinByCode).not.toHaveBeenCalled();
  });

  it("knows from the saved modes that a hero who stays home cannot lead a new party, as the first thing done after the app starts", async () => {
    freshStartWithAnaHome();
    expect(await actions().createParty({ name: "Raiders", emblem: "dragon", inviteRule: "leader", leaderId: "ana" })).toEqual({ ok: false, problem: "forbidden" });
    expect(mockClient.formParty).not.toHaveBeenCalled();
  });

  it("sends no word for a hero who stays home, even in a party they joined before", async () => {
    usePartyStore().setMode("ana", "home");
    const result = await usePartyControls().sendWord("p1", "ana", "gg");
    expect(result).toEqual({ ok: false, problem: "forbidden" });
    expect(mockClient.sendPreset).not.toHaveBeenCalled();
  });
});

describe("usePartyActions: raids", () => {
  it("starts a raid on a library beast and refreshes, or says why the site refused", async () => {
    mockClient.startPartyRaid.mockResolvedValueOnce({ id: "r1" }).mockRejectedValueOnce(new TownHallError("server", "no", 409, "xp_party_raid_running"));
    const raids = usePartyRaids();
    expect(await raids.startRaid("p1", "beast-fluffalo", "quick")).toEqual({ ok: true, value: { id: "r1" } });
    expect(mockClient.startPartyRaid).toHaveBeenCalledWith(AUTH, "p1", "beast-fluffalo", "quick");
    expect(mockClient.myParties).toHaveBeenCalledTimes(1);
    expect(await raids.startRaid("p1", "beast-fluffalo", "quick")).toEqual({ ok: false, problem: "raid-running" });
  });
});

describe("usePartyActions: answering, leaving, the code and words", () => {
  it("answers a request and refreshes", async () => {
    mockClient.resolveRequest.mockResolvedValue(undefined);
    expect(await actions().resolveRequest("p1", "q1", "approve")).toEqual({ ok: true, value: undefined });
    expect(mockClient.resolveRequest).toHaveBeenCalledWith(AUTH, "p1", "q1", "approve");
    expect(mockClient.myParties).toHaveBeenCalledTimes(1);
  });

  it("takes a hero out of a party under the family's own id", async () => {
    mockClient.leaveParty.mockResolvedValue({ disbanded: false });
    await actions().removeHero("p1", "ben");
    expect(mockClient.leaveParty).toHaveBeenCalledWith(AUTH, "p1", "fam-1", "ben");
  });

  it("changes the code and answers the new one, and blocks a code", async () => {
    mockClient.rotateCode.mockResolvedValue("WXYZ6789");
    mockClient.blockCode.mockResolvedValue(undefined);
    expect(await actions().rotateCode("p1")).toEqual({ ok: true, value: "WXYZ6789" });
    await actions().addBlock("ABCD2345");
    expect(mockClient.blockCode).toHaveBeenCalledWith(AUTH, "ABCD2345");
  });

  it("sends a word for a hero to the party or to one member", async () => {
    mockClient.sendPreset.mockResolvedValue(undefined);
    await actions().sendWord("p1", "ana", "gg");
    await actions().sendWord("p1", "ana", "cheer", { familyId: "f2", heroId: "ben" });
    expect(mockClient.sendPreset).toHaveBeenNthCalledWith(1, AUTH, "p1", "ana", "gg", undefined);
    expect(mockClient.sendPreset).toHaveBeenNthCalledWith(2, AUTH, "p1", "ana", "cheer", { familyId: "f2", heroId: "ben" });
  });
});
