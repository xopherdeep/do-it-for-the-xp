import { mount } from "@vue/test-utils";
import PartyRaidsTab from "@/app/Console/MyPortal/party/PartyRaidsTab.vue";
import PartySynergiesTab from "@/app/Console/MyPortal/party/PartySynergiesTab.vue";
import PartyRosterTab from "@/app/Console/MyPortal/party/PartyRosterTab.vue";
import type { PartyMember } from "@/lib/services/party/partyStats";

/**
 * Party > Raids and Synergies keep their tabs but hold the game's Coming soon card, not the old one-line card
 * (GitHub issue 140). Party > Roster drops the Party Roles legend, which described roles nothing in the game uses.
 */

jest.mock("@/app.config", () => ({ __esModule: true, default: { $getUserAvatar: () => "avatar.png" } }));

const MEMBERS: PartyMember[] = [
  { id: "m1", name: { nick: "Ash" }, jobClass: "Knight", role: "leader", stats: { level: 4 } },
  { id: "m2", name: { full: "Birch Tree" }, race: "Elf" },
];

describe("Party Raids and Synergies tabs", () => {
  it("shows the Coming soon card in the raids' own words, under the same test hook as before", () => {
    const wrapper = mount(PartyRaidsTab);

    expect(wrapper.find('[data-cy="party-raids-empty"]').exists()).toBe(true);
    expect(wrapper.find('[data-cy="coming-soon"]').exists()).toBe(true);
    expect(wrapper.find(".xp-coming-soon__badge").text()).toBe("Coming soon");
    expect(wrapper.findAll(".xp-coming-soon__item h2").map((title) => title.text())).toEqual(["Party raids"]);
    expect(wrapper.text()).not.toContain("Coming with parties");
  });

  it("shows the Coming soon card in the synergies' own words, under the same test hook as before", () => {
    const wrapper = mount(PartySynergiesTab);

    expect(wrapper.find('[data-cy="party-synergies-empty"]').exists()).toBe(true);
    expect(wrapper.find('[data-cy="coming-soon"]').exists()).toBe(true);
    expect(wrapper.find(".xp-coming-soon__badge").text()).toBe("Coming soon");
    expect(wrapper.findAll(".xp-coming-soon__item h2").map((title) => title.text())).toEqual(["Party synergies"]);
    expect(wrapper.text()).not.toContain("Coming with parties");
  });
});

describe("Party Roster tab", () => {
  const mountRoster = () => mount(PartyRosterTab, { props: { members: MEMBERS } });

  it("no longer lists Party Roles", () => {
    const wrapper = mountRoster();

    expect(wrapper.text()).not.toContain("Party Roles");
    expect(wrapper.text()).not.toMatch(/Champion|Scout|Support/);
  });

  it("still lists every member and the Add Hero row", () => {
    const wrapper = mountRoster();

    const rows = wrapper.findAll('[data-cy="party-member-item"]');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain("Ash");
    expect(rows[0].text()).toContain("Knight");
    expect(rows[0].text()).toContain("Lv.4");
    expect(rows[1].text()).toContain("Birch Tree");
    expect(wrapper.find('[data-cy="party-add-member"]').exists()).toBe(true);
  });

  it("still opens a member's profile and the invite flow", async () => {
    const wrapper = mountRoster();

    await wrapper.findAll('[data-cy="party-member-item"]')[1].trigger("click");
    await wrapper.find('[data-cy="party-add-member"]').trigger("click");

    expect(wrapper.emitted("openProfile")?.[0]).toEqual([MEMBERS[1]]);
    expect(wrapper.emitted("inviteMember")).toHaveLength(1);
  });
});
