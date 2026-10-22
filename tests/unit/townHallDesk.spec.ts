import {
  approveCommentRequest,
  createNewsRequest,
  isOpenBug,
  powersOf,
  publishRequest,
  resolveBugRequest,
  saveRequest,
  trashRequest,
  waitingTotal,
  wordsProblem,
} from "@/lib/services/townhall/townHallDesk";
import type { NewsDraft } from "@/lib/services/townhall/townHallDesk";

describe("powersOf", () => {
  it("gives an administrator both powers", () => {
    const me = { capabilities: { publish_posts: true, edit_others_posts: true, moderate_comments: true } };
    expect(powersOf(me, 5)).toEqual({ publish: true, moderate: true, readAt: 5 });
  });
  it("gives an author neither: publish needs edit_others_posts too", () => {
    expect(powersOf({ capabilities: { publish_posts: true } }, 5)).toEqual({ publish: false, moderate: false, readAt: 5 });
  });
  it("gives a contributor, an answer without capabilities, a null and a string nothing", () => {
    for (const me of [{ capabilities: { edit_posts: true } }, { name: "Mom" }, { capabilities: null }, null, "no"]) {
      expect(powersOf(me, 5)).toEqual({ publish: false, moderate: false, readAt: 5 });
    }
  });
});
describe("requests", () => {
  it("publishes a draft and a topic", () => {
    expect(publishRequest("post", 7)).toEqual({ path: "wp/v2/posts/7", method: "POST", body: { status: "publish" } });
    expect(publishRequest("topic", 8)).toEqual({ path: "wp/v2/cafeteria_topic/8", method: "POST", body: { status: "publish" } });
  });
  it("bins to the trash, never with force", () => {
    expect(trashRequest("comment", 3)).toEqual({ path: "wp/v2/comments/3", method: "DELETE" });
    expect(trashRequest("bug", 4)).toEqual({ path: "wp/v2/compass_bug/4", method: "DELETE" });
  });
  it("saves words, approves a comment, resolves a bug", () => {
    expect(saveRequest("topic", 8, { title: "T", body: "B" })).toEqual({ path: "wp/v2/cafeteria_topic/8", method: "POST", body: { title: "T", content: "B" } });
    expect(approveCommentRequest(3)).toEqual({ path: "wp/v2/comments/3", method: "POST", body: { status: "approved" } });
    expect(resolveBugRequest(4)).toEqual({ path: "wp/v2/compass_bug/4", method: "POST", body: { bug_status: "resolved" } });
  });
  it("creates news published or as a draft, in the Patch Notes category when picked", () => {
    const draft: NewsDraft = { kind: "news", title: "0.4.0", body: "Doors.", category: "patch-notes", status: "draft" };
    expect(createNewsRequest(draft, 7)).toEqual({ path: "wp/v2/posts", method: "POST", body: { title: "0.4.0", content: "Doors.", status: "draft", categories: [7] } });
    expect(createNewsRequest({ ...draft, category: "news", status: "publish" }, 7).body).toEqual({ title: "0.4.0", content: "Doors.", status: "publish" });
    expect(() => createNewsRequest(draft, null)).toThrow("The site has no Patch Notes category yet.");
  });
});
describe("wordsProblem", () => {
  it("wants a title, then a title under 100, then words, then words under 8,000", () => {
    expect(wordsProblem({ title: " ", body: "x" })).toBe("Give it a title.");
    expect(wordsProblem({ title: "a".repeat(101), body: "x" })).toBe("Keep the title under 100 characters.");
    expect(wordsProblem({ title: "T", body: " " })).toBe("Write something first.");
    expect(wordsProblem({ title: "T", body: "x".repeat(8001) })).toBe("Keep it under 8,000 characters.");
    expect(wordsProblem({ title: "T", body: "🐉".repeat(8000) })).toBeNull();
  });
});
describe("waitingTotal and isOpenBug", () => {
  it("adds what it knows and treats an unknown count as nothing", () => {
    expect(waitingTotal({ drafts: 2, topics: null, held: 3, bugs: 1 })).toBe(6);
    expect(waitingTotal({ drafts: null, topics: null, held: null, bugs: null })).toBe(0);
  });
  it("keeps a bug open until it is resolved or closed", () => {
    expect(["new", "", "in-progress"].map(isOpenBug)).toEqual([true, true, true]);
    expect(["resolved", "closed"].map(isOpenBug)).toEqual([false, false]);
  });
});
