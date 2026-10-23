import { flushPromises, mount } from "@vue/test-utils";
import TownHallNews from "@/app/Console/MyPortal/HomeTown/TownHall/components/TownHallNews.vue";
import type { DeskActions } from "@/app/Console/MyPortal/HomeTown/TownHall/components/useTownHallDesk";
import { fetchComments, fetchDrafts, fetchNews, type HeldComment, type NewsItem } from "@/lib/services/townhall/townHallFeed";

jest.mock("@/lib/utils/debug", () => ({
  __esModule: true,
  default: { error: jest.fn(), log: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

jest.mock("@/lib/services/townhall/townHallFeed", () => ({
  __esModule: true,
  fetchNews: jest.fn(),
  fetchDrafts: jest.fn(),
  fetchComments: jest.fn(),
}));

const newsMock = fetchNews as jest.Mock;
const draftsMock = fetchDrafts as jest.Mock;
const commentsMock = fetchComments as jest.Mock;

const post = (id: number, over: Partial<NewsItem> = {}): NewsItem => ({
  id,
  date: "2026-10-20T09:30:00",
  title: `Post ${id}`,
  excerpt: `<p>Words of ${id}</p>`,
  content: "",
  link: `https://forthexp.com/?p=${id}`,
  categories: [],
  ...over,
});

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

type Props = InstanceType<typeof TownHallNews>["$props"];

const mountNews = async (props: Partial<Props> = {}) => {
  const wrapper = mount(TownHallNews, { props });
  await flushPromises();
  return wrapper;
};
type Mounted = Awaited<ReturnType<typeof mountNews>>;

const cy = (wrapper: Mounted, name: string) => wrapper.find(`[data-cy="${name}"]`);
const cards = (wrapper: Mounted) => wrapper.findAll(".th-post");
const published = (wrapper: Mounted) => wrapper.findAll('[data-cy="th-post"]');
// Ionic's button wrapper hands "disabled" to the element as a property, not an attribute
const isDisabled = (button: ReturnType<Mounted["find"]>) => (button.element as HTMLButtonElement).disabled === true;

beforeEach(() => {
  jest.clearAllMocks();
  newsMock.mockResolvedValue({ items: [post(101), post(102)], totalPages: 1 });
  draftsMock.mockResolvedValue([]);
  commentsMock.mockResolvedValue([]);
});

describe("TownHallNews", () => {
  it("shows no tools to a hero", async () => {
    const wrapper = await mountNews({ desk: fakeDesk(), heldComments: [held()] });

    expect(published(wrapper)).toHaveLength(2);
    expect(cy(wrapper, "th-draft").exists()).toBe(false);
    expect(cy(wrapper, "th-edit").exists()).toBe(false);
    expect(cy(wrapper, "th-bin").exists()).toBe(false);
    expect(cy(wrapper, "th-held").exists()).toBe(false);
    expect(cy(wrapper, "th-comments-toggle").text()).toBe("Comments");
    expect(draftsMock).not.toHaveBeenCalled();
  });

  it("shows drafts first with Publish, Edit and Bin to a publishing link, and publishing one reloads the news", async () => {
    const desk = fakeDesk();
    draftsMock.mockResolvedValueOnce([post(201, { title: "Coming soon" })]);
    const wrapper = await mountNews({ canPublish: true, desk });

    const draft = cy(wrapper, "th-draft");
    expect(cards(wrapper)[0].attributes("data-cy")).toBe("th-draft");
    expect(draft.classes()).toEqual(expect.arrayContaining(["th-post", "is-draft"]));
    expect(draft.text()).toContain("Coming soon");
    expect(draft.find('[data-cy="th-chip"]').text()).toBe("Draft");
    expect(draft.find('[data-cy="th-publish"]').text()).toBe("Publish");
    expect(draft.find('[data-cy="th-edit"]').text()).toBe("Edit");
    expect(draft.find('[data-cy="th-bin"]').text()).toBe("Bin");
    expect(draft.find('[data-cy="th-comments-toggle"]').exists()).toBe(false);
    expect(published(wrapper)).toHaveLength(2);
    expect(draftsMock).toHaveBeenCalledWith("news");

    await draft.find('[data-cy="th-edit"]').trigger("click");
    expect(wrapper.emitted("edit")).toEqual([[{ type: "post", id: 201 }]]);

    await draft.find('[data-cy="th-publish"]').trigger("click");
    await flushPromises();

    expect(desk.publish).toHaveBeenCalledWith("post", 201);
    expect(newsMock).toHaveBeenCalledTimes(2);
    expect(draftsMock).toHaveBeenCalledTimes(2);
    expect(cy(wrapper, "th-draft").exists()).toBe(false);
    expect(published(wrapper)).toHaveLength(2);
  });

  it("leaves a draft where it is when the desk could not publish it", async () => {
    const desk = fakeDesk({ publish: jest.fn().mockResolvedValue(false) });
    draftsMock.mockResolvedValue([post(201)]);
    const wrapper = await mountNews({ canPublish: true, desk });

    await cy(wrapper, "th-publish").trigger("click");
    await flushPromises();

    expect(desk.publish).toHaveBeenCalledWith("post", 201);
    expect(newsMock).toHaveBeenCalledTimes(1);
    expect(draftsMock).toHaveBeenCalledTimes(1);
    expect(cy(wrapper, "th-draft").exists()).toBe(true);
  });

  it("bins a draft through the desk and the card goes only when the desk says it did", async () => {
    const bin = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const desk = fakeDesk({ bin });
    draftsMock.mockResolvedValue([post(201)]);
    const wrapper = await mountNews({ canPublish: true, desk });

    await cy(wrapper, "th-draft").find('[data-cy="th-bin"]').trigger("click");
    await flushPromises();
    expect(bin).toHaveBeenLastCalledWith("post", 201, false);
    expect(cy(wrapper, "th-draft").exists()).toBe(true);

    await cy(wrapper, "th-draft").find('[data-cy="th-bin"]').trigger("click");
    await flushPromises();
    expect(bin).toHaveBeenCalledTimes(2);
    expect(cy(wrapper, "th-draft").exists()).toBe(false);
    expect(published(wrapper)).toHaveLength(2);
  });

  it("a bin on a published post asks the desk with published true and the card goes on true", async () => {
    const bin = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const desk = fakeDesk({ bin });
    const wrapper = await mountNews({ canPublish: true, desk });
    expect(published(wrapper).every((card) => card.find('[data-cy="th-edit"]').exists())).toBe(true);

    await published(wrapper)[0].find('[data-cy="th-bin"]').trigger("click");
    await flushPromises();
    expect(bin).toHaveBeenLastCalledWith("post", 101, true);
    expect(published(wrapper)).toHaveLength(2);

    await published(wrapper)[0].find('[data-cy="th-bin"]').trigger("click");
    await flushPromises();
    expect(bin).toHaveBeenLastCalledWith("post", 101, true);
    expect(published(wrapper)).toHaveLength(1);
    expect(published(wrapper)[0].text()).toContain("Post 102");

    await published(wrapper)[0].find('[data-cy="th-edit"]').trigger("click");
    expect(wrapper.emitted("edit")).toEqual([[{ type: "post", id: 102 }]]);
  });

  it("counts and lists the held comments under their post for a moderator", async () => {
    const wrapper = await mountNews({ canModerate: true, desk: fakeDesk(), heldComments: [held({ postId: 101 })] });

    const [first, second] = published(wrapper);
    expect(first.find('[data-cy="th-comments-toggle"]').text()).toContain("(1 held)");
    expect(first.find('[data-cy="th-held-comment"]').exists()).toBe(true);
    expect(first.find('[data-cy="th-held-comment"]').text()).toContain("Great news!");
    expect(first.find('[data-cy="th-comments"]').exists()).toBe(false);
    expect(second.find('[data-cy="th-comments-toggle"]').text()).toBe("Comments");
    expect(second.find('[data-cy="th-held"]').exists()).toBe(false);
    expect(draftsMock).not.toHaveBeenCalled();
  });

  it("waits while the desk works on a post and shows what went wrong under its actions", async () => {
    const desk = fakeDesk({
      isBusy: jest.fn((type: string, id: number) => type === "post" && id === 101),
      troubleOf: jest.fn((type: string, id: number) => (type === "post" && id === 101 ? "The site said no." : null)),
    });
    const wrapper = await mountNews({ canPublish: true, desk });

    const [busy, idle] = published(wrapper);
    expect(isDisabled(busy.find('[data-cy="th-edit"]'))).toBe(true);
    expect(isDisabled(busy.find('[data-cy="th-bin"]'))).toBe(true);
    expect(busy.find('[data-cy="th-trouble"]').text()).toBe("The site said no.");
    expect(isDisabled(idle.find('[data-cy="th-edit"]'))).toBe(false);
    expect(isDisabled(idle.find('[data-cy="th-bin"]'))).toBe(false);
    expect(idle.find('[data-cy="th-trouble"]').exists()).toBe(false);
  });

  it("reads the drafts when the link's powers arrive after the tab mounted", async () => {
    newsMock.mockResolvedValue({ items: [post(101)], totalPages: 1 });
    draftsMock.mockResolvedValue([post(201, { title: "Coming soon" })]);
    const wrapper = await mountNews({ canPublish: false, desk: fakeDesk() });

    expect(draftsMock).not.toHaveBeenCalled();
    expect(cy(wrapper, "th-draft").exists()).toBe(false);

    await wrapper.setProps({ canPublish: true });
    await flushPromises();

    expect(draftsMock).toHaveBeenCalledTimes(1);
    expect(cy(wrapper, "th-draft").text()).toContain("Coming soon");
    expect(published(wrapper)).toHaveLength(1);

    await wrapper.setProps({ canPublish: false });
    await flushPromises();

    expect(draftsMock).toHaveBeenCalledTimes(1);
    expect(cy(wrapper, "th-publish").exists()).toBe(false);
  });

  it("keeps the news when the drafts cannot be read", async () => {
    draftsMock.mockRejectedValue(new Error("no drafts for you"));
    const wrapper = await mountNews({ canPublish: true, desk: fakeDesk() });

    expect(cy(wrapper, "th-draft").exists()).toBe(false);
    expect(cy(wrapper, "th-late").exists()).toBe(false);
    expect(published(wrapper)).toHaveLength(2);
  });
});
