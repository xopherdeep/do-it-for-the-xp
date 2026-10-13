import {
  approvePost,
  editPost,
  newPost,
  recover,
  rejectPost,
  sendable,
  settle,
  startSending,
  waitingFor,
} from "@/lib/services/townhall/townHallOutbox";
import type { PostDraft } from "@/lib/services/townhall/townHallPosts";
import type { TownHallPost } from "@/lib/services/townhall/townHallTypes";

const HERO = { id: "hero-1", name: "Max" };
const NOW = 1_700_000_000_000;

const topicDraft = (over: Partial<PostDraft> = {}): PostDraft => ({
  kind: "topic",
  board: "feature-requests",
  title: "More dragons",
  body: "Please add more dragons.",
  ...over,
});

const post = (over: Partial<TownHallPost> = {}): TownHallPost => ({
  id: "p-1",
  kind: "topic",
  heroId: "hero-1",
  heroName: "Max",
  createdAt: NOW,
  status: "queued",
  board: "feature-requests",
  title: "More dragons",
  body: "Please add more dragons.",
  ...over,
});

describe("newPost", () => {
  it("makes a hero's topic wait for the Game Master", () => {
    expect(newPost(topicDraft(), HERO, false, NOW, "p-1")).toEqual({
      id: "p-1",
      kind: "topic",
      heroId: "hero-1",
      heroName: "Max",
      createdAt: NOW,
      status: "awaiting-gm",
      board: "feature-requests",
      title: "More dragons",
      body: "Please add more dragons.",
    });
  });

  it("queues a hero's bug report at once, with what it says about the device", () => {
    const bug = { route: "/battle", environment: "App: 1.0" };
    const made = newPost({ kind: "bug", body: "The dragon is stuck." }, HERO, false, NOW, "b-1", bug);
    expect(made.status).toBe("queued");
    expect(made.kind).toBe("bug");
    expect(made.bug).toEqual(bug);
  });

  it("queues a Game Master's comment at once", () => {
    const made = newPost({ kind: "comment", postId: 42, body: "Great idea." }, HERO, true, NOW, "c-1");
    expect(made.status).toBe("queued");
    expect(made.postId).toBe(42);
    expect(made.title).toBeUndefined();
  });

  it("makes a hero's comment wait for the Game Master", () => {
    expect(newPost({ kind: "comment", postId: 42, body: "Great idea." }, HERO, false, NOW, "c-1").status).toBe(
      "awaiting-gm",
    );
  });

  it("takes the id and the time it is given and keeps no empty fields", () => {
    const made = newPost(topicDraft(), HERO, true, 5, "fixed-id");
    expect(made.id).toBe("fixed-id");
    expect(made.createdAt).toBe(5);
    expect(Object.keys(made)).not.toContain("postId");
    expect(Object.keys(made)).not.toContain("bug");
    expect(Object.keys(made)).not.toContain("error");
  });
});

describe("approvePost and rejectPost", () => {
  it("approve moves an awaiting post to the queue", () => {
    const waiting = post({ status: "awaiting-gm" });
    const approved = approvePost(waiting);
    expect(approved.status).toBe("queued");
    expect(waiting.status).toBe("awaiting-gm");
  });

  it("reject moves an awaiting post to rejected", () => {
    const waiting = post({ status: "awaiting-gm" });
    expect(rejectPost(waiting).status).toBe("rejected");
    expect(waiting.status).toBe("awaiting-gm");
  });

  it("leave a queued post unchanged", () => {
    const queued = post({ status: "queued" });
    expect(approvePost(queued)).toEqual(queued);
    expect(rejectPost(queued)).toEqual(queued);
  });

  it("leave a sent post unchanged", () => {
    const sent = post({ status: "sent", remoteId: 9 });
    expect(approvePost(sent)).toEqual(sent);
    expect(rejectPost(sent)).toEqual(sent);
  });
});

describe("startSending", () => {
  it("moves a queued post to sending", () => {
    const queued = post({ status: "queued" });
    expect(startSending(queued).status).toBe("sending");
    expect(queued.status).toBe("queued");
  });

  it("leaves a post that is not queued unchanged", () => {
    for (const status of ["awaiting-gm", "sending", "sent", "rejected", "failed"] as const) {
      const other = post({ status });
      expect(startSending(other)).toEqual(other);
    }
  });
});

describe("settle", () => {
  const sending = post({ status: "sending", error: "offline" });

  it("marks a sent post with the site's id and clears the error", () => {
    const { post: settled, unlink } = settle(sending, { ok: true, remoteId: 77 });
    expect(settled.status).toBe("sent");
    expect(settled.remoteId).toBe(77);
    expect(settled.error).toBeUndefined();
    expect(unlink).toBe(false);
  });

  it("puts the post back in the queue when the device is offline", () => {
    const { post: settled, unlink } = settle(sending, { ok: false, code: "offline" });
    expect(settled.status).toBe("queued");
    expect(settled.error).toBe("offline");
    expect(unlink).toBe(false);
  });

  it("puts the post back in the queue when the site has a server error", () => {
    const { post: settled, unlink } = settle(sending, { ok: false, code: "server" });
    expect(settled.status).toBe("queued");
    expect(settled.error).toBe("server");
    expect(unlink).toBe(false);
  });

  it("keeps a bug queued when Bug Net is not active yet (the 404 arrives as server)", () => {
    const bug = post({ kind: "bug", status: "sending", bug: { route: "/", environment: "App: 1.0" } });
    const { post: settled, unlink } = settle(bug, { ok: false, code: "server", message: "No route was found" });
    expect(settled.status).toBe("queued");
    expect(settled.error).toBe("server");
    expect(unlink).toBe(false);
  });

  it("queues the post and asks to unlink when the site no longer knows the link", () => {
    const { post: settled, unlink } = settle(sending, { ok: false, code: "unauthorized" });
    expect(settled.status).toBe("queued");
    expect(settled.error).toBe("unauthorized");
    expect(unlink).toBe(true);
  });

  it("queues the post with the code when the account may not post", () => {
    const { post: settled, unlink } = settle(sending, { ok: false, code: "forbidden" });
    expect(settled.status).toBe("queued");
    expect(settled.error).toBe("forbidden");
    expect(unlink).toBe(false);
  });

  it("fails the post with the site's words when it is invalid", () => {
    const { post: settled, unlink } = settle(sending, { ok: false, code: "invalid", message: "Title is required" });
    expect(settled.status).toBe("failed");
    expect(settled.error).toBe("Title is required");
    expect(unlink).toBe(false);
  });

  it("fails an invalid post with the code when the site gave no words", () => {
    expect(settle(sending, { ok: false, code: "invalid" }).post.error).toBe("invalid");
  });

  it("leaves a sent post alone when a second send comes back with an error", () => {
    const sent = post({ status: "sent", remoteId: 77 });
    expect(settle(sent, { ok: false, code: "offline" })).toEqual({ post: sent, unlink: false });
    expect(settle(sent, { ok: false, code: "server" })).toEqual({ post: sent, unlink: false });
    expect(settle(sent, { ok: false, code: "invalid", message: "Title is required" })).toEqual({
      post: sent,
      unlink: false,
    });
  });

  it("leaves a post that is not sending alone when a stray ok arrives", () => {
    for (const status of ["queued", "awaiting-gm", "rejected", "failed", "sent"] as const) {
      const other = post({ status });
      expect(settle(other, { ok: true, remoteId: 5 })).toEqual({ post: other, unlink: false });
    }
  });

  it("does not ask to unlink for a stray unauthorized on a post that is not sending", () => {
    for (const status of ["queued", "awaiting-gm", "rejected", "failed", "sent"] as const) {
      const other = post({ status });
      expect(settle(other, { ok: false, code: "unauthorized" })).toEqual({ post: other, unlink: false });
    }
  });

  it("does not change the post it was given", () => {
    const before = { ...sending };
    settle(sending, { ok: true, remoteId: 1 });
    settle(sending, { ok: false, code: "invalid", message: "No" });
    expect(sending).toEqual(before);
  });
});

describe("recover", () => {
  it("turns a post left sending into a queued post again", () => {
    const posts = [
      post({ id: "a", status: "sending" }),
      post({ id: "b", status: "sent", remoteId: 3 }),
      post({ id: "c", status: "queued" }),
      post({ id: "d", status: "failed", error: "Title is required" }),
    ];
    const recovered = recover(posts);
    expect(recovered.map((p) => p.status)).toEqual(["queued", "sent", "queued", "failed"]);
    expect(posts[0].status).toBe("sending");
  });
});

describe("sendable", () => {
  it("lists the queued posts, oldest first", () => {
    const posts = [
      post({ id: "new", status: "queued", createdAt: 300 }),
      post({ id: "sent", status: "sent", createdAt: 50 }),
      post({ id: "old", status: "queued", createdAt: 100 }),
      post({ id: "waiting", status: "awaiting-gm", createdAt: 10 }),
      post({ id: "mid", status: "queued", createdAt: 200 }),
      post({ id: "busy", status: "sending", createdAt: 20 }),
    ];
    expect(sendable(posts).map((p) => p.id)).toEqual(["old", "mid", "new"]);
    expect(posts[0].id).toBe("new");
  });
});

describe("waitingFor", () => {
  it("lists a hero's posts that are not sent yet, newest first", () => {
    const posts = [
      post({ id: "old", status: "awaiting-gm", createdAt: 100 }),
      post({ id: "done", status: "sent", createdAt: 150, remoteId: 1 }),
      post({ id: "other", heroId: "hero-2", status: "queued", createdAt: 175 }),
      post({ id: "new", status: "queued", createdAt: 300 }),
      post({ id: "no", status: "rejected", createdAt: 200 }),
      post({ id: "bad", status: "failed", createdAt: 250, error: "Title is required" }),
    ];
    expect(waitingFor(posts, "hero-1").map((p) => p.id)).toEqual(["new", "bad", "no", "old"]);
    expect(posts[0].id).toBe("old");
  });
});

describe("editPost", () => {
  const failed = post({ status: "failed", error: "Title is required", title: "", remoteId: undefined });
  const fixed = topicDraft({ title: "Dragons, please", body: "More dragons, please." });

  it("sends a hero's fixed post back to the Game Master", () => {
    const edited = editPost(failed, fixed, false);
    expect(edited.status).toBe("awaiting-gm");
    expect(edited.title).toBe("Dragons, please");
    expect(edited.body).toBe("More dragons, please.");
    expect(edited.error).toBeUndefined();
    expect(edited.id).toBe("p-1");
    expect(edited.createdAt).toBe(NOW);
  });

  it("queues a Game Master's fixed post at once", () => {
    const edited = editPost(failed, fixed, true);
    expect(edited.status).toBe("queued");
    expect(edited.error).toBeUndefined();
  });

  it("queues a hero's fixed bug report at once, as a new bug is", () => {
    const bug = post({ kind: "bug", status: "failed", error: "Content is required", bug: { route: "/", environment: "x" } });
    const edited = editPost(bug, { kind: "bug", body: "The dragon is stuck." }, false);
    expect(edited.status).toBe("queued");
    expect(edited.bug).toEqual({ route: "/", environment: "x" });
  });

  it("takes the board and the post it answers from the draft", () => {
    const comment = post({ kind: "comment", status: "failed", error: "No", postId: 1, board: undefined, title: undefined });
    expect(editPost(comment, { kind: "comment", postId: 2, body: "New words" }, true).postId).toBe(2);
    expect(editPost(failed, topicDraft({ board: "suggestion-box" }), true).board).toBe("suggestion-box");
  });

  it("leaves a post that did not fail unchanged", () => {
    const queued = post({ status: "queued" });
    expect(editPost(queued, fixed, true)).toEqual(queued);
  });

  it("does not change the post it was given", () => {
    const before = { ...failed };
    editPost(failed, fixed, true);
    expect(failed).toEqual(before);
  });
});
