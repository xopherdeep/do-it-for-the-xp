import { mount } from "@vue/test-utils";
import TownHallWaiting from "@/app/Console/MyPortal/HomeTown/TownHall/components/TownHallWaiting.vue";
import type { TownHallPost } from "@/lib/services/townhall/townHallTypes";

const post = (over: Partial<TownHallPost> = {}): TownHallPost => ({
  id: "p-1",
  kind: "topic",
  heroId: "hero-1",
  heroName: "Max",
  createdAt: 1_700_000_000_000,
  status: "awaiting-gm",
  board: "feature-requests",
  title: "More dragons",
  body: "Please add more dragons.",
  ...over,
});

const list = (posts: TownHallPost[]) => mount(TownHallWaiting, { props: { posts } });
type Listed = ReturnType<typeof list>;

const cards = (wrapper: Listed) => wrapper.findAll('[data-cy="th-waiting-post"]');
const statusOf = (card: ReturnType<Listed["findAll"]>[number]) => card.find('[data-cy="th-waiting-status"]').text();

describe("TownHallWaiting", () => {
  it("draws nothing when no post waits", () => {
    const wrapper = list([]);

    expect(wrapper.find('[data-cy="th-waiting"]').exists()).toBe(false);
  });

  it("shows each post with its title, its words and what it waits for", () => {
    const wrapper = list([
      post({ id: "a", status: "awaiting-gm" }),
      post({ id: "b", status: "rejected", title: "Cake", body: "Make cake." }),
      post({ id: "c", status: "queued", kind: "comment", title: undefined, board: undefined, postId: 12, body: "Nice news!" }),
      post({ id: "d", status: "failed", error: "Title is required" }),
    ]);

    const found = cards(wrapper);
    expect(found).toHaveLength(4);
    expect(found[0].text()).toContain("More dragons");
    expect(found[0].text()).toContain("Please add more dragons.");
    expect(found.map(statusOf)).toEqual(["Waiting for your Game Master", "Not approved", "Waiting to send", "Couldn't send: Title is required"]);
    expect(found[2].text()).toContain("Nice news!");
  });

  it("names a comment and a bug report when they have no title", () => {
    const wrapper = list([
      post({ id: "c", kind: "comment", title: undefined, board: undefined, postId: 12 }),
      post({ id: "b", kind: "bug", title: undefined, board: undefined }),
    ]);

    expect(cards(wrapper)[0].find('[data-cy="th-waiting-title"]').text()).toBe("Your comment");
    expect(cards(wrapper)[1].find('[data-cy="th-waiting-title"]').text()).toBe("Your bug report");
  });

  it("shows the words as text, never as markup", () => {
    const wrapper = list([post({ title: "<b>Hi</b>", body: "<img src=x onerror=alert(1)>", status: "failed", error: "<i>bad</i>" })]);

    expect(wrapper.find("b").exists()).toBe(false);
    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.find("i").exists()).toBe(false);
    expect(wrapper.text()).toContain("<b>Hi</b>");
  });

  it("offers Dismiss on a post turned down or refused, and Edit only on one that failed", () => {
    const wrapper = list([
      post({ id: "wait", status: "awaiting-gm" }),
      post({ id: "queued", status: "queued" }),
      post({ id: "sending", status: "sending" }),
      post({ id: "no", status: "rejected" }),
      post({ id: "bad", status: "failed", error: "Nope" }),
    ]);

    const [wait, queued, sending, no, bad] = cards(wrapper);
    for (const card of [wait, queued, sending]) {
      expect(card.find('[data-cy="th-dismiss"]').exists()).toBe(false);
      expect(card.find('[data-cy="th-edit"]').exists()).toBe(false);
    }
    expect(no.find('[data-cy="th-dismiss"]').exists()).toBe(true);
    expect(no.find('[data-cy="th-edit"]').exists()).toBe(false);
    expect(bad.find('[data-cy="th-dismiss"]').exists()).toBe(true);
    expect(bad.find('[data-cy="th-edit"]').exists()).toBe(true);
  });

  it("reports Dismiss with the post's id and Edit with the post", async () => {
    const failed = post({ id: "bad", status: "failed", error: "Nope" });
    const wrapper = list([failed]);

    await wrapper.find('[data-cy="th-dismiss"]').trigger("click");
    await wrapper.find('[data-cy="th-edit"]').trigger("click");

    expect(wrapper.emitted("dismiss")).toEqual([["bad"]]);
    expect(wrapper.emitted("edit")).toEqual([[failed]]);
  });
});
