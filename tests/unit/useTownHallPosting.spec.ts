import { defineComponent, nextTick, reactive, ref } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import {
  useTownHallPosting,
  type PostingDeps,
  type PostingStore,
} from "@/app/Console/MyPortal/HomeTown/TownHall/components/useTownHallPosting";
import {
  clerkMenuPrompt,
  forbiddenPrompt,
  postedNotice,
  registerAgainPrompt,
  unregisteredOutboxPrompt,
} from "@/lib/services/hometown/hometownPrompts";
import type { RevealPromptOptions } from "@/components/organisms/RevealPrompt/revealPrompt";
import type { FlushResult } from "@/lib/store/stores/townHall";
import { newPost } from "@/lib/services/townhall/townHallOutbox";
import type { PostDraft } from "@/lib/services/townhall/townHallPosts";
import type { TownHallPost } from "@/lib/services/townhall/townHallTypes";

const mockLogged = jest.fn();
jest.mock("@/lib/utils/debug", () => ({
  __esModule: true,
  default: { error: (...args: unknown[]) => mockLogged(...args), log: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

const HERO = { id: "hero-1", name: "Max" };
const NOW = 1_700_000_000_000;
const NOTHING: FlushResult = { sent: 0, unlinked: false, forbidden: false };

const topicDraft: PostDraft = { kind: "topic", board: "feature-requests", title: "More dragons", body: "Please" };
const bugDraft: PostDraft = { kind: "bug", body: "The dragon is stuck." };

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
  return { prompt, ask, asked, answer: (id = "ok") => answerNow(id) };
};

/** A store that keeps what it is given and sends nothing; `flush` answers what the spec says. */
const fakeStore = (over: Partial<PostingStore> = {}) => {
  const state = reactive({ isLinked: true, posts: [] as TownHallPost[] });
  const store: PostingStore = Object.assign(state, {
    init: jest.fn(async () => undefined),
    submit: jest.fn(async (draft: PostDraft, hero: { id: string; name: string }, isGameMaster: boolean) => {
      const post = newPost(draft, hero, isGameMaster, NOW, `p-${state.posts.length + 1}`);
      state.posts = [...state.posts, post];
      return { problem: null, post };
    }),
    resubmit: jest.fn(async () => null),
    dismiss: jest.fn(async () => undefined),
    flush: jest.fn(async () => NOTHING),
    ...over,
  });
  return store;
};

interface Rig {
  posting: ReturnType<typeof useTownHallPosting>;
  store: PostingStore;
  reveal: ReturnType<typeof fakeReveal>;
  redo: jest.Mock;
  register: jest.Mock;
  wrapper: ReturnType<typeof mount>;
}

const rig = (options: { store?: PostingStore; isGameMaster?: boolean } = {}): Rig => {
  const store = options.store ?? fakeStore();
  const reveal = fakeReveal();
  const redo = jest.fn(async () => undefined);
  const register = jest.fn(async () => undefined);
  const deps: PostingDeps = {
    store,
    reveal,
    userId: () => HERO.id,
    heroName: () => HERO.name,
    isGameMaster: () => options.isGameMaster ?? false,
    route: () => "/hometown/town-hall/hero-1",
    currentBoard: () => "ideas-suggestions",
    registerFamily: register,
    redoRegistration: redo,
  };
  let posting!: ReturnType<typeof useTownHallPosting>;
  const wrapper = mount(
    defineComponent({
      setup() {
        posting = useTownHallPosting(deps);
        return () => null;
      },
    }),
  );
  return { posting, store, reveal, redo, register, wrapper };
};

beforeEach(() => mockLogged.mockClear());

describe("the clerk's menu", () => {
  const pick = async (id: string, options: { isGameMaster?: boolean } = {}) => {
    const desk = rig(options);
    const done = desk.posting.openClerkMenu();
    await flushPromises();
    desk.reveal.answer(id);
    await done;
    return desk;
  };

  it("asks what to do, in the clerk's own words, with registration for a Game Master only", async () => {
    const hero = rig();
    const asking = hero.posting.openClerkMenu();
    await flushPromises();
    expect(hero.reveal.asked[0]).toEqual(clerkMenuPrompt(false, "adventure"));
    hero.reveal.answer("never");
    await asking;

    const parent = rig({ isGameMaster: true });
    const askingParent = parent.posting.openClerkMenu();
    await flushPromises();
    expect(parent.reveal.asked[0]).toEqual(clerkMenuPrompt(true, "adventure"));
    parent.reveal.answer("never");
    await askingParent;
  });

  it("opens a topic on the board the hero is looking at", async () => {
    const { posting } = await pick("board");

    expect(posting.composeSpec.value).toEqual({ kind: "topic", board: "ideas-suggestions" });
    expect(posting.composeOpen.value).toBe(true);
  });

  it("opens a bug report", async () => {
    const { posting } = await pick("bug");

    expect(posting.composeSpec.value).toEqual({ kind: "bug" });
    expect(posting.composeOpen.value).toBe(true);
  });

  it("hands the registration errand to the page", async () => {
    const { posting, register } = await pick("registration", { isGameMaster: true });

    expect(register).toHaveBeenCalledTimes(1);
    expect(posting.composeOpen.value).toBe(false);
  });

  it("does nothing on never mind", async () => {
    const { posting, register } = await pick("never");

    expect(register).not.toHaveBeenCalled();
    expect(posting.composeSpec.value).toBeNull();
  });
});

describe("opening the compose", () => {
  it("opens a topic on the board the hero stands on, a comment on the post it answers, and a bug", () => {
    const { posting } = rig();

    posting.openTopic("ideas-suggestions");
    expect(posting.composeSpec.value).toEqual({ kind: "topic", board: "ideas-suggestions" });
    expect(posting.composeOpen.value).toBe(true);

    posting.closeCompose();
    expect(posting.composeOpen.value).toBe(false);

    posting.openComment({ postId: 12, title: "Big news" });
    expect(posting.composeSpec.value).toEqual({ kind: "comment", postId: 12, replyingTo: "Big news" });

    posting.openBug();
    expect(posting.composeSpec.value).toEqual({ kind: "bug" });
  });

  it("opens a failed post for editing with its words", () => {
    const { posting } = rig();
    const failed: TownHallPost = { ...newPost(topicDraft, HERO, false, NOW, "f-1"), status: "failed", error: "Nope" };

    posting.openEdit(failed);

    expect(posting.composeSpec.value).toEqual({
      kind: "topic",
      board: "feature-requests",
      editingId: "f-1",
      initial: { kind: "topic", title: "More dragons", body: "Please", board: "feature-requests" },
    });
    expect(posting.composeOpen.value).toBe(true);
  });

  it("lists the hero's own waiting posts, not another hero's", () => {
    const store = fakeStore();
    store.posts = [newPost(topicDraft, HERO, false, NOW, "mine"), newPost(topicDraft, { id: "hero-2", name: "Ari" }, false, NOW, "theirs")];
    const { posting } = rig({ store });

    expect(posting.waiting.value.map((post) => post.id)).toEqual(["mine"]);
  });
});

describe("sending a draft", () => {
  it("keeps the draft for the hero, closes the compose, sends the queue and says where the post goes", async () => {
    const { posting, store, reveal } = rig();
    posting.openTopic("feature-requests");

    const done = posting.sendDraft(topicDraft);
    await flushPromises();

    expect(store.submit).toHaveBeenCalledWith(topicDraft, HERO, false, "/hometown/town-hall/hero-1");
    expect(posting.composeOpen.value).toBe(false);
    expect(store.flush).toHaveBeenCalledTimes(1);
    expect(reveal.asked).toEqual([postedNotice("to-gm")]);
    reveal.answer();
    await done;
    expect(posting.sending.value).toBe(false);
    expect(reveal.asked).toHaveLength(1);
  });

  it("starts sending while the clerk is still talking", async () => {
    const { posting, store, reveal } = rig();
    posting.openBug();

    const done = posting.sendDraft(bugDraft);
    await flushPromises();

    expect(reveal.prompt.value).not.toBeNull();
    expect(store.flush).toHaveBeenCalledTimes(1);
    reveal.answer();
    await done;
  });

  it("keeps one post when the hero taps Send twice", async () => {
    const { posting, store, reveal } = rig();
    posting.openBug();

    const first = posting.sendDraft(bugDraft);
    const second = posting.sendDraft(bugDraft);
    await flushPromises();
    reveal.answer();
    await Promise.all([first, second]);

    expect(store.submit).toHaveBeenCalledTimes(1);
    expect(store.flush).toHaveBeenCalledTimes(1);
    expect(store.posts).toHaveLength(1);
  });

  it("tells a registered Game Master their topic goes to the site, and a family without a link that it is on file", async () => {
    const linked = rig({ isGameMaster: true });
    linked.posting.openTopic("feature-requests");
    const first = linked.posting.sendDraft(topicDraft);
    await flushPromises();
    expect(linked.reveal.asked).toEqual([postedNotice("to-site")]);
    linked.reveal.answer();
    await first;

    const unlinkedStore = fakeStore();
    unlinkedStore.isLinked = false;
    const hero = rig({ store: unlinkedStore });
    hero.posting.openBug();
    const second = hero.posting.sendDraft(bugDraft);
    await flushPromises();
    expect(hero.reveal.asked).toEqual([postedNotice("on-file-hero")]);
    hero.reveal.answer();
    await second;
  });

  it("asks the family to register again, after the post's notice, when the site turned the link away", async () => {
    const store = fakeStore({ flush: jest.fn(async () => ({ sent: 0, unlinked: true, forbidden: false })) });
    const { posting, reveal } = rig({ store });
    posting.openBug();

    const done = posting.sendDraft(bugDraft);
    await flushPromises();
    expect(reveal.asked).toEqual([postedNotice("bug")]);
    reveal.answer();
    await flushPromises();
    expect(reveal.asked).toEqual([postedNotice("bug"), registerAgainPrompt()]);
    reveal.answer();
    await done;
  });

  it("says the registration is not finished, and lets a Game Master redo it", async () => {
    const store = fakeStore({ flush: jest.fn(async () => ({ sent: 0, unlinked: false, forbidden: true })) });
    const { posting, reveal, redo } = rig({ store, isGameMaster: true });
    posting.openBug();

    const done = posting.sendDraft(bugDraft);
    await flushPromises();
    reveal.answer();
    await flushPromises();
    expect(reveal.asked[1]).toEqual(forbiddenPrompt(true));
    reveal.answer("redo");
    await done;

    expect(redo).toHaveBeenCalledTimes(1);
  });

  it("sends a hero to the Game Master when the account may not post, and does nothing else", async () => {
    const store = fakeStore({ flush: jest.fn(async () => ({ sent: 0, unlinked: false, forbidden: true })) });
    const { posting, reveal, redo } = rig({ store });
    posting.openBug();

    const done = posting.sendDraft(bugDraft);
    await flushPromises();
    reveal.answer();
    await flushPromises();
    expect(reveal.asked[1]).toEqual(forbiddenPrompt(false));
    reveal.answer();
    await done;

    expect(redo).not.toHaveBeenCalled();
  });

  it("says only that the family must register again when the link went and the account was also refused", async () => {
    const store = fakeStore({ flush: jest.fn(async () => ({ sent: 0, unlinked: true, forbidden: true })) });
    const { posting, reveal } = rig({ store });
    posting.openBug();

    const done = posting.sendDraft(bugDraft);
    await flushPromises();
    reveal.answer();
    await flushPromises();
    reveal.answer();
    await done;

    expect(reveal.asked).toEqual([postedNotice("bug"), registerAgainPrompt()]);
  });

  it("logs a flush that fails to load or save and carries on", async () => {
    const store = fakeStore({ flush: jest.fn(async () => Promise.reject(new Error("disk full"))) });
    const { posting, reveal } = rig({ store });
    posting.openBug();

    const done = posting.sendDraft(bugDraft);
    await flushPromises();
    reveal.answer();
    await done;

    expect(mockLogged).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ message: "disk full" }));
    expect(reveal.asked).toHaveLength(1);
  });

  it("keeps the compose open with the reason when the post could not be kept", async () => {
    const store = fakeStore({ submit: jest.fn(async () => ({ problem: "Write something first." })) });
    const { posting, reveal } = rig({ store });
    posting.openBug();

    await posting.sendDraft(bugDraft);

    expect(posting.composeOpen.value).toBe(true);
    expect(posting.trouble.value).toBe("Write something first.");
    expect(posting.sending.value).toBe(false);
    expect(store.flush).not.toHaveBeenCalled();
    expect(reveal.ask).not.toHaveBeenCalled();
  });

  it("keeps the compose open, and Send alive, when the device could not save the post", async () => {
    const store = fakeStore({ submit: jest.fn(async () => Promise.reject(new Error("storage"))) });
    const { posting } = rig({ store });
    posting.openBug();

    await posting.sendDraft(bugDraft);

    expect(posting.composeOpen.value).toBe(true);
    expect(posting.trouble.value).toBe("That didn't save. Try again.");
    expect(posting.sending.value).toBe(false);
    expect(mockLogged).toHaveBeenCalled();
    await posting.sendDraft(bugDraft);
    expect(store.submit).toHaveBeenCalledTimes(2);
  });

  it("clears an old trouble when the compose opens again", async () => {
    const store = fakeStore({ submit: jest.fn(async () => ({ problem: "Nope" })) });
    const { posting } = rig({ store });
    posting.openBug();
    await posting.sendDraft(bugDraft);

    posting.openBug();

    expect(posting.trouble.value).toBeNull();
  });
});

describe("editing a failed post", () => {
  it("gives the post its new words, closes the compose and says where it goes", async () => {
    const store = fakeStore();
    const failed: TownHallPost = { ...newPost(topicDraft, HERO, false, NOW, "f-1"), status: "failed", error: "Nope" };
    store.posts = [failed];
    store.resubmit = jest.fn(async (id: string, draft: PostDraft) => {
      store.posts = [{ ...newPost(draft, HERO, false, NOW, id) }];
      return null;
    });
    const { posting, reveal } = rig({ store });
    posting.openEdit(failed);

    const done = posting.sendDraft({ ...topicDraft, title: "Better" });
    await flushPromises();

    expect(store.resubmit).toHaveBeenCalledWith("f-1", { ...topicDraft, title: "Better" }, false);
    expect(store.submit).not.toHaveBeenCalled();
    expect(posting.composeOpen.value).toBe(false);
    expect(store.flush).toHaveBeenCalledTimes(1);
    expect(reveal.asked).toEqual([postedNotice("to-gm")]);
    reveal.answer();
    await done;
  });

  it("keeps the compose open when the new words are not taken", async () => {
    const store = fakeStore({ resubmit: jest.fn(async () => "Give it a title.") });
    const { posting } = rig({ store });
    posting.openEdit({ ...newPost(topicDraft, HERO, false, NOW, "f-1"), status: "failed" });

    await posting.sendDraft(topicDraft);

    expect(posting.composeOpen.value).toBe(true);
    expect(posting.trouble.value).toBe("Give it a title.");
  });
});

describe("clearing a post from the list", () => {
  it("asks the store, and logs a failure instead of crashing", async () => {
    const store = fakeStore({ dismiss: jest.fn(async () => Promise.reject(new Error("storage"))) });
    const { posting } = rig({ store });

    await posting.dismissPost("p-1");

    expect(store.dismiss).toHaveBeenCalledWith("p-1");
    expect(mockLogged).toHaveBeenCalled();
  });
});

describe("sending the queue on its own (opening the Town Hall, coming back online, linking)", () => {
  it("sends the queue and stays quiet when all is well", async () => {
    const { posting, store, reveal } = rig();

    await posting.sendQueue();

    expect(store.flush).toHaveBeenCalledTimes(1);
    expect(reveal.ask).not.toHaveBeenCalled();
  });

  it("logs a flush that fails to load or save instead of crashing", async () => {
    const store = fakeStore({ flush: jest.fn(async () => Promise.reject(new Error("disk full"))) });
    const { posting } = rig({ store });

    await expect(posting.sendQueue()).resolves.toBeUndefined();

    expect(mockLogged).toHaveBeenCalled();
  });

  it("tells the family once when two callers share one flush", async () => {
    const answer: FlushResult = { sent: 0, unlinked: true, forbidden: false };
    const store = fakeStore({ flush: jest.fn(async () => answer) });
    const { posting, reveal } = rig({ store });

    const both = Promise.all([posting.sendQueue(), posting.sendQueue()]);
    await flushPromises();
    expect(reveal.asked).toEqual([registerAgainPrompt()]);
    reveal.answer();
    await both;

    expect(reveal.ask).toHaveBeenCalledTimes(1);
  });

  it("tells the family once when the post that was just sent shares the flush", async () => {
    const answer: FlushResult = { sent: 0, unlinked: true, forbidden: false };
    const store = fakeStore({ flush: jest.fn(async () => answer) });
    const { posting, reveal } = rig({ store });
    posting.openBug();

    const settling = posting.sendQueue();
    const sending = posting.sendDraft(bugDraft);
    await flushPromises();
    // Whoever asks first, the posted notice is not cut off and the news comes after it, once
    reveal.answer();
    await flushPromises();
    reveal.answer();
    await Promise.all([settling, sending]);

    const told = reveal.asked.filter((prompt) => prompt.lines[0] === registerAgainPrompt().lines[0]);
    expect(told).toHaveLength(1);
  });

  describe("a slow flush that settles after the posted notice was answered", () => {
    const slowFlush = () => {
      let finish: (result: FlushResult) => void = () => undefined;
      const flush = jest.fn(() => new Promise<FlushResult>((resolve) => (finish = resolve)));
      return { flush, finish: (result: FlushResult) => finish(result) };
    };
    const TURNED_AWAY: FlushResult = { sent: 0, unlinked: true, forbidden: false };

    /** The hero sent a bug report and has answered the clerk's notice; the flush is still out */
    const sentAndAnswered = async () => {
      const slow = slowFlush();
      const desk = rig({ store: fakeStore({ flush: slow.flush }) });
      desk.posting.openBug();
      const sending = desk.posting.sendDraft(bugDraft);
      await flushPromises();
      desk.reveal.answer();
      await flushPromises();
      return { ...desk, slow, sending };
    };

    it("holds the news while the hero has another prompt open, then gives it once", async () => {
      const { posting, reveal, slow, sending } = await sentAndAnswered();
      const menu = posting.openClerkMenu();
      await flushPromises();

      slow.finish(TURNED_AWAY);
      await sending;
      expect(reveal.asked).toEqual([postedNotice("bug"), clerkMenuPrompt(false, "adventure")]);

      reveal.answer("never");
      await menu;
      await flushPromises();
      expect(reveal.asked.slice(2)).toEqual([registerAgainPrompt()]);
      reveal.answer();
      await flushPromises();
      expect(reveal.ask).toHaveBeenCalledTimes(3);
    });

    it("holds the news while the hero writes another post, then gives it once", async () => {
      const { posting, reveal, slow, sending } = await sentAndAnswered();
      posting.openBug();

      slow.finish(TURNED_AWAY);
      await sending;
      expect(reveal.asked).toEqual([postedNotice("bug")]);

      posting.closeCompose();
      await nextTick();
      await flushPromises();
      expect(reveal.asked).toEqual([postedNotice("bug"), registerAgainPrompt()]);
      reveal.answer();
      await flushPromises();
      expect(reveal.ask).toHaveBeenCalledTimes(2);
    });

    it("gives the news at once when the way is clear", async () => {
      const { reveal, slow, sending } = await sentAndAnswered();

      slow.finish(TURNED_AWAY);
      await flushPromises();
      expect(reveal.asked).toEqual([postedNotice("bug"), registerAgainPrompt()]);
      reveal.answer();
      await sending;
    });
  });

  it("tells the family again when a later flush brings the news again", async () => {
    const store = fakeStore({ flush: jest.fn(async () => ({ sent: 0, unlinked: true, forbidden: false })) });
    const { posting, reveal } = rig({ store });

    const first = posting.sendQueue();
    await flushPromises();
    reveal.answer();
    await first;
    const second = posting.sendQueue();
    await flushPromises();
    reveal.answer();
    await second;

    expect(reveal.ask).toHaveBeenCalledTimes(2);
  });

  it("waits for the clerk to finish talking, then gives the news", async () => {
    const store = fakeStore({ flush: jest.fn(async () => ({ sent: 0, unlinked: true, forbidden: false })) });
    const { posting, reveal } = rig({ store });
    reveal.prompt.value = { speaker: "Town Clerk", lines: ["Something else"], choices: [] };

    await posting.sendQueue();
    expect(reveal.ask).not.toHaveBeenCalled();

    reveal.prompt.value = null;
    await nextTick();
    await flushPromises();

    expect(reveal.asked).toEqual([registerAgainPrompt()]);
    reveal.answer();
  });

  it("waits for an open compose to close before giving the news", async () => {
    const store = fakeStore({ flush: jest.fn(async () => ({ sent: 0, unlinked: false, forbidden: true })) });
    const { posting, reveal } = rig({ store });
    posting.openBug();

    await posting.sendQueue();
    expect(reveal.ask).not.toHaveBeenCalled();

    posting.closeCompose();
    await nextTick();
    await flushPromises();

    expect(reveal.asked).toEqual([forbiddenPrompt(false)]);
    reveal.answer();
  });
});

describe("coming back online", () => {
  it("sends the queue each time the browser says it is online, until the page goes", async () => {
    const { store, wrapper } = rig();

    window.dispatchEvent(new Event("online"));
    await flushPromises();
    expect(store.flush).toHaveBeenCalledTimes(1);

    wrapper.unmount();
    window.dispatchEvent(new Event("online"));
    await flushPromises();
    expect(store.flush).toHaveBeenCalledTimes(1);
  });
});

describe("a Game Master who opens the Town Hall with posts waiting and no registration", () => {
  const waitingStore = (over: { isLinked?: boolean; statuses?: TownHallPost["status"][] } = {}) => {
    const store = fakeStore();
    store.isLinked = over.isLinked ?? false;
    store.posts = (over.statuses ?? ["queued"]).map((status, i) => ({ ...newPost(bugDraft, HERO, true, NOW + i, `w-${i}`), status }));
    return store;
  };

  it("is offered Family Registration by the clerk, and 'Family Registration' starts it", async () => {
    const desk = rig({ store: waitingStore(), isGameMaster: true });

    const offering = desk.posting.offerRegistration();
    await flushPromises();
    expect(desk.reveal.asked).toEqual([unregisteredOutboxPrompt()]);
    desk.reveal.answer("registration");
    await offering;

    expect(desk.register).toHaveBeenCalledTimes(1);
  });

  it("is offered it once per visit", async () => {
    const desk = rig({ store: waitingStore(), isGameMaster: true });
    const first = desk.posting.offerRegistration();
    await flushPromises();
    desk.reveal.answer("never");
    await first;

    await desk.posting.offerRegistration();

    expect(desk.reveal.asked).toHaveLength(1);
    expect(desk.register).not.toHaveBeenCalled();
  });

  it("is not asked when the device is registered, when nothing waits to be sent, or when the clerk is already talking", async () => {
    const linked = rig({ store: waitingStore({ isLinked: true }), isGameMaster: true });
    await linked.posting.offerRegistration();
    expect(linked.reveal.asked).toHaveLength(0);

    const onlyAwaiting = rig({ store: waitingStore({ statuses: ["awaiting-gm", "rejected", "failed", "sent"] }), isGameMaster: true });
    await onlyAwaiting.posting.offerRegistration();
    expect(onlyAwaiting.reveal.asked).toHaveLength(0);

    const busy = rig({ store: waitingStore(), isGameMaster: true });
    busy.reveal.prompt.value = clerkMenuPrompt(true);
    await busy.posting.offerRegistration();
    expect(busy.reveal.asked).toHaveLength(0);
  });

  it("is never something a hero is asked", async () => {
    const hero = rig({ store: waitingStore(), isGameMaster: false });
    await hero.posting.offerRegistration();
    expect(hero.reveal.asked).toHaveLength(0);
  });
});
