import { ref } from "vue";
import { flushPromises } from "@vue/test-utils";
import { useTownHallDesk, type DeskStore } from "@/app/Console/MyPortal/HomeTown/TownHall/components/useTownHallDesk";
import { binPrompt, courierLatePrompt, keysTakenNotice } from "@/lib/services/hometown/hometownPrompts";
import type { RevealPromptOptions } from "@/components/organisms/RevealPrompt/revealPrompt";
import { townHallFetch, TownHallError, type TownHallAuth } from "@/lib/services/townhall/townHallClient";
import type { NewsDraft } from "@/lib/services/townhall/townHallDesk";
import {
  countDrafts,
  countPendingTopics,
  fetchBugs,
  fetchHeldComments,
  fetchWords,
  patchNotesCategoryId,
  type BugItem,
  type HeldComment,
} from "@/lib/services/townhall/townHallFeed";

const mockLogged = jest.fn();
jest.mock("@/lib/utils/debug", () => ({
  __esModule: true,
  default: { error: (...args: unknown[]) => mockLogged(...args), log: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

jest.mock("@/lib/services/townhall/townHallClient", () => {
  const actual = jest.requireActual("@/lib/services/townhall/townHallClient");
  return { __esModule: true, TownHallError: actual.TownHallError, townHallFetch: jest.fn() };
});

jest.mock("@/lib/services/townhall/townHallFeed", () => ({
  __esModule: true,
  fetchHeldComments: jest.fn(),
  fetchBugs: jest.fn(),
  countDrafts: jest.fn(),
  countPendingTopics: jest.fn(),
  fetchWords: jest.fn(),
  patchNotesCategoryId: jest.fn(),
}));

const fetchMock = townHallFetch as jest.Mock;
const heldMock = fetchHeldComments as jest.Mock;
const bugsMock = fetchBugs as jest.Mock;
const draftsMock = countDrafts as jest.Mock;
const topicsMock = countPendingTopics as jest.Mock;
const wordsMock = fetchWords as jest.Mock;
const categoryMock = patchNotesCategoryId as jest.Mock;

const AUTH: TownHallAuth = { kind: "basic", userLogin: "mom@example.com", appPassword: "abcd efgh" };
const SENT = { data: {}, headers: new Headers() };

const comment = (id: number): HeldComment => ({ id, postId: 20, author: "Max", date: "2026-10-20T09:00:00", content: "<p>Hi</p>" });
const bug = (id: number): BugItem => ({ id, date: "2026-10-21T09:00:00", title: "Stuck dragon", status: "new", route: "/battle", environment: "web" });

const NEWS: NewsDraft = { kind: "news", title: "Patch 1.2", body: "Fewer crashes.", category: "patch-notes", status: "publish" };

/** The clerk: a prompt asked stays up until the spec answers it. */
const fakeReveal = () => {
  const prompt = ref<RevealPromptOptions | null>(null);
  const asked: RevealPromptOptions[] = [];
  let answerNow: (id: string) => void = () => undefined;
  const ask = jest.fn(
    (options: RevealPromptOptions) =>
      new Promise<string>((resolve) => {
        asked.push(options);
        prompt.value = options;
        answerNow = (id) => {
          prompt.value = null;
          resolve(id);
        };
      }),
  );
  return { prompt, showPrompt: ask, asked, answer: (id = "ok") => answerNow(id) };
};

/** A link with both powers unless the spec says otherwise. */
const fakeStore = (over: Partial<Omit<DeskStore, "dropPowers">> = {}) => ({
  auth: AUTH,
  canPublish: true,
  canModerate: true,
  dropPowers: jest.fn(async () => undefined),
  ...over,
});

const rig = (over: Partial<DeskStore> = {}) => {
  const store = fakeStore(over);
  const reveal = fakeReveal();
  const desk = useTownHallDesk({ store, reveal });
  return { desk, store, reveal };
};

/** What the site holds: the readers answer these when `refresh` asks. */
const siteHolds = (held: HeldComment[], bugs: BugItem[], over: { drafts?: number; topics?: number; category?: number | null; total?: number } = {}) => {
  draftsMock.mockResolvedValue(over.drafts ?? 0);
  topicsMock.mockResolvedValue(over.topics ?? 0);
  heldMock.mockResolvedValue({ items: held, total: over.total ?? held.length });
  bugsMock.mockResolvedValue(bugs);
  categoryMock.mockResolvedValue(over.category === undefined ? null : over.category);
};

beforeEach(() => {
  jest.resetAllMocks();
  fetchMock.mockResolvedValue(SENT);
});

describe("one call per action", () => {
  it("publishes a draft with one request and says nothing", async () => {
    const { desk, reveal } = rig();

    await expect(desk.publish("post", 7)).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("wp/v2/posts/7", { auth: AUTH, method: "POST", body: { status: "publish" } });
    expect(reveal.asked).toEqual([]);
  });

  it("sends nothing while the same item is busy", async () => {
    const { desk } = rig();
    let release: () => void = () => undefined;
    fetchMock.mockReturnValue(new Promise((resolve) => (release = () => resolve(SENT))));

    const first = desk.publish("post", 7);
    const second = desk.publish("post", 7);

    expect(desk.isBusy("post", 7)).toBe(true);
    expect(desk.isBusy("post", 8)).toBe(false);
    expect(desk.isBusy("topic", 7)).toBe(false);
    await expect(second).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    release();
    await expect(first).resolves.toBe(true);
    expect(desk.isBusy("post", 7)).toBe(false);
  });

  it("asks before binning something published, and leaves it on Leave it", async () => {
    const { desk, reveal } = rig();

    const leaving = desk.bin("post", 7, true);
    await flushPromises();
    expect(reveal.asked).toEqual([binPrompt()]);
    reveal.answer("leave");

    await expect(leaving).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();

    const taking = desk.bin("post", 7, true);
    await flushPromises();
    reveal.answer("take-down");

    await expect(taking).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("wp/v2/posts/7", { auth: AUTH, method: "DELETE" });
  });

  it("bins a draft without asking", async () => {
    const { desk, reveal } = rig();

    await expect(desk.bin("topic", 8, false)).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("wp/v2/cafeteria_topic/8", { auth: AUTH, method: "DELETE" });
    expect(reveal.asked).toEqual([]);
  });
});

describe("when the site does not take it", () => {
  it("drops the powers and tells about the keys on a refusal", async () => {
    const { desk, store, reveal } = rig();
    fetchMock.mockRejectedValueOnce(new TownHallError("forbidden", "Sorry, you are not allowed.", 403));

    const publishing = desk.publish("post", 7);
    await flushPromises();

    expect(store.dropPowers).toHaveBeenCalledTimes(1);
    expect(reveal.asked).toEqual([keysTakenNotice()]);
    reveal.answer();
    await expect(publishing).resolves.toBe(false);

    fetchMock.mockClear();
    await expect(desk.publish("post", 7)).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(store.dropPowers).toHaveBeenCalledTimes(1);
    expect(reveal.asked).toHaveLength(1);
  });

  it("tries once more when the courier is late and the admin asks", async () => {
    const { desk, reveal } = rig();
    fetchMock.mockRejectedValueOnce(new TownHallError("offline"));

    const publishing = desk.publish("post", 7);
    await flushPromises();
    expect(reveal.asked).toEqual([courierLatePrompt()]);
    expect(desk.isBusy("post", 7)).toBe(true);
    reveal.answer("retry");

    await expect(publishing).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(2, "wp/v2/posts/7", { auth: AUTH, method: "POST", body: { status: "publish" } });
    expect(desk.isBusy("post", 7)).toBe(false);
  });

  it("lets it go on Never mind, and asks only once when the courier is late twice", async () => {
    const { desk, reveal } = rig();
    fetchMock.mockRejectedValue(new TownHallError("server", "Bad gateway", 502));

    const letGo = desk.publish("post", 7);
    await flushPromises();
    reveal.answer("never");
    await expect(letGo).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockClear();
    const retried = desk.publish("post", 7);
    await flushPromises();
    reveal.answer("retry");

    await expect(retried).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(reveal.asked).toHaveLength(2);
    expect(desk.isBusy("post", 7)).toBe(false);
  });

  it("keeps the site's complaint on the item", async () => {
    const { desk, reveal } = rig();
    fetchMock.mockRejectedValueOnce(new TownHallError("invalid", "Too short", 400));

    await expect(desk.publish("post", 7)).resolves.toBe(false);

    expect(desk.troubleOf("post", 7)).toBe("Too short");
    expect(desk.troubleOf("post", 8)).toBeNull();
    expect(reveal.asked).toEqual([]);

    await expect(desk.publish("post", 7)).resolves.toBe(true);
    expect(desk.troubleOf("post", 7)).toBeNull();
  });

  it("leaves the powers to the store's own handling when the site says unauthorized", async () => {
    const { desk, store, reveal } = rig();
    fetchMock.mockRejectedValueOnce(new TownHallError("unauthorized", "Not signed in", 401));

    await expect(desk.publish("post", 7)).resolves.toBe(false);

    expect(store.dropPowers).not.toHaveBeenCalled();
    expect(reveal.asked).toEqual([]);
    expect(desk.troubleOf("post", 7)).toBeNull();
  });
});

describe("the lists and the waiting count", () => {
  it("approving a held comment takes it off the list and the count", async () => {
    const { desk } = rig();
    siteHolds([comment(3)], []);
    await desk.refresh();
    expect(desk.heldComments.value).toEqual([comment(3)]);
    expect(desk.waitingCount.value).toBe(1);

    await expect(desk.approve(3)).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith("wp/v2/comments/3", { auth: AUTH, method: "POST", body: { status: "approved" } });
    expect(desk.heldComments.value).toEqual([]);
    expect(desk.waitingCount.value).toBe(0);
  });

  it("resolving a bug takes it off the Bug Net card", async () => {
    const { desk } = rig();
    siteHolds([], [bug(4)]);
    await desk.refresh();
    expect(desk.bugs.value).toEqual([bug(4)]);
    expect(desk.waitingCount.value).toBe(1);

    await expect(desk.resolve(4)).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith("wp/v2/compass_bug/4", { auth: AUTH, method: "POST", body: { bug_status: "resolved" } });
    expect(desk.bugs.value).toEqual([]);
    expect(desk.waitingCount.value).toBe(0);
  });

  it("binning a held comment or an open bug takes it off its list and the count too", async () => {
    const { desk } = rig();
    siteHolds([comment(3), comment(5)], [bug(4)]);
    await desk.refresh();
    expect(desk.waitingCount.value).toBe(3);

    await expect(desk.bin("comment", 3, false)).resolves.toBe(true);
    expect(desk.heldComments.value).toEqual([comment(5)]);
    expect(desk.waitingCount.value).toBe(2);

    await expect(desk.bin("bug", 4, false)).resolves.toBe(true);
    expect(desk.bugs.value).toEqual([]);
    expect(desk.waitingCount.value).toBe(1);
  });

  it("keeps a comment on the list when the site did not take the approval", async () => {
    const { desk } = rig();
    siteHolds([comment(3)], []);
    await desk.refresh();
    fetchMock.mockRejectedValueOnce(new TownHallError("invalid", "No", 400));

    await expect(desk.approve(3)).resolves.toBe(false);

    expect(desk.heldComments.value).toEqual([comment(3)]);
    expect(desk.waitingCount.value).toBe(1);
  });

  it("publishing a draft or binning a waiting topic counts one fewer on the badge; binning something published leaves it alone", async () => {
    const { desk, reveal } = rig();
    siteHolds([], [], { drafts: 2, topics: 3 });
    await desk.refresh();
    expect(desk.waitingCount.value).toBe(5);

    await expect(desk.publish("post", 7)).resolves.toBe(true);
    expect(desk.waitingCount.value).toBe(4);

    await expect(desk.bin("topic", 8, false)).resolves.toBe(true);
    expect(desk.waitingCount.value).toBe(3);

    const taking = desk.bin("post", 9, true);
    await flushPromises();
    reveal.answer("take-down");
    await expect(taking).resolves.toBe(true);
    expect(desk.waitingCount.value).toBe(3);

    fetchMock.mockRejectedValueOnce(new TownHallError("invalid", "No", 400));
    await expect(desk.publish("topic", 8)).resolves.toBe(false);
    expect(desk.waitingCount.value).toBe(3);
  });

  it("never counts below zero", async () => {
    const { desk } = rig();
    siteHolds([], []);
    await desk.refresh();

    await desk.publish("post", 7);
    await desk.bin("topic", 8, false);

    expect(desk.waitingCount.value).toBe(0);
  });

  it("refresh counts drafts, topics, held comments and open bugs for a publishing moderator, and nothing for a contributor", async () => {
    const store = fakeStore();
    const desk = useTownHallDesk({ store, reveal: fakeReveal() });
    siteHolds([comment(3), comment(5)], [bug(4)], { drafts: 2, topics: 1, total: 6, category: 7 });

    await desk.refresh();

    for (const reader of [draftsMock, topicsMock, heldMock, bugsMock, categoryMock]) {
      expect(reader).toHaveBeenCalledWith({ auth: AUTH });
    }
    expect(desk.heldComments.value).toEqual([comment(3), comment(5)]);
    expect(desk.bugs.value).toEqual([bug(4)]);
    expect(desk.patchNotesAvailable.value).toBe(true);
    expect(desk.waitingCount.value).toBe(2 + 1 + 6 + 1);

    jest.clearAllMocks();
    store.canPublish = false;
    store.canModerate = false;
    await desk.refresh();

    for (const reader of [draftsMock, topicsMock, heldMock, bugsMock, categoryMock]) {
      expect(reader).not.toHaveBeenCalled();
    }
    expect(desk.heldComments.value).toEqual([]);
    expect(desk.bugs.value).toEqual([]);
    expect(desk.patchNotesAvailable.value).toBe(false);
    expect(desk.waitingCount.value).toBe(0);
  });

  it("reads only the held comments for a moderator who cannot publish", async () => {
    const { desk } = rig({ canPublish: false, canModerate: true });
    siteHolds([comment(3)], [bug(4)], { drafts: 2, topics: 1, category: 7 });

    await desk.refresh();

    expect(heldMock).toHaveBeenCalledTimes(1);
    for (const reader of [draftsMock, topicsMock, bugsMock, categoryMock]) {
      expect(reader).not.toHaveBeenCalled();
    }
    expect(desk.waitingCount.value).toBe(1);
    expect(desk.bugs.value).toEqual([]);
    expect(desk.patchNotesAvailable.value).toBe(false);
  });

  it("counts a read that fails as nothing and still adds up the others", async () => {
    const { desk } = rig();
    siteHolds([comment(3)], [bug(4)], { drafts: 2, topics: 1, category: 7 });
    draftsMock.mockRejectedValue(new TownHallError("server", "Bad gateway", 502));
    bugsMock.mockRejectedValue(new Error("boom"));

    await desk.refresh();

    expect(desk.waitingCount.value).toBe(1 + 1);
    expect(desk.heldComments.value).toEqual([comment(3)]);
    expect(desk.bugs.value).toEqual([]);
    expect(mockLogged).toHaveBeenCalledTimes(1);
  });
});

describe("writing for the site", () => {
  it("creates news in the Patch Notes when the site has them, and names the problem when it has not", async () => {
    const { desk } = rig();
    categoryMock.mockResolvedValue(7);

    await expect(desk.createNews(NEWS)).resolves.toBeNull();

    expect(categoryMock).toHaveBeenCalledWith({ auth: AUTH });
    expect(fetchMock).toHaveBeenCalledWith("wp/v2/posts", {
      auth: AUTH,
      method: "POST",
      body: { title: "Patch 1.2", content: "Fewer crashes.", status: "publish", categories: [7] },
    });

    fetchMock.mockClear();
    categoryMock.mockResolvedValue(null);

    await expect(desk.createNews(NEWS)).resolves.toBe("The site has no Patch Notes category yet.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates plain news without a category and says the courier is late when the category cannot be read", async () => {
    const { desk } = rig();

    await expect(desk.createNews({ ...NEWS, category: "news", status: "draft" })).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith("wp/v2/posts", { auth: AUTH, method: "POST", body: { title: "Patch 1.2", content: "Fewer crashes.", status: "draft" } });

    fetchMock.mockClear();
    categoryMock.mockRejectedValue(new TownHallError("offline"));

    await expect(desk.createNews(NEWS)).resolves.toBe("That didn't reach the site. Try again.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("saves an edit with the new words, and answers the site's complaint or that it did not reach the site", async () => {
    const { desk, store, reveal } = rig();
    const words = { title: "New title", body: "New words" };

    await expect(desk.saveEdit({ type: "topic", id: 9 }, words)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith("wp/v2/cafeteria_topic/9", { auth: AUTH, method: "POST", body: { title: "New title", content: "New words" } });

    fetchMock.mockRejectedValueOnce(new TownHallError("invalid", "Too short", 400));
    await expect(desk.saveEdit({ type: "post", id: 7 }, words)).resolves.toBe("Too short");

    fetchMock.mockRejectedValueOnce(new TownHallError("offline"));
    const late = desk.saveEdit({ type: "post", id: 7 }, words);
    await flushPromises();
    reveal.answer("never");
    await expect(late).resolves.toBe("That didn't reach the site. Try again.");

    fetchMock.mockRejectedValueOnce(new TownHallError("forbidden", "No", 403));
    const refused = desk.saveEdit({ type: "post", id: 7 }, words);
    await flushPromises();
    reveal.answer();
    await expect(refused).resolves.toBe("That didn't reach the site. Try again.");
    expect(store.dropPowers).toHaveBeenCalledTimes(1);
  });

  it("reads the words for an edit, and answers null without a word when anything else goes wrong", async () => {
    const { desk, reveal } = rig();
    wordsMock.mockResolvedValue({ title: "Raw title", body: "Raw body" });

    await expect(desk.readWords("post", 7)).resolves.toEqual({ title: "Raw title", body: "Raw body" });
    expect(wordsMock).toHaveBeenCalledWith("post", 7, { auth: AUTH });

    wordsMock.mockRejectedValue(new Error("boom"));

    await expect(desk.readWords("post", 7)).resolves.toBeNull();
    expect(reveal.asked).toEqual([]);
    expect(mockLogged).toHaveBeenCalledTimes(1);
  });

  it("says the courier is late when the words cannot be read, and reads again on retry", async () => {
    const { desk, reveal } = rig();
    wordsMock.mockRejectedValueOnce(new TownHallError("offline")).mockResolvedValueOnce({ title: "Raw title", body: "Raw body" });

    const reading = desk.readWords("post", 7);
    await flushPromises();
    expect(reveal.asked).toEqual([courierLatePrompt()]);
    reveal.answer("retry");

    await expect(reading).resolves.toEqual({ title: "Raw title", body: "Raw body" });
    expect(wordsMock).toHaveBeenCalledTimes(2);
    expect(mockLogged).not.toHaveBeenCalled();

    wordsMock.mockReset();
    wordsMock.mockRejectedValue(new TownHallError("server", "Bad gateway", 502));
    const giveUp = desk.readWords("post", 7);
    await flushPromises();
    reveal.answer("never");

    await expect(giveUp).resolves.toBeNull();
    expect(wordsMock).toHaveBeenCalledTimes(1);
    expect(reveal.asked).toHaveLength(2);
  });

  it("asks only once when the courier is late twice, and drops the powers when the words are refused", async () => {
    const { desk, store, reveal } = rig();
    wordsMock.mockRejectedValue(new TownHallError("offline"));

    const twice = desk.readWords("post", 7);
    await flushPromises();
    reveal.answer("retry");

    await expect(twice).resolves.toBeNull();
    expect(wordsMock).toHaveBeenCalledTimes(2);
    expect(reveal.asked).toEqual([courierLatePrompt()]);

    wordsMock.mockReset();
    wordsMock.mockRejectedValue(new TownHallError("forbidden", "No", 403));
    const refused = desk.readWords("post", 7);
    await flushPromises();
    expect(store.dropPowers).toHaveBeenCalledTimes(1);
    expect(reveal.asked[1]).toEqual(keysTakenNotice());
    reveal.answer();

    await expect(refused).resolves.toBeNull();
    expect(wordsMock).toHaveBeenCalledTimes(1);
    expect(reveal.asked).toHaveLength(2);
  });
});
