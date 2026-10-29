import { defineComponent, h, nextTick, ref } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { usePartyScope, type HomeScope } from "@/hooks/usePartyScope";
import { usePartyStore } from "@/lib/store/stores/party";
import type { WireParty } from "@/lib/services/party/partyWire";

/**
 * Which party My Party shows: the household's own, one with other families, or the panel that forms or joins one. The
 * tabs read one scope whichever it is, so they stay the same four tabs.
 */

const mockGetState = jest.fn().mockResolvedValue(null);
jest.mock("@/lib/databases/PartyDb", () => ({
  __esModule: true,
  getPartyDb: () => ({ getState: (...args: unknown[]) => mockGetState(...args), saveState: async () => undefined }),
}));
jest.mock("@/lib/services/temples/templeQuestRows", () => ({ libraryEntryOf: () => undefined }));
const mockRefreshParty = jest.fn();
jest.mock("@/hooks/usePartyFeed", () => ({ usePartyFeed: () => ({ start: jest.fn(), refreshParty: (...args: unknown[]) => mockRefreshParty(...args) }) }));

const HOME: HomeScope = {
  members: [{ id: "h1", name: { nick: "Home hero" } }],
  activity: [{ id: "a1", text: "Home did a chore", userId: "h1", nickname: "Home hero", questName: "", xp: 0, completedAt: "" }],
  heroIdsToday: ["h1"],
};

const party = (id: string, name: string): WireParty => ({
  id,
  name,
  emblem: "dragon",
  inviteRule: "leader",
  leader: { familyId: "f1", heroId: "ana" },
  members: [{ familyId: "f1", heroId: "ana", card: { heroId: "ana", nickname: "Ana", level: 3, jobClass: "knight", look: null }, role: "leader", joinedAt: "" }],
  raid: null,
  seq: 1,
});

beforeEach(() => setActivePinia(createPinia()));

describe("usePartyScope: the parties to choose from", () => {
  it("lists Home first and the plus last when there are no others", () => {
    const { parties } = usePartyScope(ref(HOME), ref("roster"));
    expect(parties.value.map((chip) => chip.id)).toEqual(["home", "new"]);
  });

  it("puts the parties with other families between them", () => {
    usePartyStore().applyServer({ parties: [party("p1", "Raiders"), party("p2", "Bards")], incoming: [], outgoing: [] });
    const { parties } = usePartyScope(ref(HOME), ref("roster"));
    expect(parties.value.map((chip) => chip.name)).toEqual(["Home", "Raiders", "Bards", "+ Party"]);
  });
});

describe("usePartyScope: what the tabs show", () => {
  it("is the household's own while Home is chosen", () => {
    const { scope, outsideParty, isNewParty } = usePartyScope(ref(HOME), ref("roster"));
    expect(scope.value).toEqual(HOME);
    expect(outsideParty.value).toBeUndefined();
    expect(isNewParty.value).toBe(false);
  });

  it("is the party's own roster, activity and synergy heroes once it is chosen", () => {
    const store = usePartyStore();
    store.applyServer({ parties: [party("p1", "Raiders")], incoming: [], outgoing: [] });
    store.appendEvents("p1", [{ seq: 1, kind: "join", familyId: "f1", heroId: "ana", data: {}, at: "2026-10-28T08:00:00Z" }]);
    const { activePartyId, scope, outsideParty } = usePartyScope(ref(HOME), ref("roster"));
    activePartyId.value = "p1";
    expect(outsideParty.value?.name).toBe("Raiders");
    expect(scope.value.members.map((m) => m.id)).toEqual(["f1|ana"]);
    expect(scope.value.activity.map((a) => a.text)).toEqual(["Ana joined the party"]);
    expect(scope.value.heroIdsToday).toEqual([]);
  });

  it("follows the household's data as it changes", () => {
    const home = ref<HomeScope>(HOME);
    const { scope } = usePartyScope(home, ref("roster"));
    home.value = { ...HOME, heroIdsToday: ["h1", "h2"] };
    expect(scope.value.heroIdsToday).toEqual(["h1", "h2"]);
  });

  it("knows when the form-or-join panel is chosen", () => {
    const { activePartyId, isNewParty } = usePartyScope(ref(HOME), ref("roster"));
    activePartyId.value = "new";
    expect(isNewParty.value).toBe(true);
  });
});

describe("usePartyScope: reading a party's feed", () => {
  beforeEach(() => mockRefreshParty.mockReset());

  it("reads the open party's feed when Activity is opened on a party with other families", async () => {
    usePartyStore().applyServer({ parties: [party("p1", "Raiders")], incoming: [], outgoing: [] });
    const tab = ref("roster");
    const { activePartyId } = usePartyScope(ref(HOME), tab);
    activePartyId.value = "p1";
    await nextTick();
    expect(mockRefreshParty).not.toHaveBeenCalled();
    tab.value = "activity";
    await nextTick();
    expect(mockRefreshParty).toHaveBeenCalledWith("p1");
  });

  it("reads nothing for Home", async () => {
    const tab = ref("roster");
    usePartyScope(ref(HOME), tab);
    tab.value = "activity";
    await nextTick();
    expect(mockRefreshParty).not.toHaveBeenCalled();
  });
});

describe("usePartyScope: when the screen opens", () => {
  beforeEach(() => mockGetState.mockClear());

  it("reads the saved party record, so who stays home is known before the screens ask", async () => {
    const Screen = defineComponent({
      setup() {
        usePartyScope(ref(HOME), ref("roster"));
        return () => h("div");
      },
    });
    const screen = mount(Screen);
    await flushPromises();
    expect(mockGetState).toHaveBeenCalledTimes(1);
    screen.unmount();
  });
});

describe("usePartyScope: a party that goes away", () => {
  it("falls back to Home when the chosen party is gone from the site's answer", async () => {
    const store = usePartyStore();
    store.applyServer({ parties: [party("p1", "Raiders")], incoming: [], outgoing: [] });
    const { activePartyId } = usePartyScope(ref(HOME), ref("roster"));
    activePartyId.value = "p1";
    store.applyServer({ parties: [], incoming: [], outgoing: [] });
    await nextTick();
    expect(activePartyId.value).toBe("home");
  });

  it("keeps the plus chosen even though no party is called that", async () => {
    const { activePartyId } = usePartyScope(ref(HOME), ref("roster"));
    activePartyId.value = "new";
    await nextTick();
    expect(activePartyId.value).toBe("new");
  });
});
