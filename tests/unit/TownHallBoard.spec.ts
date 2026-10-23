import { flushPromises, mount } from "@vue/test-utils";
import TownHallBoard from "@/app/Console/MyPortal/HomeTown/TownHall/components/TownHallBoard.vue";
import type { DeskActions } from "@/app/Console/MyPortal/HomeTown/TownHall/components/useTownHallDesk";
import { fetchBoards, fetchPendingTopics, fetchTopics, type BoardInfo, type HeldComment, type TopicItem } from "@/lib/services/townhall/townHallFeed";

jest.mock("@/lib/utils/debug", () => ({
  __esModule: true,
  default: { error: jest.fn(), log: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

jest.mock("@/lib/services/townhall/townHallFeed", () => ({
  __esModule: true,
  fetchBoards: jest.fn(),
  fetchTopics: jest.fn(),
  fetchPendingTopics: jest.fn(),
}));

const boardsMock = fetchBoards as jest.Mock;
const topicsMock = fetchTopics as jest.Mock;
const pendingMock = fetchPendingTopics as jest.Mock;

const topic = (id: number, over: Partial<TopicItem> = {}): TopicItem => ({
  id,
  date: "2026-10-20T09:30:00",
  title: `Topic ${id}`,
  content: `<p>Words of ${id}</p>`,
  author: "Max",
  ...over,
});

const board = (id: number, slug: BoardInfo["slug"]): BoardInfo => ({ id, slug, name: `Board ${id}`, description: "", count: 0 });

const held = (over: Partial<HeldComment> = {}): HeldComment => ({
  id: 7,
  postId: 101,
  author: "Max",
  date: "2026-10-20T09:30:00",
  content: "<p>Great idea!</p>",
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

type Props = InstanceType<typeof TownHallBoard>["$props"];

const mountBoard = async (props: Partial<Props> = {}) => {
  const wrapper = mount(TownHallBoard, { props: { boardSlug: "feature-requests", waiting: [], ...props } });
  await flushPromises();
  return wrapper;
};
type Mounted = Awaited<ReturnType<typeof mountBoard>>;

const cy = (wrapper: Mounted, name: string) => wrapper.find(`[data-cy="${name}"]`);
const topicCards = (wrapper: Mounted) => wrapper.findAll('[data-cy="th-topic"]');
const pendingCards = (wrapper: Mounted) => wrapper.findAll('[data-cy="th-pending-topic"]');
// Ionic's button wrapper hands "disabled" to the element as a property, not an attribute
const isDisabled = (button: ReturnType<Mounted["find"]>) => (button.element as HTMLButtonElement).disabled === true;

beforeEach(() => {
  jest.clearAllMocks();
  boardsMock.mockResolvedValue([board(11, "feature-requests"), board(12, "ideas-suggestions")]);
  topicsMock.mockResolvedValue({ items: [topic(101), topic(102)], totalPages: 1 });
  pendingMock.mockResolvedValue([]);
});

describe("TownHallBoard", () => {
  it("shows a hero the board as before: no pending read, no tools", async () => {
    const wrapper = await mountBoard({ desk: fakeDesk(), heldComments: [held()] });

    expect(topicCards(wrapper)).toHaveLength(2);
    expect(topicsMock).toHaveBeenCalledWith(11, 1);
    expect(pendingMock).not.toHaveBeenCalled();
    expect(cy(wrapper, "th-pending-topic").exists()).toBe(false);
    expect(cy(wrapper, "th-chip").exists()).toBe(false);
    expect(cy(wrapper, "th-publish").exists()).toBe(false);
    expect(cy(wrapper, "th-edit").exists()).toBe(false);
    expect(cy(wrapper, "th-bin").exists()).toBe(false);
    expect(cy(wrapper, "th-held").exists()).toBe(false);
    expect(cy(wrapper, "th-comment").text()).toBe("Reply");
  });

  it("shows a publishing link the waiting topics first with Publish, Edit and Bin, and switching boards reads that board's pending ones", async () => {
    const desk = fakeDesk();
    pendingMock.mockResolvedValueOnce([topic(201, { title: "Soon to be seen" })]);
    const wrapper = await mountBoard({ canPublish: true, desk });

    expect(pendingMock).toHaveBeenCalledTimes(1);
    expect(pendingMock).toHaveBeenLastCalledWith(11);
    const pending = cy(wrapper, "th-pending-topic");
    expect(pending.classes()).toEqual(expect.arrayContaining(["th-topic", "is-pending"]));
    expect(pending.text()).toContain("Soon to be seen");
    expect(pending.find('[data-cy="th-chip"]').text()).toBe("Waiting");
    expect(pending.find('[data-cy="th-publish"]').text()).toBe("Publish");
    expect(pending.find('[data-cy="th-edit"]').text()).toBe("Edit");
    expect(pending.find('[data-cy="th-bin"]').text()).toBe("Bin");
    expect(pending.find('[data-cy="th-comment"]').exists()).toBe(false);
    expect(topicCards(wrapper)).toHaveLength(2);

    // The waiting topic comes after the board's About card and before the published ones
    const order = wrapper.findAll(".th-board__about, [data-cy='th-pending-topic'], [data-cy='th-topic']").map((card) => card.attributes("data-cy") ?? "about");
    expect(order).toEqual(["about", "th-pending-topic", "th-topic", "th-topic"]);

    await pending.find('[data-cy="th-publish"]').trigger("click");
    await flushPromises();

    expect(desk.publish).toHaveBeenCalledWith("topic", 201);
    expect(topicsMock).toHaveBeenCalledTimes(2);
    expect(pendingMock).toHaveBeenCalledTimes(2);

    await wrapper.setProps({ boardSlug: "ideas-suggestions" });
    await flushPromises();

    expect(pendingMock.mock.calls.map(([boardId]) => boardId)).toEqual([11, 11, 12]);
    expect(topicsMock).toHaveBeenLastCalledWith(12, 1);
  });

  it("emits edit-site for a topic and asks the desk to bin a published one", async () => {
    const bin = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const desk = fakeDesk({ bin });
    pendingMock.mockResolvedValue([topic(201)]);
    const wrapper = await mountBoard({ canPublish: true, desk });

    await cy(wrapper, "th-pending-topic").find('[data-cy="th-edit"]').trigger("click");
    expect(wrapper.emitted("edit-site")).toEqual([[{ type: "topic", id: 201 }]]);
    expect(wrapper.emitted("edit")).toBeUndefined();

    expect(topicCards(wrapper).every((card) => card.find('[data-cy="th-edit"]').exists())).toBe(true);
    await topicCards(wrapper)[1].find('[data-cy="th-edit"]').trigger("click");
    expect(wrapper.emitted("edit-site")?.[1]).toEqual([{ type: "topic", id: 102 }]);

    await topicCards(wrapper)[0].find('[data-cy="th-bin"]').trigger("click");
    await flushPromises();
    expect(bin).toHaveBeenLastCalledWith("topic", 101, true);
    expect(topicCards(wrapper)).toHaveLength(2);

    await topicCards(wrapper)[0].find('[data-cy="th-bin"]').trigger("click");
    await flushPromises();
    expect(bin).toHaveBeenCalledTimes(2);
    expect(topicCards(wrapper)).toHaveLength(1);
    expect(topicCards(wrapper)[0].text()).toContain("Topic 102");
    expect(pendingCards(wrapper)).toHaveLength(1);
  });

  it("bins a waiting topic with published false and the card goes only when the desk says it did", async () => {
    const bin = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const desk = fakeDesk({ bin });
    pendingMock.mockResolvedValue([topic(201)]);
    const wrapper = await mountBoard({ canPublish: true, desk });

    await cy(wrapper, "th-pending-topic").find('[data-cy="th-bin"]').trigger("click");
    await flushPromises();
    expect(bin).toHaveBeenLastCalledWith("topic", 201, false);
    expect(pendingCards(wrapper)).toHaveLength(1);

    await cy(wrapper, "th-pending-topic").find('[data-cy="th-bin"]').trigger("click");
    await flushPromises();
    expect(bin).toHaveBeenCalledTimes(2);
    expect(pendingCards(wrapper)).toHaveLength(0);
    expect(topicCards(wrapper)).toHaveLength(2);
  });

  it("lists held comments under their topic for a moderator", async () => {
    const wrapper = await mountBoard({ canModerate: true, desk: fakeDesk(), heldComments: [held({ postId: 101 }), held({ id: 8, postId: 101, content: "<p>Me too</p>" })] });

    const [first, second] = topicCards(wrapper);
    expect(first.find('[data-cy="th-comment"]').text()).toBe("Reply (2 held)");
    expect(first.findAll('[data-cy="th-held-comment"]')).toHaveLength(2);
    expect(first.find('[data-cy="th-held-comment"]').text()).toContain("Great idea!");
    expect(second.find('[data-cy="th-comment"]').text()).toBe("Reply");
    expect(second.find('[data-cy="th-held"]').exists()).toBe(false);
    expect(pendingMock).not.toHaveBeenCalled();
  });

  it("waits while the desk works on a topic and shows what went wrong under its actions", async () => {
    const desk = fakeDesk({
      isBusy: jest.fn((type: string, id: number) => type === "topic" && id === 101),
      troubleOf: jest.fn((type: string, id: number) => (type === "topic" && id === 101 ? "The site said no." : null)),
    });
    const wrapper = await mountBoard({ canPublish: true, desk });

    const [busy, idle] = topicCards(wrapper);
    expect(isDisabled(busy.find('[data-cy="th-edit"]'))).toBe(true);
    expect(isDisabled(busy.find('[data-cy="th-bin"]'))).toBe(true);
    expect(busy.find('[data-cy="th-trouble"]').text()).toBe("The site said no.");
    expect(isDisabled(idle.find('[data-cy="th-edit"]'))).toBe(false);
    expect(isDisabled(idle.find('[data-cy="th-bin"]'))).toBe(false);
    expect(idle.find('[data-cy="th-trouble"]').exists()).toBe(false);
  });

  it("reads the pending topics when the link's powers arrive after the tab mounted", async () => {
    pendingMock.mockResolvedValue([topic(201, { title: "Soon to be seen" })]);
    const wrapper = await mountBoard({ canPublish: false, desk: fakeDesk() });

    expect(pendingMock).not.toHaveBeenCalled();
    expect(cy(wrapper, "th-pending-topic").exists()).toBe(false);

    await wrapper.setProps({ canPublish: true });
    await flushPromises();

    expect(pendingMock).toHaveBeenCalledTimes(1);
    expect(pendingMock).toHaveBeenLastCalledWith(11);
    expect(cy(wrapper, "th-pending-topic").text()).toContain("Soon to be seen");
    expect(topicCards(wrapper)).toHaveLength(2);

    await wrapper.setProps({ canPublish: false });
    await flushPromises();

    expect(pendingMock).toHaveBeenCalledTimes(1);
    expect(cy(wrapper, "th-pending-topic").exists()).toBe(false);
    expect(cy(wrapper, "th-edit").exists()).toBe(false);
  });

  it("keeps the topics when the pending ones cannot be read", async () => {
    pendingMock.mockRejectedValue(new Error("no pending for you"));
    const wrapper = await mountBoard({ canPublish: true, desk: fakeDesk() });

    expect(cy(wrapper, "th-pending-topic").exists()).toBe(false);
    expect(cy(wrapper, "th-late").exists()).toBe(false);
    expect(topicCards(wrapper)).toHaveLength(2);
  });

  it("lets only the newest read fill the lists when a slow board lands last", async () => {
    let landSlowTopics: (value: { items: TopicItem[]; totalPages: number }) => void = () => undefined;
    let landSlowPending: (value: TopicItem[]) => void = () => undefined;
    const wrapper = await mountBoard({ canPublish: true, desk: fakeDesk() });

    topicsMock.mockImplementationOnce(() => new Promise((resolve) => (landSlowTopics = resolve)));
    pendingMock.mockImplementationOnce(() => new Promise((resolve) => (landSlowPending = resolve)));
    await wrapper.setProps({ boardSlug: "ideas-suggestions" });
    topicsMock.mockResolvedValueOnce({ items: [topic(301, { title: "Fresh topic" })], totalPages: 1 });
    pendingMock.mockResolvedValueOnce([topic(401, { title: "Fresh waiting" })]);
    await wrapper.setProps({ boardSlug: "feature-requests" });
    await flushPromises();

    landSlowTopics({ items: [topic(999, { title: "Stale topic" })], totalPages: 1 });
    landSlowPending([topic(998, { title: "Stale waiting" })]);
    await flushPromises();

    expect(wrapper.text()).toContain("Fresh topic");
    expect(wrapper.text()).toContain("Fresh waiting");
    expect(wrapper.text()).not.toContain("Stale");
  });
});
