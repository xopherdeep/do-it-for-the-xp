import { mount } from "@vue/test-utils";
import CreditsRoll from "@/components/organisms/CreditsRoll/CreditsRoll.vue";
import { MAKERS } from "@/lib/services/copy/credits";
import type { CreditsView } from "@/lib/services/projects/projectFinish";
import { dayText } from "@/lib/services/projects/projectWizard";

/**
 * The credits roll: the heroes of the tower (their class, chores, bosses and floors, the dates and the days early), then
 * the game's makers by role and name, then a thank-you. It scrolls by itself, can be skipped, and says `done` once.
 */

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn(), default: {} }));

const viewOf = (extra: Partial<CreditsView> = {}): CreditsView => ({
  towerName: "The Spring Spire",
  startOn: "2027-04-03",
  finishedOn: "2027-04-08",
  daysEarly: 2,
  heroes: [
    { heroId: "twelve", name: "Twelve", className: "Mage", chores: 7, bosses: 2, floors: ["1F", "2F", "5F"] },
    { heroId: "six", name: "Six", className: "", chores: 1, bosses: 0, floors: ["1F"] },
  ],
  ...extra,
});

const mountRoll = (view: CreditsView = viewOf()) => mount(CreditsRoll, { props: { credits: view } });

describe("the credits roll", () => {
  it("opens with the heroes of the tower, with the dates and how early the family finished", () => {
    const text = mountRoll().get('[data-test="credits-heroes"]').text();
    expect(text).toContain("The Heroes of The Spring Spire");
    expect(text).toContain(`Started ${dayText("2027-04-03")}`);
    expect(text).toContain(`Finished ${dayText("2027-04-08")}`);
    expect(text).toContain("2 days early!");
  });

  it("says 1 day early, and right on time", () => {
    expect(mountRoll(viewOf({ daysEarly: 1 })).get('[data-test="credits-heroes"]').text()).toContain("1 day early!");
    const onTime = mountRoll(viewOf({ daysEarly: 0 })).get('[data-test="credits-heroes"]').text();
    expect(onTime).toContain("Right on time!");
    expect(onTime).not.toContain("early");
  });

  it("shows each hero with their class, chores, bosses and floors", () => {
    const heroes = mountRoll().findAll('[data-test="credits-hero"]');
    expect(heroes).toHaveLength(2);
    expect(heroes[0].text()).toContain("Twelve the Mage");
    expect(heroes[0].text()).toContain("Chores: 7");
    expect(heroes[0].text()).toContain("Bosses: 2");
    expect(heroes[0].text()).toContain("Floors: 1F, 2F, 5F");
  });

  it("shows a hero with no class by name alone", () => {
    const six = mountRoll().findAll('[data-test="credits-hero"]')[1];
    expect(six.get('[data-test="credits-hero-name"]').text()).toBe("Six");
  });

  it("has a line for a tower nobody could be named for", () => {
    const text = mountRoll(viewOf({ heroes: [] })).get('[data-test="credits-heroes"]').text();
    expect(text).toContain("The whole family played their part.");
  });

  it("goes on to the makers of the game: Do It For The XP, each role and name in order", () => {
    const makers = mountRoll().get('[data-test="credits-makers"]');
    expect(makers.text()).toContain("Do It For The XP");
    const rows = makers.findAll('[data-test="credits-maker"]');
    expect(rows.map((row) => [row.get("dt").text(), row.get("dd").text()])).toEqual(MAKERS.map((maker) => [maker.role, maker.name]));
  });

  it("ends with a thank-you for playing", () => {
    const wrapper = mountRoll();
    expect(wrapper.get('[data-test="credits-thanks"]').text()).toBe("Thank you for playing!");
  });

  it("plays the heroes, then the makers, then the thank-you", () => {
    const html = mountRoll().html();
    const at = (needle: string) => html.indexOf(needle);
    expect(at("The Heroes of")).toBeGreaterThan(-1);
    expect(at("Do It For The XP")).toBeGreaterThan(at("The Heroes of"));
    expect(at("Thank you for playing!")).toBeGreaterThan(at("Do It For The XP"));
  });

  it("scrolls on its own: the animation runs for longer when there are more heroes to credit", () => {
    const seconds = (view: CreditsView) => Number.parseFloat(String(mountRoll(view).get('[data-test="credits-scroll"]').attributes("style")?.match(/--credits-seconds:\s*([\d.]+)s/)?.[1]));
    const many = Array.from({ length: 6 }, (_, index) => ({ heroId: `h${index}`, name: `Hero ${index}`, className: "Mage", chores: 3, bosses: 1, floors: ["1F"] }));
    expect(seconds(viewOf())).toBeGreaterThan(0);
    expect(seconds(viewOf({ heroes: many }))).toBeGreaterThan(seconds(viewOf()));
  });

  it("says done when the scroll ends", async () => {
    const wrapper = mountRoll();
    await wrapper.get('[data-test="credits-scroll"]').trigger("animationend");
    expect(wrapper.emitted("done")).toHaveLength(1);
  });

  it("says done when it is skipped", async () => {
    const wrapper = mountRoll();
    expect(wrapper.get('[data-test="credits-skip"]').text()).toBe("Skip");
    await wrapper.get('[data-test="credits-skip"]').trigger("click");
    expect(wrapper.emitted("done")).toHaveLength(1);
  });

  it("says done once, however it ends", async () => {
    const wrapper = mountRoll();
    await wrapper.get('[data-test="credits-skip"]').trigger("click");
    await wrapper.get('[data-test="credits-scroll"]').trigger("animationend");
    await wrapper.get('[data-test="credits-skip"]').trigger("click");
    expect(wrapper.emitted("done")).toHaveLength(1);
  });

  it("is a dialog that names the tower", () => {
    const dialog = mountRoll().get('[data-test="credits"]');
    expect(dialog.attributes("role")).toBe("dialog");
    expect(dialog.attributes("aria-label")).toBe("The Heroes of The Spring Spire");
  });
});
