import { mount } from "@vue/test-utils";
import TownHallCompose from "@/app/Console/MyPortal/HomeTown/TownHall/components/TownHallCompose.vue";
import type { BoardInfo } from "@/lib/services/townhall/townHallFeed";
import type { PostDraft } from "@/lib/services/townhall/townHallPosts";

const BOARDS: BoardInfo[] = [
  { id: 3, slug: "feature-requests", name: "Feature Requests", description: "", count: 0 },
  { id: 4, slug: "ideas-suggestions", name: "Ideas &amp; Suggestions", description: "", count: 0 },
  { id: 5, slug: "comments-feedback", name: "Comments", description: "", count: 0 },
  { id: 6, slug: "suggestion-box", name: "Suggestion Box", description: "", count: 0 },
];

type Props = InstanceType<typeof TownHallCompose>["$props"];

// The modal is Ionic's overlay: only what is inside it is the subject here
const compose = (props: Partial<Props> = {}) =>
  mount(TownHallCompose, {
    props: { kind: "comment", boards: BOARDS, ...props } as Props,
    global: { stubs: { IonModal: { template: "<div class='modal-stub'><slot /></div>" } } },
  });
type Composed = ReturnType<typeof compose>;

const cy = (wrapper: Composed, name: string) => wrapper.find(`[data-cy="${name}"]`);
const sendButton = (wrapper: Composed) => cy(wrapper, "th-send");
const isDisabled = (wrapper: Composed) => sendButton(wrapper).attributes("disabled") !== undefined;
const sent = (wrapper: Composed) => (wrapper.emitted("send") ?? []).map((call) => call[0]);

describe("TownHallCompose", () => {
  it("starts a comment with nothing to send: Send waits and the counter reads 0 / 2000", () => {
    const wrapper = compose();

    expect(isDisabled(wrapper)).toBe(true);
    expect(cy(wrapper, "th-count").text()).toBe("0 / 2000");
    expect(cy(wrapper, "th-title").exists()).toBe(false);
    expect(cy(wrapper, "th-problem").exists()).toBe(false);
  });

  it("lets a typed message go, and sends it from the dock at the bottom", async () => {
    const wrapper = compose({ kind: "comment", postId: 12 });

    await cy(wrapper, "th-body").setValue("Great news!");

    expect(isDisabled(wrapper)).toBe(false);
    expect(cy(wrapper, "th-count").text()).toBe("11 / 2000");
    await sendButton(wrapper).trigger("click");
    expect(sent(wrapper)).toEqual([{ kind: "comment", postId: 12, body: "Great news!" }]);
    expect(wrapper.find("ion-footer [data-cy='th-send']").exists()).toBe(true);
  });

  it("sends a topic's trimmed title and message, on the board the hero stands on", async () => {
    const wrapper = compose({ kind: "topic", board: "feature-requests" });

    await cy(wrapper, "th-title").setValue("  More dragons  ");
    await cy(wrapper, "th-body").setValue("  Please  ");
    await sendButton(wrapper).trigger("click");

    expect(sent(wrapper)).toEqual([{ kind: "topic", board: "feature-requests", title: "More dragons", body: "Please" }]);
  });

  it("lets the hero pick another board for a topic, names them as text and marks the one picked", async () => {
    const wrapper = compose({ kind: "topic", board: "feature-requests" });
    const picks = wrapper.findAll("[data-cy^='th-pick-']");

    expect(picks.map((pick) => pick.text())).toEqual(["Feature Requests", "Ideas & Suggestions", "Comments", "Suggestion Box"]);
    expect(cy(wrapper, "th-pick-feature-requests").attributes("aria-checked")).toBe("true");

    await cy(wrapper, "th-pick-suggestion-box").trigger("click");
    await cy(wrapper, "th-title").setValue("A box");
    await cy(wrapper, "th-body").setValue("Please");
    await sendButton(wrapper).trigger("click");

    expect(cy(wrapper, "th-pick-feature-requests").attributes("aria-checked")).toBe("false");
    expect(sent(wrapper)).toEqual([{ kind: "topic", board: "suggestion-box", title: "A box", body: "Please" }]);
  });

  it("starts a topic on the first board when none is given, and still offers the four boards before the site has answered", async () => {
    const wrapper = compose({ kind: "topic", boards: [] });

    expect(wrapper.findAll("[data-cy^='th-pick-']").map((pick) => pick.attributes("data-cy"))).toEqual([
      "th-pick-feature-requests",
      "th-pick-ideas-suggestions",
      "th-pick-comments-feedback",
      "th-pick-suggestion-box",
    ]);
    await cy(wrapper, "th-title").setValue("Hi");
    await cy(wrapper, "th-body").setValue("Hello");
    await sendButton(wrapper).trigger("click");
    expect(sent(wrapper)).toEqual([{ kind: "topic", board: "feature-requests", title: "Hi", body: "Hello" }]);
  });

  it("makes a topic wait for its title, and says so once the hero has started writing", async () => {
    const wrapper = compose({ kind: "topic", board: "feature-requests" });

    expect(cy(wrapper, "th-problem").exists()).toBe(false);
    await cy(wrapper, "th-body").setValue("Please");

    expect(isDisabled(wrapper)).toBe(true);
    expect(cy(wrapper, "th-problem").text()).toBe("Give it a title.");
    await sendButton(wrapper).trigger("click");
    expect(sent(wrapper)).toEqual([]);
  });

  it("reports a bug without a board picker, counts to 4,000 and lets the title be left out", async () => {
    const wrapper = compose({ kind: "bug" });

    expect(cy(wrapper, "th-count").text()).toBe("0 / 4000");
    expect(cy(wrapper, "th-board-picker").exists()).toBe(false);
    expect(cy(wrapper, "th-title").exists()).toBe(true);

    await cy(wrapper, "th-body").setValue("The dragon is stuck.");
    await sendButton(wrapper).trigger("click");

    expect(sent(wrapper)).toEqual([{ kind: "bug", body: "The dragon is stuck." }]);
  });

  it("counts characters, not UTF-16 units: three dragons are 3", async () => {
    const wrapper = compose();

    await cy(wrapper, "th-body").setValue("\u{1F409}\u{1F409}\u{1F409}");

    expect(cy(wrapper, "th-count").text()).toBe("3 / 2000");
  });

  it("holds a message over the limit, shows the problem under the count and flags the count", async () => {
    const wrapper = compose();

    await cy(wrapper, "th-body").setValue("a".repeat(2001));

    expect(isDisabled(wrapper)).toBe(true);
    expect(cy(wrapper, "th-count").text()).toBe("2001 / 2000");
    expect(cy(wrapper, "th-count").classes()).toContain("is-over");
    expect(cy(wrapper, "th-problem").text()).toBe("Keep it under 2,000 characters.");
  });

  it("does not count a trailing space against the limit", async () => {
    const wrapper = compose();

    await cy(wrapper, "th-body").setValue(`${"a".repeat(2000)}  \n`);

    expect(cy(wrapper, "th-count").text()).toBe("2000 / 2000");
    expect(isDisabled(wrapper)).toBe(false);
    await sendButton(wrapper).trigger("click");
    expect((sent(wrapper)[0] as PostDraft).body).toBe("a".repeat(2000));
  });

  it("holds a title over 100 characters", async () => {
    const wrapper = compose({ kind: "topic", board: "feature-requests" });

    await cy(wrapper, "th-title").setValue("d".repeat(101));
    await cy(wrapper, "th-body").setValue("Please");

    expect(isDisabled(wrapper)).toBe(true);
    expect(cy(wrapper, "th-problem").text()).toBe("Keep the title under 100 characters.");
  });

  it("names the post a comment answers, as text", () => {
    const wrapper = compose({ kind: "comment", postId: 12, replyingTo: "<b>Big</b> news" });

    expect(cy(wrapper, "th-replying-to").text()).toContain("<b>Big</b> news");
    expect(cy(wrapper, "th-replying-to").find("b").exists()).toBe(false);
  });

  it("starts from a failed post's words when the hero edits it", () => {
    const initial: PostDraft = { kind: "topic", board: "ideas-suggestions", title: "Dragons", body: "More, please." };
    const wrapper = compose({ kind: "topic", board: "ideas-suggestions", initial });

    expect((cy(wrapper, "th-title").element as HTMLInputElement).value).toBe("Dragons");
    expect((cy(wrapper, "th-body").element as HTMLTextAreaElement).value).toBe("More, please.");
    expect(cy(wrapper, "th-pick-ideas-suggestions").attributes("aria-checked")).toBe("true");
    expect(cy(wrapper, "th-count").text()).toBe("13 / 2000");
    expect(isDisabled(wrapper)).toBe(false);
  });

  it("keeps the comment's post when a failed comment is edited", async () => {
    const initial: PostDraft = { kind: "comment", postId: 12, body: "Nice." };
    const wrapper = compose({ kind: "comment", initial });

    await cy(wrapper, "th-body").setValue("Very nice.");
    await sendButton(wrapper).trigger("click");

    expect(sent(wrapper)).toEqual([{ kind: "comment", postId: 12, body: "Very nice." }]);
  });

  it("holds Send, and says it is sending, while the page keeps the post", async () => {
    const wrapper = compose({ sending: true });
    await cy(wrapper, "th-body").setValue("Great news!");

    expect(isDisabled(wrapper)).toBe(true);
    expect(sendButton(wrapper).text()).toBe("Sending...");
    await sendButton(wrapper).trigger("click");
    expect(sent(wrapper)).toEqual([]);
  });

  it("shows what the page could not do under the message", () => {
    const wrapper = compose({ trouble: "That didn't save. Try again." });

    expect(cy(wrapper, "th-problem").text()).toBe("That didn't save. Try again.");
  });

  it("closes from the header and when the modal is dismissed", async () => {
    const wrapper = compose();

    await cy(wrapper, "th-compose-close").trigger("click");

    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("starts clean each time it opens", async () => {
    const wrapper = compose({ isOpen: true });
    await cy(wrapper, "th-body").setValue("Half a thought");
    await wrapper.setProps({ isOpen: false });
    await wrapper.setProps({ isOpen: true });

    expect((cy(wrapper, "th-body").element as HTMLTextAreaElement).value).toBe("");
    expect(cy(wrapper, "th-count").text()).toBe("0 / 2000");
  });
});

describe("news and edits", () => {
  it("writes news with a title, 8,000 characters, and two sends: Draft and Publish", async () => {
    const wrapper = compose({ kind: "news" });
    expect(wrapper.find("ion-title").text()).toBe("Write news");
    expect(cy(wrapper, "th-count").text()).toBe("0 / 8000");
    expect(cy(wrapper, "th-board-picker").exists()).toBe(false);
    expect(cy(wrapper, "th-pick-news").exists()).toBe(false);
    await cy(wrapper, "th-title").setValue(" Harvest ");
    await cy(wrapper, "th-body").setValue("Bring chores.");
    await cy(wrapper, "th-save-draft").trigger("click");
    await sendButton(wrapper).trigger("click");
    expect(sent(wrapper)).toEqual([
      { kind: "news", title: "Harvest", body: "Bring chores.", category: "news", status: "draft" },
      { kind: "news", title: "Harvest", body: "Bring chores.", category: "news", status: "publish" },
    ]);
    expect(sendButton(wrapper).text()).toContain("Publish");
  });
  it("offers Patch Notes only when the site has them, and starts on the category it was opened for", async () => {
    const wrapper = compose({ kind: "news", patchNotesAvailable: true, newsCategory: "patch-notes" });
    expect(cy(wrapper, "th-pick-patch-notes").attributes("aria-checked")).toBe("true");
    await cy(wrapper, "th-pick-news").trigger("click");
    await cy(wrapper, "th-title").setValue("T");
    await cy(wrapper, "th-body").setValue("B");
    await sendButton(wrapper).trigger("click");
    expect(sent(wrapper)[0]).toMatchObject({ category: "news" });
  });
  it("wants a title for news before it lets anything go", async () => {
    const wrapper = compose({ kind: "news" });
    await cy(wrapper, "th-body").setValue("B");
    expect(isDisabled(wrapper)).toBe(true);
    expect(cy(wrapper, "th-problem").text()).toBe("Give it a title.");
  });
  it("edits the words it was given, with one Save and no picker", async () => {
    const wrapper = compose({ kind: "edit", initial: { title: "Old", body: "Words" } });
    expect(wrapper.find("ion-title").text()).toBe("Edit");
    expect(cy(wrapper, "th-board-picker").exists()).toBe(false);
    expect(cy(wrapper, "th-save-draft").exists()).toBe(false);
    expect(sendButton(wrapper).text()).toContain("Save");
    await cy(wrapper, "th-title").setValue("New");
    await sendButton(wrapper).trigger("click");
    expect(sent(wrapper)).toEqual([{ kind: "edit", title: "New", body: "Words" }]);
  });
});
