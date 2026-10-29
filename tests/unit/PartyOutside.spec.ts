import { reactive, ref } from "vue";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import PartyFormJoin from "@/app/Console/MyPortal/party/PartyFormJoin.vue";
import PartyPresetBar from "@/app/Console/MyPortal/party/PartyPresetBar.vue";
import PartyOutside from "@/app/SideMenu/XpSettings/components/PartyOutside.vue";
import { usePartyStore } from "@/lib/store/stores/party";
import type { WireParty, WireRequest } from "@/lib/services/party/partyWire";

/**
 * The screens for parties with other families: the panel that forms a party or asks to join by a code, the bar of fixed
 * words, and Settings > Party's requests, parties and codes. The hooks that talk to the site are replaced, so these
 * cases are about what the screens show and what they ask for.
 */

const mockMembership = { createParty: jest.fn(), requestJoin: jest.fn(), resolveRequest: jest.fn(), removeHero: jest.fn() };
const mockControls = { rotateCode: jest.fn(), addBlock: jest.fn(), sendWord: jest.fn() };
const mockFeed = { problem: ref<string | null>(null), start: jest.fn(), refresh: jest.fn() };
jest.mock("@/hooks/usePartyMembership", () => ({ usePartyMembership: () => mockMembership }));
jest.mock("@/hooks/usePartyControls", () => ({ usePartyControls: () => mockControls }));
jest.mock("@/hooks/usePartyFeed", () => ({ usePartyFeed: () => mockFeed }));

const mockPro = reactive({ familyId: "fam-1", isPro: true });
jest.mock("@/lib/store/stores/pro", () => ({ __esModule: true, useProStore: () => mockPro }));

jest.mock("@/lib/databases/PartyDb", () => ({
  __esModule: true,
  getPartyDb: () => ({ getState: async () => null, saveState: async () => undefined }),
}));
jest.mock("qrcode", () => ({ __esModule: true, default: { toDataURL: async (text: string) => `data:qr:${text}` } }));

const HEROES = [
  { id: "ana", name: "Ana", staysHome: false },
  { id: "ben", name: "Ben", staysHome: false },
  { id: "cam", name: "Cam", staysHome: true },
];

let wrapper: VueWrapper | null = null;
beforeEach(() => {
  setActivePinia(createPinia());
  mockFeed.problem.value = null;
  mockFeed.start.mockReset().mockReturnValue(() => undefined);
  mockFeed.refresh.mockReset();
  for (const fn of [...Object.values(mockMembership), ...Object.values(mockControls)]) fn.mockReset();
});
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

const type = async (w: VueWrapper, selector: string, value: string) => {
  const input = w.find(selector);
  (input.element as HTMLInputElement).value = value;
  await input.trigger("input");
};

describe("PartyFormJoin: asking to join by a code", () => {
  const open = (canManage = true) => {
    wrapper = mount(PartyFormJoin, { props: { heroes: HEROES, canManage } });
    return wrapper;
  };

  it("offers every hero, the one who stays home grayed out", () => {
    const panel = open();
    expect(panel.find('[data-cy="party-join-hero-ana"]').attributes("disabled")).toBeUndefined();
    expect(panel.find('[data-cy="party-join-hero-cam"]').attributes("disabled")).toBeDefined();
  });

  it("asks for the chosen hero to join with the code as typed, then says the leader will answer", async () => {
    mockMembership.requestJoin.mockResolvedValue({ ok: true, value: { id: "q1", partyId: "p1", partyName: "Raiders" } });
    const panel = open();
    expect(panel.find('[data-cy="party-join-send"]').attributes("disabled")).toBeDefined();
    await type(panel, '[data-cy="party-join-code"]', "abcd-2345");
    await panel.find('[data-cy="party-join-hero-ben"]').trigger("click");
    await panel.find('[data-cy="party-join-send"]').trigger("click");
    await flushPromises();
    expect(mockMembership.requestJoin).toHaveBeenCalledWith("abcd-2345", "ben");
    expect(panel.find('[data-cy="party-join-result"]').text()).toContain("Raiders");
    expect((panel.find('[data-cy="party-join-code"]').element as HTMLInputElement).value).toBe("");
  });

  it("says in plain words why the site said no, and keeps the code", async () => {
    mockMembership.requestJoin.mockResolvedValue({ ok: false, problem: "code-unknown" });
    const panel = open();
    await type(panel, '[data-cy="party-join-code"]', "ZZZZ2345");
    await panel.find('[data-cy="party-join-send"]').trigger("click");
    await flushPromises();
    expect(panel.find('[data-cy="party-join-error"]').text()).toContain("No party has that code");
    expect((panel.find('[data-cy="party-join-code"]').element as HTMLInputElement).value).toBe("ZZZZ2345");
  });

  it("is for a Game Master only", async () => {
    const panel = open(false);
    expect(panel.text()).toContain("Only a Game Master");
    expect(panel.find('[data-cy="party-join-send"]').attributes("disabled")).toBeDefined();
    expect(panel.find('[data-cy="party-form-send"]').attributes("disabled")).toBeDefined();
  });
});

describe("PartyFormJoin: forming a party", () => {
  it("forms a party with the name, emblem, rule and leader chosen, shows the code and says which party it made", async () => {
    mockMembership.createParty.mockResolvedValue({ ok: true, value: { party: { id: "p9", name: "Raiders" }, code: "ABCD2345" } });
    wrapper = mount(PartyFormJoin, { props: { heroes: HEROES, canManage: true } });
    await type(wrapper, '[data-cy="party-form-name"]', "Raiders");
    await wrapper.find('[data-cy="party-form-emblem-star"]').trigger("click");
    await wrapper.find('[data-cy="party-form-rule-members"]').trigger("click");
    await wrapper.find('[data-cy="party-form-leader-ben"]').trigger("click");
    await wrapper.find('[data-cy="party-form-send"]').trigger("click");
    await flushPromises();
    expect(mockMembership.createParty).toHaveBeenCalledWith({ name: "Raiders", emblem: "star", inviteRule: "members", leaderId: "ben" });
    expect(wrapper.find('[data-cy="party-form-code"]').text()).toContain("ABCD2345");
    expect(wrapper.emitted("formed")?.[0]).toEqual(["p9"]);
  });

  it("will not form a party until it has a name", async () => {
    wrapper = mount(PartyFormJoin, { props: { heroes: HEROES, canManage: true } });
    expect(wrapper.find('[data-cy="party-form-send"]').attributes("disabled")).toBeDefined();
    await type(wrapper, '[data-cy="party-form-name"]', "   ");
    expect(wrapper.find('[data-cy="party-form-send"]').attributes("disabled")).toBeDefined();
  });

  it("says why the site refused", async () => {
    mockMembership.createParty.mockResolvedValue({ ok: false, problem: "pro-required" });
    wrapper = mount(PartyFormJoin, { props: { heroes: HEROES, canManage: true } });
    await type(wrapper, '[data-cy="party-form-name"]', "Raiders");
    await wrapper.find('[data-cy="party-form-send"]').trigger("click");
    await flushPromises();
    expect(wrapper.find('[data-cy="party-form-error"]').text()).toContain("XP Pro");
  });
});

describe("PartyPresetBar", () => {
  it("offers the fixed words but leaves cheer and poke to the roster", () => {
    wrapper = mount(PartyPresetBar, { props: { partyId: "p1", heroId: "ana" } });
    expect(wrapper.find('[data-cy="party-word-gg"]').exists()).toBe(true);
    expect(wrapper.find('[data-cy="party-word-cheer"]').exists()).toBe(false);
    expect(wrapper.find('[data-cy="party-word-poke"]').exists()).toBe(false);
    expect(wrapper.findAll("input, textarea")).toHaveLength(0);
  });

  it("sends the word for the hero, and says why when it could not", async () => {
    mockControls.sendWord.mockResolvedValueOnce({ ok: true, value: undefined }).mockResolvedValueOnce({ ok: false, problem: "offline" });
    wrapper = mount(PartyPresetBar, { props: { partyId: "p1", heroId: "ana" } });
    await wrapper.find('[data-cy="party-word-gg"]').trigger("click");
    await flushPromises();
    expect(mockControls.sendWord).toHaveBeenCalledWith("p1", "ana", "gg");
    expect(wrapper.find('[data-cy="party-word-error"]').exists()).toBe(false);
    await wrapper.find('[data-cy="party-word-nice"]').trigger("click");
    await flushPromises();
    expect(wrapper.find('[data-cy="party-word-error"]').text()).toContain("No connection");
  });
});

const card = (heroId: string, nickname: string) => ({ heroId, nickname, level: 3, jobClass: "knight", look: null });
const PARTY: WireParty = {
  id: "p1",
  name: "Raiders",
  emblem: "dragon",
  inviteRule: "leader",
  leader: { familyId: "fam-1", heroId: "ana" },
  members: [
    { familyId: "fam-1", heroId: "ana", card: card("ana", "Ana"), role: "leader", joinedAt: "" },
    { familyId: "fam-2", heroId: "ben", card: card("ben", "Ben"), role: "member", joinedAt: "" },
  ],
  raid: null,
  seq: 2,
  code: "ABCD2345",
};
const REQUEST = (id: string, partyId = "p1"): WireRequest => ({ id, partyId, partyName: "Raiders", familyId: "fam-2", heroId: "dot", card: card("dot", "Dot"), createdAt: "" });

describe("Settings > Party: requests, parties and codes", () => {
  const open = async (party: WireParty = PARTY, incoming: WireRequest[] = [], outgoing: WireRequest[] = [], canEdit = true) => {
    usePartyStore().applyServer({ parties: [party], incoming, outgoing });
    wrapper = mount(PartyOutside, { props: { canEdit } });
    await flushPromises();
    return wrapper;
  };

  it("shows a hero the requests and parties with nothing to press: only a Game Master answers, leaves or changes a code", async () => {
    const page = await open(PARTY, [REQUEST("q1")], [REQUEST("q3", "p7")], false);
    expect(page.find('[data-cy="party-request-in-q1"]').text()).toContain("Dot");
    expect(page.find('[data-cy="party-request-out-q3"]').exists()).toBe(true);
    expect(page.find('[data-cy="party-my-parties"]').text()).toContain("Raiders");
    for (const hook of ["party-accept-q1", "party-decline-q1", "party-withdraw-q3", "party-leave-p1-ana", "party-rotate-p1", "party-code-p1", "party-qr-p1"]) {
      expect(page.find(`[data-cy="${hook}"]`).exists()).toBe(false);
    }
    expect(page.text()).toContain("Only a Game Master");
    expect(page.text()).not.toContain("ABCD2345");
  });

  it("starts the feed so the lists fill, and shows why when it cannot", async () => {
    mockFeed.problem.value = "pro-required";
    const page = await open();
    expect(mockFeed.start).toHaveBeenCalledTimes(1);
    expect(page.find('[data-cy="party-outside-problem"]').text()).toContain("XP Pro");
  });

  it("lets the leader accept or decline a request", async () => {
    mockMembership.resolveRequest.mockResolvedValue({ ok: true, value: undefined });
    const page = await open(PARTY, [REQUEST("q1"), REQUEST("q2")]);
    expect(page.find('[data-cy="party-request-in-q1"]').text()).toContain("Dot");
    await page.find('[data-cy="party-accept-q1"]').trigger("click");
    await page.find('[data-cy="party-decline-q2"]').trigger("click");
    expect(mockMembership.resolveRequest).toHaveBeenNthCalledWith(1, "p1", "q1", "approve");
    expect(mockMembership.resolveRequest).toHaveBeenNthCalledWith(2, "p1", "q2", "decline");
  });

  it("lets a family withdraw a request it made", async () => {
    mockMembership.resolveRequest.mockResolvedValue({ ok: true, value: undefined });
    const page = await open(PARTY, [], [REQUEST("q3", "p7")]);
    await page.find('[data-cy="party-withdraw-q3"]').trigger("click");
    expect(mockMembership.resolveRequest).toHaveBeenCalledWith("p7", "q3", "decline");
  });

  it("says so when there is nothing waiting", async () => {
    const page = await open();
    expect(page.find('[data-cy="party-requests"]').text()).toContain("No requests");
  });

  it("lists the parties with our own heroes in them, and lets only those leave", async () => {
    mockMembership.removeHero.mockResolvedValue({ ok: true, value: { disbanded: false } });
    const page = await open();
    const mine = page.find('[data-cy="party-my-parties"]');
    expect(mine.text()).toContain("Raiders");
    expect(page.find('[data-cy="party-leave-p1-ana"]').exists()).toBe(true);
    expect(page.find('[data-cy="party-leave-p1-ben"]').exists()).toBe(false);
    await page.find('[data-cy="party-leave-p1-ana"]').trigger("click");
    expect(mockMembership.removeHero).toHaveBeenCalledWith("p1", "ana");
  });

  it("shows the code and its QR to the leader, who can make a new one", async () => {
    mockControls.rotateCode.mockResolvedValue({ ok: true, value: "WXYZ6789" });
    const page = await open();
    expect(page.find('[data-cy="party-code-p1"]').text()).toContain("ABCD2345");
    expect(page.find('[data-cy="party-qr-p1"]').attributes("src")).toBe("data:qr:ABCD2345");
    await page.find('[data-cy="party-rotate-p1"]').trigger("click");
    expect(mockControls.rotateCode).toHaveBeenCalledWith("p1");
  });

  it("shows no code for a party the site did not hand one for", async () => {
    const { code: _code, ...hidden } = PARTY;
    const page = await open({ ...hidden, leader: { familyId: "fam-2", heroId: "ben" } });
    expect(page.find('[data-cy="party-code-p1"]').exists()).toBe(false);
    expect(page.find('[data-cy="party-rotate-p1"]').exists()).toBe(false);
  });
});
