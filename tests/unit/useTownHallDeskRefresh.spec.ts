import { ref } from "vue";
import { flushPromises } from "@vue/test-utils";
import { useTownHallDesk, type DeskStore } from "@/app/Console/MyPortal/HomeTown/TownHall/components/useTownHallDesk";
import { courierLatePrompt, keysTakenNotice } from "@/lib/services/hometown/hometownPrompts";
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

describe("refreshing the lists and the waiting count", () => {
  it("refresh counts drafts, topics, held comments and open bugs for a publishing moderator, and nothing for a contributor", async () => {
    const store = fakeStore();
    const desk = useTownHallDesk({ store, reveal: fakeReveal() });
    siteHolds([comment(3), comment(5)], [bug(4)], { drafts: 2, topics: 1, total: 6, category: 7 });

    await desk.actions.refresh();

    for (const reader of [draftsMock, topicsMock, heldMock, bugsMock, categoryMock]) {
      expect(reader).toHaveBeenCalledWith({ auth: AUTH });
    }
    expect(desk.state.heldComments.value).toEqual([comment(3), comment(5)]);
    expect(desk.state.bugs.value).toEqual([bug(4)]);
    expect(desk.state.patchNotesAvailable.value).toBe(true);
    expect(desk.state.waitingCount.value).toBe(2 + 1 + 6 + 1);

    jest.clearAllMocks();
    store.canPublish = false;
    store.canModerate = false;
    await desk.actions.refresh();

    for (const reader of [draftsMock, topicsMock, heldMock, bugsMock, categoryMock]) {
      expect(reader).not.toHaveBeenCalled();
    }
    expect(desk.state.heldComments.value).toEqual([]);
    expect(desk.state.bugs.value).toEqual([]);
    expect(desk.state.patchNotesAvailable.value).toBe(false);
    expect(desk.state.waitingCount.value).toBe(0);
  });

  it("reads only the held comments for a moderator who cannot publish", async () => {
    const { desk } = rig({ canPublish: false, canModerate: true });
    siteHolds([comment(3)], [bug(4)], { drafts: 2, topics: 1, category: 7 });

    await desk.actions.refresh();

    expect(heldMock).toHaveBeenCalledTimes(1);
    for (const reader of [draftsMock, topicsMock, bugsMock, categoryMock]) {
      expect(reader).not.toHaveBeenCalled();
    }
    expect(desk.state.waitingCount.value).toBe(1);
    expect(desk.state.bugs.value).toEqual([]);
    expect(desk.state.patchNotesAvailable.value).toBe(false);
  });

  it("counts a read that fails as nothing and still adds up the others", async () => {
    const { desk } = rig();
    siteHolds([comment(3)], [bug(4)], { drafts: 2, topics: 1, category: 7 });
    draftsMock.mockRejectedValue(new TownHallError("server", "Bad gateway", 502));
    bugsMock.mockRejectedValue(new Error("boom"));

    await desk.actions.refresh();

    expect(desk.state.waitingCount.value).toBe(1 + 1);
    expect(desk.state.heldComments.value).toEqual([comment(3)]);
    expect(desk.state.bugs.value).toEqual([]);
    expect(mockLogged).toHaveBeenCalledTimes(1);
  });
});

describe("writing for the site", () => {
  it("creates news in the Patch Notes when the site has them, and names the problem when it has not", async () => {
    const { desk } = rig();
    categoryMock.mockResolvedValue(7);

    await expect(desk.writer.createNews(NEWS)).resolves.toBeNull();

    expect(categoryMock).toHaveBeenCalledWith({ auth: AUTH });
    expect(fetchMock).toHaveBeenCalledWith("wp/v2/posts", {
      auth: AUTH,
      method: "POST",
      body: { title: "Patch 1.2", content: "Fewer crashes.", status: "publish", categories: [7] },
    });

    fetchMock.mockClear();
    categoryMock.mockResolvedValue(null);

    await expect(desk.writer.createNews(NEWS)).resolves.toBe("The site has no Patch Notes category yet.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates plain news without a category and says the courier is late when the category cannot be read", async () => {
    const { desk } = rig();

    await expect(desk.writer.createNews({ ...NEWS, category: "news", status: "draft" })).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith("wp/v2/posts", { auth: AUTH, method: "POST", body: { title: "Patch 1.2", content: "Fewer crashes.", status: "draft" } });

    fetchMock.mockClear();
    categoryMock.mockRejectedValue(new TownHallError("offline"));

    await expect(desk.writer.createNews(NEWS)).resolves.toBe("That didn't reach the site. Try again.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("saves an edit with the new words, and answers the site's complaint or that it did not reach the site", async () => {
    const { desk, store, reveal } = rig();
    const words = { title: "New title", body: "New words" };

    await expect(desk.writer.saveEdit({ type: "topic", id: 9 }, words)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith("wp/v2/cafeteria_topic/9", { auth: AUTH, method: "POST", body: { title: "New title", content: "New words" } });

    fetchMock.mockRejectedValueOnce(new TownHallError("invalid", "Too short", 400));
    await expect(desk.writer.saveEdit({ type: "post", id: 7 }, words)).resolves.toBe("Too short");

    fetchMock.mockRejectedValueOnce(new TownHallError("offline"));
    const late = desk.writer.saveEdit({ type: "post", id: 7 }, words);
    await flushPromises();
    reveal.answer("never");
    await expect(late).resolves.toBe("That didn't reach the site. Try again.");

    fetchMock.mockRejectedValueOnce(new TownHallError("forbidden", "No", 403));
    const refused = desk.writer.saveEdit({ type: "post", id: 7 }, words);
    await flushPromises();
    reveal.answer();
    await expect(refused).resolves.toBe("That didn't reach the site. Try again.");
    expect(store.dropPowers).toHaveBeenCalledTimes(1);
  });

  it("reads the words for an edit, and answers null without a word when anything else goes wrong", async () => {
    const { desk, reveal } = rig();
    wordsMock.mockResolvedValue({ title: "Raw title", body: "Raw body" });

    await expect(desk.writer.readWords("post", 7)).resolves.toEqual({ title: "Raw title", body: "Raw body" });
    expect(wordsMock).toHaveBeenCalledWith("post", 7, { auth: AUTH });

    wordsMock.mockRejectedValue(new Error("boom"));

    await expect(desk.writer.readWords("post", 7)).resolves.toBeNull();
    expect(reveal.asked).toEqual([]);
    expect(mockLogged).toHaveBeenCalledTimes(1);
  });

  it("says the courier is late when the words cannot be read, and reads again on retry", async () => {
    const { desk, reveal } = rig();
    wordsMock.mockRejectedValueOnce(new TownHallError("offline")).mockResolvedValueOnce({ title: "Raw title", body: "Raw body" });

    const reading = desk.writer.readWords("post", 7);
    await flushPromises();
    expect(reveal.asked).toEqual([courierLatePrompt()]);
    reveal.answer("retry");

    await expect(reading).resolves.toEqual({ title: "Raw title", body: "Raw body" });
    expect(wordsMock).toHaveBeenCalledTimes(2);
    expect(mockLogged).not.toHaveBeenCalled();

    wordsMock.mockReset();
    wordsMock.mockRejectedValue(new TownHallError("server", "Bad gateway", 502));
    const giveUp = desk.writer.readWords("post", 7);
    await flushPromises();
    reveal.answer("never");

    await expect(giveUp).resolves.toBeNull();
    expect(wordsMock).toHaveBeenCalledTimes(1);
    expect(reveal.asked).toHaveLength(2);
  });

  it("asks only once when the courier is late twice, and drops the powers when the words are refused", async () => {
    const { desk, store, reveal } = rig();
    wordsMock.mockRejectedValue(new TownHallError("offline"));

    const twice = desk.writer.readWords("post", 7);
    await flushPromises();
    reveal.answer("retry");

    await expect(twice).resolves.toBeNull();
    expect(wordsMock).toHaveBeenCalledTimes(2);
    expect(reveal.asked).toEqual([courierLatePrompt()]);

    wordsMock.mockReset();
    wordsMock.mockRejectedValue(new TownHallError("forbidden", "No", 403));
    const refused = desk.writer.readWords("post", 7);
    await flushPromises();
    expect(store.dropPowers).toHaveBeenCalledTimes(1);
    expect(reveal.asked[1]).toEqual(keysTakenNotice());
    reveal.answer();

    await expect(refused).resolves.toBeNull();
    expect(wordsMock).toHaveBeenCalledTimes(1);
    expect(reveal.asked).toHaveLength(2);
  });
});