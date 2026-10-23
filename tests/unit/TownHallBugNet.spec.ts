import { mount } from "@vue/test-utils";
import TownHallBugNet from "@/app/Console/MyPortal/HomeTown/TownHall/components/TownHallBugNet.vue";
import type { DeskActions } from "@/app/Console/MyPortal/HomeTown/TownHall/components/useTownHallDesk";
import type { BugItem } from "@/lib/services/townhall/townHallFeed";

const bug = (id: number, over: Partial<BugItem> = {}): BugItem => ({
  id,
  date: "2026-10-20T09:30:00",
  title: `Bug ${id}`,
  status: "new",
  route: "/town-hall",
  environment: "Android 14, Chrome 130\nViewport 390x844\nSecond line that stays behind",
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

const mountNet = (bugs: BugItem[], desk: DeskActions = fakeDesk()) => mount(TownHallBugNet, { props: { bugs, desk } });
type Mounted = ReturnType<typeof mountNet>;

const bugsOf = (wrapper: Mounted) => wrapper.findAll('[data-cy="th-bug"]');
// Ionic's button wrapper hands "disabled" to the element as a property, not an attribute
const isDisabled = (button: ReturnType<Mounted["find"]>) => (button.element as HTMLButtonElement).disabled === true;

describe("TownHallBugNet", () => {
  it("says when nothing waits", () => {
    const wrapper = mountNet([]);

    const card = wrapper.find('[data-cy="th-bugnet"]');
    expect(card.exists()).toBe(true);
    expect(card.text()).toContain("Bug Net");
    expect(card.text()).toContain("No bug reports waiting.");
    expect(bugsOf(wrapper)).toHaveLength(0);
  });

  it("lists a bug with its chip, route and first environment line and resolves or bins it through the desk", async () => {
    const desk = fakeDesk();
    const wrapper = mountNet([bug(7), bug(8, { status: "triaged", title: "<em>Odd</em> crash<script>alert(1)</script>", route: "", environment: "" })], desk);

    expect(wrapper.text()).not.toContain("No bug reports waiting.");
    const [first, second] = bugsOf(wrapper);
    expect(bugsOf(wrapper)).toHaveLength(2);

    expect(first.text()).toContain("Bug 7");
    expect(first.text()).toContain("October 20, 2026");
    expect(first.find('[data-cy="th-chip"]').text()).toBe("New");
    expect(first.find('[data-cy="th-chip"]').classes()).toContain("is-new");
    expect(first.text()).toContain("/town-hall");
    expect(first.text()).toContain("Android 14, Chrome 130");
    expect(first.text()).not.toContain("Viewport 390x844");
    expect(first.text()).not.toContain("Second line");
    expect(first.find('[data-cy="th-resolve"]').text()).toBe("Resolve");
    expect(first.find('[data-cy="th-bin"]').text()).toBe("Bin");

    // A status other than new shows as the site gave it; a title is sanitized; no route or environment draws no line
    expect(second.find('[data-cy="th-chip"]').text()).toBe("triaged");
    expect(second.find('[data-cy="th-chip"]').classes()).not.toContain("is-new");
    expect(second.find("em").text()).toBe("Odd");
    expect(second.html()).not.toContain("<script");
    expect(second.find(".th-bug__route").exists()).toBe(false);
    expect(second.find(".th-bug__environment").exists()).toBe(false);

    await first.find('[data-cy="th-resolve"]').trigger("click");
    expect(desk.resolve).toHaveBeenCalledWith(7);

    await second.find('[data-cy="th-bin"]').trigger("click");
    expect(desk.bin).toHaveBeenCalledWith("bug", 8, false);
    expect(desk.bin).toHaveBeenCalledTimes(1);
  });

  it("waits while the desk works on a bug and shows what went wrong under its buttons", () => {
    const desk = fakeDesk({
      isBusy: jest.fn((type: string, id: number) => type === "bug" && id === 7),
      troubleOf: jest.fn((type: string, id: number) => (type === "bug" && id === 7 ? "The site said no." : null)),
    });
    const wrapper = mountNet([bug(7), bug(8)], desk);

    const [busy, idle] = bugsOf(wrapper);
    expect(isDisabled(busy.find('[data-cy="th-resolve"]'))).toBe(true);
    expect(isDisabled(busy.find('[data-cy="th-bin"]'))).toBe(true);
    expect(busy.find('[data-cy="th-trouble"]').text()).toBe("The site said no.");
    expect(isDisabled(idle.find('[data-cy="th-resolve"]'))).toBe(false);
    expect(isDisabled(idle.find('[data-cy="th-bin"]'))).toBe(false);
    expect(idle.find('[data-cy="th-trouble"]').exists()).toBe(false);
  });
});
