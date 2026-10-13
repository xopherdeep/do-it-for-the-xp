import { createPinia, setActivePinia } from "pinia";
import { flushPromises, mount } from "@vue/test-utils";
import XpTownHallApprovals from "@/app/Admin/XpApprovals/components/XpTownHallApprovals.vue";
import { useTownHallStore } from "@/lib/store/stores/townHall";
import type { TownHallPost } from "@/lib/services/townhall/townHallTypes";

const mockDb = {
  getLink: jest.fn(),
  saveLink: jest.fn(),
  clearLink: jest.fn(),
  getPosts: jest.fn(),
  savePosts: jest.fn(),
};
jest.mock("@/lib/databases/TownHallDb", () => ({ __esModule: true, getTownHallDb: () => mockDb }));

const aPost = (over: Partial<TownHallPost> = {}): TownHallPost => ({
  id: "p-1",
  kind: "topic",
  heroId: "h-1",
  heroName: "Ari",
  createdAt: 1760000000000,
  status: "awaiting-gm",
  board: "feature-requests",
  title: "More dragons",
  body: "Please add dragons.",
  ...over,
});

const aComment = (over: Partial<TownHallPost> = {}): TownHallPost =>
  aPost({ id: "c-1", kind: "comment", postId: 12, board: undefined, title: undefined, body: "Nice news!", ...over });

/** The Game Master's list over a real store that holds these posts. */
const open = async (posts: TownHallPost[]) => {
  mockDb.getPosts.mockResolvedValue(posts);
  const store = useTownHallStore();
  const wrapper = mount(XpTownHallApprovals);
  await flushPromises();
  return { wrapper, store };
};
type Opened = Awaited<ReturnType<typeof open>>["wrapper"];

const rows = (wrapper: Opened) => wrapper.findAll('[data-cy="th-approval"]');
const press = (row: ReturnType<Opened["findAll"]>[number], name: "th-approve" | "th-reject") => row.find(`[data-cy="${name}"]`).trigger("click");
const statusOf = (store: ReturnType<typeof useTownHallStore>, id: string) => store.posts.find((post) => post.id === id)?.status;

describe("XpTownHallApprovals", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    jest.resetAllMocks();
    mockDb.getLink.mockResolvedValue(null);
    mockDb.getPosts.mockResolvedValue([]);
    mockDb.savePosts.mockResolvedValue(undefined);
  });

  it("lists the posts that wait for the Game Master, one row each, and none of the others", async () => {
    const { wrapper } = await open([
      aPost({ id: "a" }),
      aPost({ id: "q", status: "queued", title: "Already approved" }),
      aComment({ id: "b" }),
      aPost({ id: "r", status: "rejected", title: "Turned down" }),
    ]);

    const found = rows(wrapper);
    expect(found).toHaveLength(2);
    expect(found[0].text()).toContain("More dragons");
    expect(found[1].text()).toContain("Nice news!");
    expect(wrapper.text()).not.toContain("Already approved");
    expect(wrapper.text()).not.toContain("Turned down");
  });

  it("shows the hero, the kind, the board, the title and the message of a topic", async () => {
    const { wrapper } = await open([aPost()]);

    const row = rows(wrapper)[0];
    expect(row.find('[data-cy="th-approval-hero"]').text()).toBe("Ari");
    expect(row.find('[data-cy="th-approval-kind"]').text()).toBe("Topic");
    expect(row.find('[data-cy="th-approval-where"]').text()).toBe("Feature Requests");
    expect(row.find('[data-cy="th-approval-title"]').text()).toBe("More dragons");
    expect(row.find('[data-cy="th-approval-body"]').text()).toBe("Please add dragons.");
  });

  it("names the post a comment answers, which has no title of its own", async () => {
    const { wrapper } = await open([aComment()]);

    const row = rows(wrapper)[0];
    expect(row.find('[data-cy="th-approval-kind"]').text()).toBe("Comment");
    expect(row.find('[data-cy="th-approval-title"]').text()).toBe("Comment on post #12");
    expect(row.find('[data-cy="th-approval-body"]').text()).toBe("Nice news!");
  });

  it("shows what the hero wrote as text, never as markup", async () => {
    const { wrapper } = await open([aPost({ title: "<b>Hi</b>", body: "<img src=x onerror=alert(1)>" })]);

    expect(wrapper.find("b").exists()).toBe(false);
    expect(wrapper.find("img").exists()).toBe(false);
    expect(rows(wrapper)[0].find('[data-cy="th-approval-title"]').text()).toBe("<b>Hi</b>");
    expect(rows(wrapper)[0].find('[data-cy="th-approval-body"]').text()).toBe("<img src=x onerror=alert(1)>");
  });

  it("says so when nothing waits", async () => {
    const { wrapper } = await open([aPost({ status: "queued" })]);

    expect(rows(wrapper)).toHaveLength(0);
    expect(wrapper.find('[data-cy="th-approvals-empty"]').exists()).toBe(true);
  });

  it("does not say nothing waits before the posts are read", async () => {
    mockDb.getPosts.mockReturnValue(new Promise(() => undefined));
    setActivePinia(createPinia());
    const wrapper = mount(XpTownHallApprovals);
    await flushPromises();

    expect(wrapper.find('[data-cy="th-approvals-empty"]').exists()).toBe(false);
  });

  it("approves the first post, then sends the queue", async () => {
    const { wrapper, store } = await open([aPost({ id: "a" }), aComment({ id: "b" })]);
    const approve = jest.spyOn(store, "approve");
    const flush = jest.spyOn(store, "flush");

    await press(rows(wrapper)[0], "th-approve");
    await flushPromises();

    expect(approve).toHaveBeenCalledTimes(1);
    expect(approve).toHaveBeenCalledWith("a");
    expect(flush).toHaveBeenCalledTimes(1);
    expect(approve.mock.invocationCallOrder[0]).toBeLessThan(flush.mock.invocationCallOrder[0]);
    expect(statusOf(store, "a")).toBe("queued");
    expect(rows(wrapper)).toHaveLength(1);
  });

  it("waits for the approval to be saved before it sends the queue", async () => {
    const { wrapper, store } = await open([aPost({ id: "a" })]);
    let saved!: () => void;
    jest.spyOn(store, "approve").mockReturnValue(new Promise<void>((resolve) => (saved = resolve)));
    const flush = jest.spyOn(store, "flush");

    await press(rows(wrapper)[0], "th-approve");
    await flushPromises();
    expect(flush).not.toHaveBeenCalled();

    saved();
    await flushPromises();
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it("rejects the second post and does not send anything", async () => {
    const { wrapper, store } = await open([aPost({ id: "a" }), aComment({ id: "b" })]);
    const reject = jest.spyOn(store, "reject");
    const flush = jest.spyOn(store, "flush");

    await press(rows(wrapper)[1], "th-reject");
    await flushPromises();

    expect(reject).toHaveBeenCalledTimes(1);
    expect(reject).toHaveBeenCalledWith("b");
    expect(flush).not.toHaveBeenCalled();
    expect(statusOf(store, "b")).toBe("rejected");
    expect(statusOf(store, "a")).toBe("awaiting-gm");
    expect(rows(wrapper)).toHaveLength(1);
  });

  it("carries on when the queue cannot be sent", async () => {
    const { wrapper, store } = await open([aPost({ id: "a" })]);
    jest.spyOn(store, "flush").mockRejectedValue(new Error("storage is full"));

    await press(rows(wrapper)[0], "th-approve");
    await flushPromises();

    expect(statusOf(store, "a")).toBe("queued");
    expect(wrapper.find('[data-cy="th-approvals-empty"]').exists()).toBe(true);
  });
});
