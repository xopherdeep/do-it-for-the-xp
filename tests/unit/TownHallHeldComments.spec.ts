import { mount } from "@vue/test-utils";
import TownHallHeldComments from "@/app/Console/MyPortal/HomeTown/TownHall/components/TownHallHeldComments.vue";
import type { DeskActions } from "@/app/Console/MyPortal/HomeTown/TownHall/components/useTownHallDesk";
import type { HeldComment } from "@/lib/services/townhall/townHallFeed";

const held = (over: Partial<HeldComment> = {}): HeldComment => ({
  id: 7,
  postId: 101,
  author: "Max",
  date: "2026-10-20T09:30:00",
  content: "<p>Great news!</p>",
  ...over,
});

/** A desk that answers yes to everything and is never busy; each test bends the one call it is about */
const fakeDesk = (over: Partial<DeskActions> = {}): DeskActions => ({
  publish: jest.fn().mockResolvedValue(true),
  bin: jest.fn().mockResolvedValue(true),
  approve: jest.fn().mockResolvedValue(true),
  resolve: jest.fn().mockResolvedValue(true),
  isBusy: jest.fn().mockReturnValue(false),
  troubleOf: jest.fn().mockReturnValue(null),
  ...over,
});

const list = (comments: HeldComment[], desk: DeskActions = fakeDesk()) => mount(TownHallHeldComments, { props: { comments, desk } });
type Listed = ReturnType<typeof list>;

const rows = (wrapper: Listed) => wrapper.findAll('[data-cy="th-held-comment"]');
// Ionic's button wrapper hands "disabled" to the element as a property, not an attribute
const isDisabled = (button: ReturnType<Listed["find"]>) => (button.element as HTMLButtonElement).disabled === true;

describe("TownHallHeldComments", () => {
  it("draws nothing without held comments", () => {
    const wrapper = list([]);

    expect(wrapper.find('[data-cy="th-held"]').exists()).toBe(false);
    expect(wrapper.find('[data-cy="th-held-comment"]').exists()).toBe(false);
  });

  it("lists each held comment with its chip and approves or bins it through the desk", async () => {
    const desk = fakeDesk();
    const wrapper = list([held(), held({ id: 8, author: "Ada", content: "<p>Me too</p><script>alert(1)</script>" })], desk);

    const found = rows(wrapper);
    expect(found).toHaveLength(2);
    expect(found[0].text()).toContain("Max");
    expect(found[0].text()).toContain("October 20, 2026");
    expect(found[0].text()).toContain("Great news!");
    expect(found[0].find('[data-cy="th-held-chip"]').text()).toBe("Held");
    expect(found[1].find('[data-cy="th-held-chip"]').text()).toBe("Held");
    expect(found[1].text()).toContain("Me too");
    expect(found[1].find("script").exists()).toBe(false);
    expect(found[0].find('[data-cy="th-approve"]').text()).toBe("Approve");
    expect(found[0].find('[data-cy="th-bin-comment"]').text()).toBe("Bin");

    await found[0].find('[data-cy="th-approve"]').trigger("click");
    await found[1].find('[data-cy="th-bin-comment"]').trigger("click");

    expect(desk.approve).toHaveBeenCalledTimes(1);
    expect(desk.approve).toHaveBeenCalledWith(7);
    expect(desk.bin).toHaveBeenCalledTimes(1);
    expect(desk.bin).toHaveBeenCalledWith("comment", 8, false);
  });

  it("waits while the desk is busy with that comment and shows its trouble", () => {
    const desk = fakeDesk({
      isBusy: jest.fn((type: string, id: number) => type === "comment" && id === 7),
      troubleOf: jest.fn((type: string, id: number) => (type === "comment" && id === 7 ? "The site said no." : null)),
    });
    const wrapper = list([held(), held({ id: 8 })], desk);

    const [busy, idle] = rows(wrapper);
    expect(isDisabled(busy.find('[data-cy="th-approve"]'))).toBe(true);
    expect(isDisabled(busy.find('[data-cy="th-bin-comment"]'))).toBe(true);
    expect(busy.find('[data-cy="th-trouble"]').text()).toBe("The site said no.");
    expect(isDisabled(idle.find('[data-cy="th-approve"]'))).toBe(false);
    expect(isDisabled(idle.find('[data-cy="th-bin-comment"]'))).toBe(false);
    expect(idle.find('[data-cy="th-trouble"]').exists()).toBe(false);
  });
});
