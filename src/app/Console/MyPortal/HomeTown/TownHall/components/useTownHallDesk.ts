import { reactive, ref, type Ref } from "vue";
import type { RevealPromptOptions } from "@/components/organisms/RevealPrompt/revealPrompt";
import { binPrompt, courierLatePrompt, keysTakenNotice } from "@/lib/services/hometown/hometownPrompts";
import { townHallFetch, TownHallError, type TownHallAuth } from "@/lib/services/townhall/townHallClient";
import {
  approveCommentRequest,
  createNewsRequest,
  publishRequest,
  resolveBugRequest,
  saveRequest,
  trashRequest,
  waitingTotal,
  type DeskItemType,
  type DeskRequest,
  type EditableType,
  type NewsDraft,
  type Words,
} from "@/lib/services/townhall/townHallDesk";
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
import debug from "@/lib/utils/debug";
import { isCourierTrouble } from "./useTownHallLoad";

/** What the desk needs of the Town Hall store (the Pinia store fits; the specs bring a fake). */
export interface DeskStore {
  auth: TownHallAuth;
  canPublish: boolean;
  canModerate: boolean;
  dropPowers(): Promise<void>;
}

export interface DeskDeps {
  store: DeskStore;
  /** The clerk's dialog: `showPrompt` shows a prompt and answers with the choice picked */
  reveal: { showPrompt(options: RevealPromptOptions): Promise<string>; prompt: Ref<unknown> };
}

/** Every admin action the desk offers; each answers whether the site took it. */
export interface DeskActions {
  publish(type: EditableType, id: number): Promise<boolean>;
  bin(type: DeskItemType, id: number, published: boolean): Promise<boolean>;
  approve(commentId: number): Promise<boolean>;
  resolve(bugId: number): Promise<boolean>;
  isBusy(type: DeskItemType, id: number): boolean;
  /** The site's complaint about the last try on this item, or null */
  troubleOf(type: DeskItemType, id: number): string | null;
}

/** A link without a desk (a hero's) has no tools to show; this keeps a tab's template from asking whether there is one */
export const NO_DESK: DeskActions = {
  publish: async () => false,
  bin: async () => false,
  approve: async () => false,
  resolve: async () => false,
  isBusy: () => false,
  troubleOf: () => null,
};

/** The lists the desk reads off the site and the badge's number. */
export interface DeskState {
  heldComments: Ref<HeldComment[]>;
  bugs: Ref<BugItem[]>;
  waitingCount: Ref<number>;
  patchNotesAvailable: Ref<boolean>;
}

/** The desk's writers: a new news post, an edit, and a read of the words an edit starts from. */
export interface DeskWriter {
  /** The problem in words, or null when the site took the post */
  createNews(draft: NewsDraft): Promise<string | null>;
  /** The problem in words, or null when the site took the new words */
  saveEdit(target: { type: EditableType; id: number }, words: Words): Promise<string | null>;
  /** The title and body as they were typed, or null when the site could not be reached */
  readWords(type: EditableType, id: number): Promise<Words | null>;
}

/** The desk in three parts: what it read (`state`), what the tabs can do (`actions`, with `refresh`) and the writers. */
export type TownHallDesk = {
  state: DeskState;
  actions: DeskActions & { refresh(): Promise<void> };
  writer: DeskWriter;
};

/** How a call to the site ended: taken, or not (with the site's own words when it gave a reason). */
type Outcome = { ok: true } | { ok: false; message?: string };

/** A try that ended with the courier late: the clerk still has to ask. */
const LATE = "late";

const DIDNT_REACH = "That didn't reach the site. Try again.";
const NEWS_KEY = "news:new";

const keyOf = (type: DeskItemType, id: number): string => `${type}:${id}`;

const problemOf = (outcome: Outcome): string | null => {
  if (outcome.ok) return null;
  return outcome.message ?? DIDNT_REACH;
};

/**
 * The administrator's desk at the Town Hall: one call per action (publish, bin, approve, resolve, write news, save an
 * edit), the lists of held comments and open bugs, and the number on the desk's badge. Every action runs through one
 * `act`, so the busy, refused, courier-late and invalid rules live once.
 */
export function useTownHallDesk(deps: DeskDeps): TownHallDesk {
  const { store, reveal } = deps;

  const heldComments = ref<HeldComment[]>([]);
  const bugs = ref<BugItem[]>([]);
  const waitingCount = ref(0);
  const patchNotesAvailable = ref(false);

  const busy = reactive<Record<string, boolean>>({});
  const troubles = reactive<Record<string, string>>({});

  const isBusy = (type: DeskItemType, id: number): boolean => busy[keyOf(type, id)] === true;
  const troubleOf = (type: DeskItemType, id: number): string | null => troubles[keyOf(type, id)] ?? null;

  /** What a failed call comes to: the keys taken back (the clerk says so), a late courier, a complaint or nothing to say. */
  const failedWith = async (error: unknown): Promise<Outcome | typeof LATE> => {
    const isRefusal = error instanceof TownHallError && error.code === "forbidden";
    if (isRefusal) {
      await store.dropPowers();
      await reveal.showPrompt(keysTakenNotice());
      return { ok: false };
    }
    if (isCourierTrouble(error)) return LATE;
    const isComplaint = error instanceof TownHallError && error.code === "invalid";
    if (isComplaint) return { ok: false, message: error.message };
    // Unauthorized is the store's own to handle at the next flush; anything else is not the site's doing.
    const isUnauthorized = error instanceof TownHallError && error.code === "unauthorized";
    if (!isUnauthorized) debug.error("Town Hall desk call failed:", error);
    return { ok: false };
  };

  const send = async (request: DeskRequest): Promise<Outcome | typeof LATE> => {
    try {
      await townHallFetch<unknown>(request.path, { auth: store.auth, method: request.method, body: request.body });
      return { ok: true };
    } catch (error) {
      return failedWith(error);
    }
  };

  /** A late courier gets one more try if the admin asks, never a loop. */
  const sendOrAsk = async (request: DeskRequest): Promise<Outcome | typeof LATE> => {
    const first = await send(request);
    const wasLate = first === LATE;
    if (!wasLate) return first;
    const choice = await reveal.showPrompt(courierLatePrompt());
    const isRetry = choice === "retry";
    if (!isRetry) return { ok: false };
    return send(request);
  };

  /** The one door every action goes through. */
  const act = async (request: DeskRequest, key: string): Promise<Outcome> => {
    if (busy[key]) return { ok: false };
    busy[key] = true;
    delete troubles[key];
    try {
      const outcome = await sendOrAsk(request);
      const isLate = outcome === LATE;
      if (isLate) return { ok: false };
      if (outcome.ok) return outcome;
      const { message } = outcome;
      const hasMessage = message !== undefined;
      if (hasMessage) troubles[key] = message;
      return outcome;
    } finally {
      delete busy[key];
    }
  };

  const countOneFewer = (): void => {
    waitingCount.value = Math.max(0, waitingCount.value - 1);
  };

  /** A comment or bug the site has dealt with leaves its list, and the badge counts one fewer. */
  const takeOff = <T extends { id: number }>(list: Ref<T[]>, id: number): void => {
    const isListed = list.value.some((item) => item.id === id);
    if (!isListed) return;
    list.value = list.value.filter((item) => item.id !== id);
    countOneFewer();
  };

  /** What the badge and the lists show once the site has binned an item. A published post or topic was not waiting. */
  const settleBinned = (type: DeskItemType, id: number, published: boolean): void => {
    const isComment = type === "comment";
    if (isComment) takeOff(heldComments, id);
    const isBug = type === "bug";
    if (isBug) takeOff(bugs, id);
    const isDraftOrTopic = type === "post" || type === "topic";
    const wasWaiting = isDraftOrTopic && !published;
    if (wasWaiting) countOneFewer();
  };

  /** A draft or a held topic that goes up is no longer waiting. */
  const publish = async (type: EditableType, id: number): Promise<boolean> => {
    const outcome = await act(publishRequest(type, id), keyOf(type, id));
    if (outcome.ok) countOneFewer();
    return outcome.ok;
  };

  const bin = async (type: DeskItemType, id: number, published: boolean): Promise<boolean> => {
    if (isBusy(type, id)) return false;
    if (published) {
      const choice = await reveal.showPrompt(binPrompt());
      const isTakeDown = choice === "take-down";
      if (!isTakeDown) return false;
    }
    const outcome = await act(trashRequest(type, id), keyOf(type, id));
    if (outcome.ok) settleBinned(type, id, published);
    return outcome.ok;
  };

  const approve = async (commentId: number): Promise<boolean> => {
    const outcome = await act(approveCommentRequest(commentId), keyOf("comment", commentId));
    if (outcome.ok) takeOff(heldComments, commentId);
    return outcome.ok;
  };

  const resolve = async (bugId: number): Promise<boolean> => {
    const outcome = await act(resolveBugRequest(bugId), keyOf("bug", bugId));
    if (outcome.ok) takeOff(bugs, bugId);
    return outcome.ok;
  };

  /** A read that failed counts as nothing; the courier being late is not worth a log line. */
  const noteFailedRead = (error: unknown): void => {
    if (isCourierTrouble(error)) return;
    debug.error("Town Hall could not read the site:", error);
  };

  const readOrNull = async <T>(isAllowed: boolean, read: () => Promise<T>): Promise<T | null> => {
    if (!isAllowed) return null;
    try {
      return await read();
    } catch (error) {
      noteFailedRead(error);
      return null;
    }
  };

  const refresh = async (): Promise<void> => {
    const { canPublish, canModerate } = store;
    const hasDesk = canPublish || canModerate;
    if (!hasDesk) {
      heldComments.value = [];
      bugs.value = [];
      waitingCount.value = 0;
      patchNotesAvailable.value = false;
      return;
    }
    const req = { auth: store.auth };
    const [drafts, topics, openBugs, patchNotesId, held] = await Promise.all([
      readOrNull(canPublish, () => countDrafts(req)),
      readOrNull(canPublish, () => countPendingTopics(req)),
      readOrNull(canPublish, () => fetchBugs(req)),
      readOrNull(canPublish, () => patchNotesCategoryId(req)),
      readOrNull(canModerate, () => fetchHeldComments(req)),
    ]);
    heldComments.value = held?.items ?? [];
    bugs.value = openBugs ?? [];
    patchNotesAvailable.value = typeof patchNotesId === "number";
    waitingCount.value = waitingTotal({ drafts, topics, held: held?.total ?? null, bugs: openBugs?.length ?? null });
  };

  /** The request for a news post, or the problem in words: the site has no Patch Notes, or the courier is late. */
  const newsRequestOrProblem = async (draft: NewsDraft): Promise<DeskRequest | string> => {
    let patchNotesId: number | null = null;
    const isPatchNotes = draft.category === "patch-notes";
    if (isPatchNotes) {
      try {
        patchNotesId = await patchNotesCategoryId({ auth: store.auth });
      } catch (error) {
        noteFailedRead(error);
        return DIDNT_REACH;
      }
    }
    try {
      return createNewsRequest(draft, patchNotesId);
    } catch (error) {
      return error instanceof Error ? error.message : DIDNT_REACH;
    }
  };

  const createNews = async (draft: NewsDraft): Promise<string | null> => {
    const built = await newsRequestOrProblem(draft);
    const isProblem = typeof built === "string";
    if (isProblem) return built;
    return problemOf(await act(built, NEWS_KEY));
  };

  const saveEdit = async (target: { type: EditableType; id: number }, words: Words): Promise<string | null> => {
    const outcome = await act(saveRequest(target.type, target.id, words), keyOf(target.type, target.id));
    return problemOf(outcome);
  };

  /** One read of the words: what was typed, a late courier, or null for anything else (a refusal is told as `act` does). */
  const readWordsOnce = async (type: EditableType, id: number): Promise<Words | typeof LATE | null> => {
    try {
      return await fetchWords(type, id, { auth: store.auth });
    } catch (error) {
      const outcome = await failedWith(error);
      const wasLate = outcome === LATE;
      return wasLate ? LATE : null;
    }
  };

  /** A late courier gets one more read if the admin asks, never a loop. */
  const readWords = async (type: EditableType, id: number): Promise<Words | null> => {
    const first = await readWordsOnce(type, id);
    const wasLate = first === LATE;
    if (!wasLate) return first;
    const choice = await reveal.showPrompt(courierLatePrompt());
    const isRetry = choice === "retry";
    if (!isRetry) return null;
    const second = await readWordsOnce(type, id);
    const isStillLate = second === LATE;
    return isStillLate ? null : second;
  };

  return {
    state: { heldComments, bugs, waitingCount, patchNotesAvailable },
    actions: { refresh, publish, bin, approve, resolve, isBusy, troubleOf },
    writer: { createNews, saveEdit, readWords },
  };
}
