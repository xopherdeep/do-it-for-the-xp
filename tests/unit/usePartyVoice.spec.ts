import { reactive, ref } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { usePartyVoice } from "@/hooks/usePartyVoice";
import { usePartyStore } from "@/lib/store/stores/party";
import { useUserStore } from "@/lib/store/stores/user";
import type { WireParty } from "@/lib/services/party/partyWire";

/**
 * Who speaks for the family in a party with other families, and the fixed words they send. The household's heroes, the
 * hero signed in and the family's id decide it; the site is reached through the controls hook, replaced here.
 */

const mockPro = reactive({ familyId: "fam-1", isPro: true });
jest.mock("@/lib/store/stores/pro", () => ({ __esModule: true, useProStore: () => mockPro }));
const mockSendWord = jest.fn();
jest.mock("@/hooks/usePartyControls", () => ({ usePartyControls: () => ({ sendWord: mockSendWord }) }));
jest.mock("@/lib/databases/PartyDb", () => ({
  __esModule: true,
  getPartyDb: () => ({ getState: async () => null, saveState: async () => undefined }),
}));

const card = (heroId: string, nickname: string) => ({ heroId, nickname, level: 3, jobClass: "knight", look: null });
const PARTY: WireParty = {
  id: "p1",
  name: "Raiders",
  emblem: "dragon",
  inviteRule: "leader",
  leader: { familyId: "fam-1", heroId: "ana" },
  members: [
    { familyId: "fam-1", heroId: "ana", card: card("ana", "Ana"), role: "leader", joinedAt: "" },
    { familyId: "fam-1", heroId: "ben", card: card("ben", "Ben"), role: "member", joinedAt: "" },
    { familyId: "fam-2", heroId: "dot", card: card("dot", "Dot"), role: "member", joinedAt: "" },
  ],
  raid: null,
  seq: 1,
};

beforeEach(() => {
  setActivePinia(createPinia());
  mockSendWord.mockReset();
  Object.assign(useUserStore().users, {
    ana: { id: "ana", name: { nick: "Ana" } },
    ben: { id: "ben", name: { nick: "Ben" } },
    cam: { id: "cam", name: { full: "Cam Full" } },
  });
  useUserStore().currentUser.id = null;
});

describe("usePartyVoice: who speaks", () => {
  it("speaks for nobody while Home is chosen", () => {
    const { senderHeroId, showWords } = usePartyVoice(ref(undefined));
    expect(senderHeroId.value).toBe("");
    expect(showWords.value).toBe(false);
  });

  it("speaks as the hero signed in when that hero is in the party", () => {
    useUserStore().currentUser.id = "ben";
    const { senderHeroId, showWords } = usePartyVoice(ref(PARTY));
    expect(senderHeroId.value).toBe("ben");
    expect(showWords.value).toBe(true);
  });

  it("speaks as the first of the family's heroes in the party otherwise, never as another family's hero", () => {
    useUserStore().currentUser.id = "dot";
    const { senderHeroId } = usePartyVoice(ref(PARTY));
    expect(senderHeroId.value).toBe("ana");
  });

  it("does not offer words when none of the family's heroes are in the party", () => {
    const { showWords } = usePartyVoice(ref({ ...PARTY, members: [PARTY.members[2]] }));
    expect(showWords.value).toBe(false);
  });
});

describe("usePartyVoice: the household's heroes", () => {
  it("lists them with a name and whether they stay home", () => {
    usePartyStore().setMode("ben", "home");
    const { partyHeroes } = usePartyVoice(ref(undefined));
    expect(partyHeroes.value).toEqual(
      expect.arrayContaining([
        { id: "ana", name: "Ana", staysHome: false },
        { id: "ben", name: "Ben", staysHome: true },
        { id: "cam", name: "Cam Full", staysHome: false },
      ])
    );
  });
});

describe("usePartyVoice: sending a word to a member", () => {
  it("sends the word as the speaking hero, aimed at the member", async () => {
    mockSendWord.mockResolvedValue({ ok: true, value: undefined });
    const { sendWordTo } = usePartyVoice(ref(PARTY));
    const result = await sendWordTo("fam-2|dot", "cheer");
    expect(mockSendWord).toHaveBeenCalledWith("p1", "ana", "cheer", { familyId: "fam-2", heroId: "dot" });
    expect(result).toEqual({ ok: true, value: undefined });
  });

  it("says so, and sends nothing, when none of the family's heroes are in the party", async () => {
    const { sendWordTo } = usePartyVoice(ref({ ...PARTY, members: [PARTY.members[2]] }));
    expect(await sendWordTo("fam-2|dot", "poke")).toEqual({ ok: false, problem: "not-member" });
    expect(mockSendWord).not.toHaveBeenCalled();
  });

  it("says so, and sends nothing, while Home is chosen", async () => {
    const { sendWordTo } = usePartyVoice(ref(undefined));
    expect(await sendWordTo("fam-2|dot", "poke")).toEqual({ ok: false, problem: "gone" });
    expect(mockSendWord).not.toHaveBeenCalled();
  });
});
