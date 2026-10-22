import { flushPromises, mount } from "@vue/test-utils";
import TownHallUpdates from "@/app/Console/MyPortal/HomeTown/TownHall/components/TownHallUpdates.vue";
import type { DeskActions } from "@/app/Console/MyPortal/HomeTown/TownHall/components/useTownHallDesk";
import { fetchDrafts, fetchPatchNotes, type BugItem, type NewsItem } from "@/lib/services/townhall/townHallFeed";

jest.mock("@/lib/utils/debug", () => ({
  __esModule: true,
  default: { error: jest.fn(), log: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

jest.mock("@/lib/services/townhall/townHallFeed", () => ({
  __esModule: true,
  fetchPatchNotes: jest.fn(),
  fetchDrafts: jest.fn(),
}));

const notesMock = fetchPatchNotes as jest.Mock;
const draftsMock = fetchDrafts as jest.Mock;

const note = (id: number, over: Partial<NewsItem> = {}): NewsItem => ({
  id,
  date: "2026-10-20T09:30:00",
  title: `Note ${id}`,
  excerpt: `<p>Excerpt of ${id}</p>`,
  content: `<p>Words of ${id}</p>`,
  link: `https://forthexp.com/?p=${id}`,
  categories: [],
  ...over,
});

const bug = (id: number, over: Partial<BugItem> = {}): BugItem => ({
  id,
  date: "2026-10-20T09:30:00",
  title: `Bug ${id}`,
  status: "new",
  route: "/town-hall",
  environment: "Android 14",
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

const STATS = { heroes: 3, quests: 12, openToday: 5, pendingApprovals: 2 };

type Props = InstanceType<typeof TownHallUpdates>["$props"];

const mountUpdates = async (props: Partial<Props> = {}) => {
  const wrapper = mount(TownHallUpdates, { props: { stats: STATS, ...props } });
  await flushPromises();
  return wrapper;
};
type Mounted = Awaited<ReturnType<typeof mountUpdates>>;

const cy = (wrapper: Mounted, name: string) => wrapper.find(`[data-cy="${name}"]`);
const cards = (wrapper: Mounted) => wrapper.findAll(".th-patch-note");
const published = (wrapper: Mounted) => wrapper.findAll('[data-cy="th-patch-note"]');

beforeEach(() => {
  jest.clearAllMocks();
  notesMock.mockResolvedValue([note(101), note(102)]);
  draftsMock.mockResolvedValue([]);
});

describe("TownHallUpdates", () => {
  it("shows a hero the notes and the statistics only", async () => {
    const wrapper = await mountUpdates({ desk: fakeDesk(), bugs: [bug(7)] });

    expect(published(wrapper)).toHaveLength(2);
    expect(published(wrapper)[0].text()).toContain("Note 101");
    expect(published(wrapper)[0].text()).toContain("Words of 101");
    expect(cy(wrapper, "th-stats").text()).toContain("Game Statistics");
    expect(cy(wrapper, "th-stats").text()).toContain("12");
    expect(cy(wrapper, "th-draft").exists()).toBe(false);
    expect(cy(wrapper, "th-edit").exists()).toBe(false);
    expect(cy(wrapper, "th-bin").exists()).toBe(false);
    expect(cy(wrapper, "th-bugnet").exists()).toBe(false);
    expect(draftsMock).not.toHaveBeenCalled();
  });

  it("says so when there are no patch notes", async () => {
    notesMock.mockResolvedValue([]);
    const wrapper = await mountUpdates();

    expect(cy(wrapper, "th-no-patch-notes").exists()).toBe(true);
    expect(cy(wrapper, "th-stats").exists()).toBe(true);
  });

  it("shows a publishing link the patch-note drafts first and the Bug Net card", async () => {
    const desk = fakeDesk();
    draftsMock.mockResolvedValueOnce([note(201, { title: "Coming soon" })]);
    const wrapper = await mountUpdates({ canPublish: true, desk, bugs: [bug(7)] });

    const draft = cy(wrapper, "th-draft");
    expect(cards(wrapper)[0].attributes("data-cy")).toBe("th-draft");
    expect(draft.classes()).toEqual(expect.arrayContaining(["th-patch-note", "is-draft"]));
    expect(draft.text()).toContain("Coming soon");
    expect(draft.find('[data-cy="th-chip"]').text()).toBe("Draft");
    expect(draft.find('[data-cy="th-publish"]').text()).toBe("Publish");
    expect(draft.find('[data-cy="th-edit"]').text()).toBe("Edit");
    expect(draft.find('[data-cy="th-bin"]').text()).toBe("Bin");
    expect(draftsMock).toHaveBeenCalledWith("patch-notes");

    // Published notes gain Edit and Bin, but no Publish and no Draft chip
    expect(published(wrapper)).toHaveLength(2);
    published(wrapper).forEach((card) => {
      expect(card.find('[data-cy="th-edit"]').exists()).toBe(true);
      expect(card.find('[data-cy="th-bin"]').exists()).toBe(true);
      expect(card.find('[data-cy="th-publish"]').exists()).toBe(false);
      expect(card.find('[data-cy="th-chip"]').exists()).toBe(false);
    });

    // The Bug Net sits between the notes and the statistics
    const bugNet = cy(wrapper, "th-bugnet");
    expect(bugNet.exists()).toBe(true);
    expect(bugNet.findAll('[data-cy="th-bug"]')).toHaveLength(1);
    const order = wrapper.findAll(".th-patch-note, .th-bugnet, .th-stats").map((el) => el.attributes("data-cy"));
    expect(order).toEqual(["th-draft", "th-patch-note", "th-patch-note", "th-bugnet", "th-stats"]);

    await draft.find('[data-cy="th-edit"]').trigger("click");
    await published(wrapper)[1].find('[data-cy="th-edit"]').trigger("click");
    expect(wrapper.emitted("edit-site")).toEqual([[{ type: "post", id: 201 }], [{ type: "post", id: 102 }]]);

    // The Bug Net works through the same desk
    await bugNet.find('[data-cy="th-resolve"]').trigger("click");
    expect(desk.resolve).toHaveBeenCalledWith(7);
  });

  it("publishing a draft reloads the notes", async () => {
    const desk = fakeDesk();
    draftsMock.mockResolvedValueOnce([note(201, { title: "Coming soon" })]);
    const wrapper = await mountUpdates({ canPublish: true, desk });

    await cy(wrapper, "th-draft").find('[data-cy="th-publish"]').trigger("click");
    await flushPromises();

    expect(desk.publish).toHaveBeenCalledWith("post", 201);
    expect(notesMock).toHaveBeenCalledTimes(2);
    expect(draftsMock).toHaveBeenCalledTimes(2);
    expect(cy(wrapper, "th-draft").exists()).toBe(false);
    expect(published(wrapper)).toHaveLength(2);
  });

  it("leaves a draft where it is when the desk could not publish it", async () => {
    const desk = fakeDesk({ publish: jest.fn().mockResolvedValue(false) });
    draftsMock.mockResolvedValue([note(201)]);
    const wrapper = await mountUpdates({ canPublish: true, desk });

    await cy(wrapper, "th-publish").trigger("click");
    await flushPromises();

    expect(desk.publish).toHaveBeenCalledWith("post", 201);
    expect(notesMock).toHaveBeenCalledTimes(1);
    expect(draftsMock).toHaveBeenCalledTimes(1);
    expect(cy(wrapper, "th-draft").exists()).toBe(true);
  });

  it("bins a draft or a published note through the desk and the card goes only when the desk says it did", async () => {
    const bin = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    const desk = fakeDesk({ bin });
    draftsMock.mockResolvedValue([note(201)]);
    const wrapper = await mountUpdates({ canPublish: true, desk });

    await cy(wrapper, "th-draft").find('[data-cy="th-bin"]').trigger("click");
    await flushPromises();
    expect(bin).toHaveBeenLastCalledWith("post", 201, false);
    expect(cy(wrapper, "th-draft").exists()).toBe(true);

    await cy(wrapper, "th-draft").find('[data-cy="th-bin"]').trigger("click");
    await flushPromises();
    expect(bin).toHaveBeenCalledTimes(2);
    expect(cy(wrapper, "th-draft").exists()).toBe(false);
    expect(published(wrapper)).toHaveLength(2);

    await published(wrapper)[0].find('[data-cy="th-bin"]').trigger("click");
    await flushPromises();
    expect(bin).toHaveBeenLastCalledWith("post", 101, true);
    expect(published(wrapper)).toHaveLength(1);
    expect(published(wrapper)[0].text()).toContain("Note 102");
  });

  it("reads the patch-note drafts when the link's powers arrive after the tab mounted", async () => {
    notesMock.mockResolvedValue([note(101)]);
    draftsMock.mockResolvedValue([note(201, { title: "Coming soon" })]);
    const wrapper = await mountUpdates({ canPublish: false, desk: fakeDesk() });

    expect(draftsMock).not.toHaveBeenCalled();
    expect(cy(wrapper, "th-draft").exists()).toBe(false);

    await wrapper.setProps({ canPublish: true });
    await flushPromises();

    expect(draftsMock).toHaveBeenCalledTimes(1);
    expect(cy(wrapper, "th-draft").text()).toContain("Coming soon");
    expect(published(wrapper)).toHaveLength(1);
    expect(cy(wrapper, "th-bugnet").exists()).toBe(true);

    // On a drop the tools go by themselves, the drafts with them, and nothing is read again
    await wrapper.setProps({ canPublish: false });
    await flushPromises();

    expect(draftsMock).toHaveBeenCalledTimes(1);
    expect(cy(wrapper, "th-draft").exists()).toBe(false);
    expect(cy(wrapper, "th-publish").exists()).toBe(false);
    expect(cy(wrapper, "th-bugnet").exists()).toBe(false);
  });

  it("keeps the notes when the drafts cannot be read", async () => {
    draftsMock.mockRejectedValue(new Error("no drafts for you"));
    const wrapper = await mountUpdates({ canPublish: true, desk: fakeDesk() });

    expect(cy(wrapper, "th-draft").exists()).toBe(false);
    expect(cy(wrapper, "th-late").exists()).toBe(false);
    expect(published(wrapper)).toHaveLength(2);
  });

  it("waits while the desk works on a note and shows what went wrong under its actions", async () => {
    const desk = fakeDesk({
      isBusy: jest.fn((type: string, id: number) => type === "post" && id === 101),
      troubleOf: jest.fn((type: string, id: number) => (type === "post" && id === 101 ? "The site said no." : null)),
    });
    const wrapper = await mountUpdates({ canPublish: true, desk });

    const [busy, idle] = published(wrapper);
    const isDisabled = (button: ReturnType<typeof busy.find>) => (button.element as HTMLButtonElement).disabled === true;
    expect(isDisabled(busy.find('[data-cy="th-edit"]'))).toBe(true);
    expect(isDisabled(busy.find('[data-cy="th-bin"]'))).toBe(true);
    expect(busy.find('[data-cy="th-trouble"]').text()).toBe("The site said no.");
    expect(isDisabled(idle.find('[data-cy="th-edit"]'))).toBe(false);
    expect(isDisabled(idle.find('[data-cy="th-bin"]'))).toBe(false);
    expect(idle.find('[data-cy="th-trouble"]').exists()).toBe(false);
  });

  it("shows the gap and still the statistics when the notes cannot be read", async () => {
    notesMock.mockRejectedValue(new Error("boom"));
    const wrapper = await mountUpdates();

    expect(cy(wrapper, "th-late").exists()).toBe(true);
    expect(cy(wrapper, "th-stats").exists()).toBe(true);
  });
});
