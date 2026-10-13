import {
  BODY_MAX,
  BUG_BODY_MAX,
  bugEnvironment,
  charCount,
  draftProblem,
  requestFor,
  signature,
  signingName,
  TITLE_MAX,
} from "@/lib/services/townhall/townHallPosts";
import type { PostDraft } from "@/lib/services/townhall/townHallPosts";
import type { TownHallPost } from "@/lib/services/townhall/townHallTypes";

const DRAGON = "🐉";
const SIGNED = "\n\n— Max, from Do It For The XP";

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
  createdAt: 1_700_000_000_000,
  status: "queued",
  board: "feature-requests",
  title: "More dragons",
  body: "Please add more dragons.",
  ...over,
});

describe("the limits", () => {
  it("pins the numbers", () => {
    expect(TITLE_MAX).toBe(100);
    expect(BODY_MAX).toBe(2000);
    expect(BUG_BODY_MAX).toBe(4000);
  });
});

describe("charCount", () => {
  it("counts characters, not UTF-16 units", () => {
    expect(charCount("🐉🐉")).toBe(2);
    expect("🐉🐉".length).toBe(4);
  });

  it("counts plain and accented text one for one", () => {
    expect(charCount("")).toBe(0);
    expect(charCount("josé")).toBe(4);
  });
});

describe("draftProblem", () => {
  it("accepts a good topic, comment and bug", () => {
    expect(draftProblem(topicDraft())).toBeNull();
    expect(draftProblem({ kind: "comment", postId: 12, body: "Nice one!" })).toBeNull();
    expect(draftProblem({ kind: "bug", body: "The map froze." })).toBeNull();
  });

  it("asks a topic without a board to pick one", () => {
    expect(draftProblem(topicDraft({ board: undefined }))).toBe("Pick a board.");
  });

  it("checks the board before the title", () => {
    expect(draftProblem(topicDraft({ board: undefined, title: "" }))).toBe("Pick a board.");
  });

  it("asks a topic without a title to give it one", () => {
    expect(draftProblem(topicDraft({ title: undefined }))).toBe("Give it a title.");
    expect(draftProblem(topicDraft({ title: "" }))).toBe("Give it a title.");
    expect(draftProblem(topicDraft({ title: "   " }))).toBe("Give it a title.");
  });

  it("checks the title before the body", () => {
    expect(draftProblem(topicDraft({ title: "", body: "" }))).toBe("Give it a title.");
  });

  it("allows a title of 100 dragons and refuses 101", () => {
    expect(draftProblem(topicDraft({ title: DRAGON.repeat(100) }))).toBeNull();
    expect(draftProblem(topicDraft({ title: DRAGON.repeat(101) }))).toBe("Keep the title under 100 characters.");
  });

  it("checks the title length before the body", () => {
    expect(draftProblem(topicDraft({ title: "x".repeat(101), body: "" }))).toBe("Keep the title under 100 characters.");
  });

  it("limits a bug's title too", () => {
    expect(draftProblem({ kind: "bug", title: "x".repeat(101), body: "Oops" })).toBe("Keep the title under 100 characters.");
  });

  it("does not ask a bug or a comment for a title or a board", () => {
    expect(draftProblem({ kind: "bug", body: "Oops" })).toBeNull();
    expect(draftProblem({ kind: "comment", postId: 4, body: "Oops" })).toBeNull();
  });

  it("asks for something to be written when the body is empty after trimming", () => {
    expect(draftProblem(topicDraft({ body: "" }))).toBe("Write something first.");
    expect(draftProblem(topicDraft({ body: " \n\t " }))).toBe("Write something first.");
    expect(draftProblem({ kind: "comment", postId: 4, body: "  " })).toBe("Write something first.");
    expect(draftProblem({ kind: "bug", body: "" })).toBe("Write something first.");
  });

  it("limits a topic and a comment to 2,000 characters", () => {
    expect(draftProblem(topicDraft({ body: "x".repeat(2000) }))).toBeNull();
    expect(draftProblem(topicDraft({ body: "x".repeat(2001) }))).toBe("Keep it under 2,000 characters.");
    expect(draftProblem({ kind: "comment", postId: 4, body: "x".repeat(2000) })).toBeNull();
    expect(draftProblem({ kind: "comment", postId: 4, body: "x".repeat(2001) })).toBe("Keep it under 2,000 characters.");
  });

  it("limits a bug to 4,000 characters", () => {
    expect(draftProblem({ kind: "bug", body: "x".repeat(4000) })).toBeNull();
    expect(draftProblem({ kind: "bug", body: "x".repeat(4001) })).toBe("Keep it under 4,000 characters.");
  });

  it("counts the body in characters, so 2,000 dragons fit and 2,001 do not", () => {
    expect(draftProblem(topicDraft({ body: DRAGON.repeat(2000) }))).toBeNull();
    expect(draftProblem(topicDraft({ body: DRAGON.repeat(2001) }))).toBe("Keep it under 2,000 characters.");
  });

  it("applies the limit to the body without the signature", () => {
    const full = "x".repeat(2000);
    expect(draftProblem(topicDraft({ body: full }))).toBeNull();
    expect(charCount(full + signature("Max"))).toBeGreaterThan(BODY_MAX);
  });
});

describe("signature", () => {
  it("names the hero after an em dash", () => {
    expect(signature("Max")).toBe(SIGNED);
    expect(signature("Max")).toContain("—");
    expect(signature("Max")).not.toContain("–");
  });
});

describe("signingName (no real names on a public site)", () => {
  it("signs with a nickname the hero chose, trimmed", () => {
    expect(signingName({ first: "Ronan", nick: "Moanin Ronan" })).toBe("Moanin Ronan");
    expect(signingName({ first: "Max", nick: "  Dragonslayer " })).toBe("Dragonslayer");
  });

  it("signs as 'a hero' when the nickname is the first name, whatever its case or spaces", () => {
    expect(signingName({ first: "Ronan", nick: "Ronan" })).toBe("a hero");
    expect(signingName({ first: "Ronan", nick: " ronan " })).toBe("a hero");
    expect(signingName({ first: " RONAN", nick: "Ronan" })).toBe("a hero");
  });

  it("never falls back to the first name", () => {
    expect(signingName({ first: "Ronan" })).toBe("a hero");
    expect(signingName({ first: "Ronan", nick: "   " })).toBe("a hero");
    expect(signingName({ first: "Ronan", nick: "" })).toBe("a hero");
    expect(signingName(undefined)).toBe("a hero");
    expect(signingName(null)).toBe("a hero");
  });

  it("signs as 'a hero' when the nickname is the family name or the full name", () => {
    expect(signingName({ first: "Max", last: "Power", full: "Max Power", nick: "Power" })).toBe("a hero");
    expect(signingName({ first: "Max", last: "Power", full: "Max Power", nick: "max power" })).toBe("a hero");
  });

  it("makes the line '— a hero, from Do It For The XP'", () => {
    expect(signature(signingName({ first: "Ronan", nick: "Ronan" }))).toBe("\n\n— a hero, from Do It For The XP");
  });
});

describe("bugEnvironment", () => {
  it("lists the app, the screen, the device and the time on four lines", () => {
    const text = bugEnvironment({
      version: "1.4.2",
      route: "/town-hall/hero-1",
      platform: "web",
      userAgent: "Mozilla/5.0 (Linux; Android 14)",
      at: Date.UTC(2026, 9, 13, 8, 30, 15, 250),
    });
    expect(text.split("\n")).toEqual([
      "App: 1.4.2",
      "Screen: /town-hall/hero-1",
      "Device: web, Mozilla/5.0 (Linux; Android 14)",
      "Time: 2026-10-13T08:30:15.250Z",
    ]);
  });
});

describe("requestFor", () => {
  it("builds a pending topic on its board, signed", () => {
    expect(requestFor(post(), { "feature-requests": 3 })).toEqual({
      path: "wp/v2/cafeteria_topic",
      body: {
        title: "More dragons",
        content: "Please add more dragons." + SIGNED,
        status: "pending",
        cafeteria_board: [3],
      },
    });
  });

  it("uses the id of the topic's own board", () => {
    const request = requestFor(post({ board: "suggestion-box" }), { "feature-requests": 3, "suggestion-box": 9 });
    expect(request.body.cafeteria_board).toEqual([9]);
  });

  it("throws for a topic whose board has no id", () => {
    expect(() => requestFor(post({ board: "ideas-suggestions" }), { "feature-requests": 3 })).toThrow();
    expect(() => requestFor(post({ board: undefined }), { "feature-requests": 3 })).toThrow();
    expect(() => requestFor(post(), {})).toThrow();
  });

  it("builds a signed comment on the post it answers", () => {
    const comment = post({ kind: "comment", board: undefined, title: undefined, postId: 12, body: "Nice one!" });
    expect(requestFor(comment, {})).toEqual({
      path: "wp/v2/comments",
      body: { post: 12, content: "Nice one!" + SIGNED },
    });
  });

  it("throws for a comment that answers nothing", () => {
    expect(() => requestFor(post({ kind: "comment", postId: undefined }), {})).toThrow();
  });

  it("builds a pending bug with its details and no signature", () => {
    const bug = post({
      kind: "bug",
      board: undefined,
      title: "Map froze",
      body: "I tapped the map and it froze.",
      bug: { route: "/town-hall/hero-1", environment: "App: 1.4.2\nScreen: /town-hall/hero-1" },
    });
    expect(requestFor(bug, {})).toEqual({
      path: "wp/v2/compass_bug",
      body: {
        title: "Map froze",
        content: "I tapped the map and it froze.",
        status: "pending",
        bug_status: "new",
        bug_priority: "medium",
        bug_type: "bug",
        bug_plugin: "do-it-for-the-xp",
        bug_url: "/town-hall/hero-1",
        bug_environment: "App: 1.4.2\nScreen: /town-hall/hero-1",
      },
    });
  });

  it("titles a bug without a title after the hero", () => {
    const bug = post({ kind: "bug", title: undefined, bug: { route: "/x", environment: "env" } });
    expect(requestFor(bug, {}).body.title).toBe("Bug report from Max");
    expect(requestFor({ ...bug, title: "  " }, {}).body.title).toBe("Bug report from Max");
  });

  it("does not need a board id for a bug or a comment", () => {
    expect(() => requestFor(post({ kind: "bug", board: undefined, bug: { route: "/x", environment: "e" } }), {})).not.toThrow();
  });
});
