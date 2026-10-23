import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from "vue";
import type { RevealPromptOptions } from "@/components/organisms/RevealPrompt/revealPrompt";
import { useVoice } from "@/hooks/useVoice";
import {
  clerkMenuPrompt,
  deskNotice,
  forbiddenPrompt,
  postedNotice,
  registerAgainPrompt,
  type DeskOutcome,
} from "@/lib/services/hometown/hometownPrompts";
import type {
  ComposeDraft,
  ComposeKind,
  ComposeWords,
  EditableType,
  EditDraft,
  NewsCategory,
  NewsDraft,
  Words,
} from "@/lib/services/townhall/townHallDesk";
import { postedOutcome, waitingFor } from "@/lib/services/townhall/townHallOutbox";
import type { PostDraft } from "@/lib/services/townhall/townHallPosts";
import { TOWN_HALL_BOARDS, type TownHallBoardSlug } from "@/lib/services/townhall/townHallSite";
import type { TownHallPost } from "@/lib/services/townhall/townHallTypes";
import type { FlushResult } from "@/lib/store/stores/townHall";
import debug from "@/lib/utils/debug";
import type { CommentTarget } from "./townHallShared";

/** What the posting desk needs of the Town Hall store (the Pinia store fits; the specs bring a fake). */
export interface PostingStore {
  isLinked: boolean;
  /** The link may publish on the site: the one source for the clerk's menu and for what the clerk says of a kept post */
  canPublish: boolean;
  posts: TownHallPost[];
  submit(
    draft: PostDraft,
    hero: { id: string; name: string },
    isGameMaster: boolean,
    route: string,
  ): Promise<{ problem: string | null; post?: TownHallPost }>;
  resubmit(id: string, draft: PostDraft, isGameMaster: boolean): Promise<string | null>;
  dismiss(id: string): Promise<void>;
  flush(): Promise<FlushResult>;
}

export interface PostingDeps {
  store: PostingStore;
  /** The clerk's dialog: `ask` shows a prompt and answers with the choice picked; `prompt` is the one showing, if any */
  reveal: { showPrompt(options: RevealPromptOptions): Promise<string>; prompt: Ref<unknown> };
  userId(): string;
  /** What the hero signs with on the public site: a nickname of their own, never their real name (`signingName`) */
  heroName(): string;
  isGameMaster(): boolean;
  /** Where the hero is now, for a bug report */
  route(): string;
  /** The board the hero is looking at: a topic starts there */
  currentBoard(): TownHallBoardSlug;
  /** The clerk's registration errand (a Game Master's) */
  registerFamily(): Promise<void>;
  /** A Game Master said yes to redoing a registration that is not finished */
  redoRegistration(): Promise<void>;
  /** The administrator's desk: what the writers send to, and what an edit reads from */
  desk: {
    createNews(draft: NewsDraft): Promise<string | null>;
    saveEdit(target: SiteEditTarget, words: Words): Promise<string | null>;
    readWords(type: EditableType, id: number): Promise<Words | null>;
    /** Something on the site changed: the tab that shows it reloads */
    changed(what: NewsCategory | EditableType): void;
  };
}

/** A post or topic on the site that the administrator rewrites. */
export type SiteEditTarget = { type: EditableType; id: number };

/** What the compose is opened for: the same fields as the sheet's props, and the failed post being edited, if any. */
export interface ComposeSpec {
  kind: ComposeKind;
  board?: TownHallBoardSlug;
  postId?: number;
  replyingTo?: string;
  initial?: ComposeWords;
  editingId?: string;
  /** News: which category the sheet writes for */
  newsCategory?: NewsCategory;
  /** An edit: the post or topic on the site whose words are being rewritten */
  editing?: SiteEditTarget;
}

const SAVE_TROUBLE = "That didn't save. Try again.";

const boardSlugOf = (board: string | undefined): TownHallBoardSlug | undefined => TOWN_HALL_BOARDS.find((slug) => slug === board);

/**
 * The Town Hall's clerk's counter: the clerk's menu, the compose sheet's state, keeping a draft for the hero, sending the
 * queue (after a post, on opening, on coming back online, on linking) and telling the family when the site turns it away.
 * One flush is shared by everyone who asks while it runs, so the news about it is given once, and never over a talking
 * clerk or an open sheet.
 */
export function useTownHallPosting(deps: PostingDeps) {
  const { store, reveal } = deps;
  const { voice } = useVoice();

  const composeSpec = ref<ComposeSpec | null>(null);
  const composeOpen = ref(false);
  const sending = ref(false);
  /** What stopped the draft from being kept; the sheet shows it under the message */
  const trouble = ref<string | null>(null);

  const waiting = computed(() => waitingFor(store.posts, deps.userId()));

  const open = (spec: ComposeSpec) => {
    composeSpec.value = spec;
    trouble.value = null;
    composeOpen.value = true;
  };

  const openTopic = (board?: TownHallBoardSlug) => open({ kind: "topic", ...(board ? { board } : {}) });
  const openComment = (target: CommentTarget) => open({ kind: "comment", postId: target.postId, replyingTo: target.title });
  const openBug = () => open({ kind: "bug" });
  const openNews = (category: NewsCategory) => open({ kind: "news", newsCategory: category });

  /** An administrator rewrites a post or topic: the sheet opens with its words, or not at all when the site would not give them */
  const openSiteEdit = async (target: SiteEditTarget): Promise<void> => {
    const words = await deps.desk.readWords(target.type, target.id);
    if (!words) return;
    open({ kind: "edit", editing: target, initial: { title: words.title, body: words.body } });
  };

  /** A failed post comes back to the sheet with its words, to be fixed and sent again */
  const openEdit = (post: TownHallPost) => {
    const board = boardSlugOf(post.board);
    open({
      kind: post.kind,
      ...(board ? { board } : {}),
      ...(post.postId !== undefined ? { postId: post.postId } : {}),
      editingId: post.id,
      initial: {
        body: post.body,
        ...(post.title !== undefined ? { title: post.title } : {}),
        ...(board ? { board } : {}),
        ...(post.postId !== undefined ? { postId: post.postId } : {}),
      },
    });
  };

  const closeCompose = () => {
    composeOpen.value = false;
  };

  /**
   * The clerk asks what to do at the board: post (on the board the hero is looking at), report a bug, see to the
   * registration, or, for a link that can publish, write news or a patch note
   */
  const openClerkMenu = async (): Promise<void> => {
    const pick = await reveal.showPrompt(clerkMenuPrompt(deps.isGameMaster(), voice.value, store.canPublish));
    const wantsRegistration = pick === "registration";
    if (wantsRegistration) await deps.registerFamily();
    const wantsBoard = pick === "board";
    if (wantsBoard) openTopic(deps.currentBoard());
    const wantsBugReport = pick === "bug";
    if (wantsBugReport) openBug();
    const wantsNews = pick === "write-news";
    if (wantsNews) openNews("news");
    const wantsPatchNote = pick === "write-patch-note";
    if (wantsPatchNote) openNews("patch-notes");
  };

  // --- Sending the queue --------------------------------------------------------------------------------------

  /** Send the queue. Nothing here rejects: a failure to load or save the stored posts is logged and nothing else happens. */
  const flushNow = async (): Promise<FlushResult | null> => {
    try {
      return await store.flush();
    } catch (error) {
      debug.error("Town Hall could not send the waiting posts:", error);
      return null;
    }
  };

  /** The last flush result the family was told about: callers that shared a flush share its result, so it is told once */
  let toldAbout: FlushResult | null = null;
  /** News that came while the clerk was talking or a sheet was open: given when the way is clear */
  let untold: FlushResult | null = null;

  const hasNews = (result: FlushResult | null): result is FlushResult =>
    result !== null && result !== toldAbout && (result.unlinked || result.forbidden);

  /**
   * The site turned the family away: the link was given up (register again), or the account may not post (a Game Master
   * may redo the registration). A link given up says it all; the refusal behind it would only repeat the trouble.
   */
  const tellAboutFlush = async (result: FlushResult | null): Promise<void> => {
    if (!hasNews(result)) return;
    toldAbout = result;
    try {
      const isUnlinked = result.unlinked;
      if (isUnlinked) {
        await reveal.showPrompt(registerAgainPrompt());
        return;
      }
      const pick = await reveal.showPrompt(forbiddenPrompt(deps.isGameMaster()));
      const wantsRedo = pick === "redo";
      if (wantsRedo) await deps.redoRegistration();
    } catch (error) {
      debug.error("Town Hall could not finish telling about the registration:", error);
    }
  };

  const isBusy = () => reveal.prompt.value !== null || composeOpen.value;

  /**
   * Give the family the news of a flush: now when the clerk is free and no sheet is open, else held until both are (a
   * prompt asked over another one would cancel it, and one asked behind the open sheet would never be read).
   */
  const deliver = async (result: FlushResult | null): Promise<void> => {
    if (!hasNews(result)) return;
    if (isBusy()) {
      untold = result;
      return;
    }
    await tellAboutFlush(result);
  };

  /** Send the queue on the page's own account (opening, coming back online, linking) and deliver the news */
  const sendQueue = async (): Promise<void> => {
    await deliver(await flushNow());
  };

  watch(isBusy, (busy) => {
    const hasNothingToTell = busy || !untold;
    if (hasNothingToTell) return;
    const result = untold;
    untold = null;
    void tellAboutFlush(result);
  });

  const onOnline = () => {
    void sendQueue();
  };
  onMounted(() => window.addEventListener("online", onOnline));
  onBeforeUnmount(() => window.removeEventListener("online", onOnline));

  // --- Keeping a draft ----------------------------------------------------------------------------------------

  /** A new post goes in the outbox; an edited one replaces the failed post it came from */
  const keep = async (spec: ComposeSpec, draft: PostDraft): Promise<{ problem: string | null; post?: TownHallPost }> => {
    const isGameMaster = deps.isGameMaster();
    const editingId = spec.editingId;
    const isNewPost = editingId === undefined;
    if (isNewPost) {
      return store.submit(draft, { id: deps.userId(), name: deps.heroName() }, isGameMaster, deps.route());
    }
    const problem = await store.resubmit(editingId, draft, isGameMaster);

    return { problem, post: store.posts.find((post) => post.id === spec.editingId) };
  };

  // --- Writing at the desk ------------------------------------------------------------------------------------

  const isDeskDraft = (draft: ComposeDraft): draft is NewsDraft | EditDraft => {
    const isNews = draft.kind === "news";
    const isEdit = draft.kind === "edit";
    return isNews || isEdit;
  };

  /** What became of a desk draft, for the clerk's notice: news goes up or is kept as a draft, an edit is saved */
  const outcomeOf = (draft: NewsDraft | EditDraft): DeskOutcome => {
    const isEdit = draft.kind === "edit";
    if (isEdit) return "saved";
    const isPublishedNow = draft.status === "publish";
    return isPublishedNow ? "published" : "drafted";
  };

  /** The desk's answer to a draft: its problem in words, or null when the site took it */
  const sendToDesk = async (spec: ComposeSpec, draft: NewsDraft | EditDraft): Promise<string | null> => {
    const isNews = draft.kind === "news";
    if (isNews) return deps.desk.createNews(draft);
    const editing = spec.editing;
    if (!editing) return SAVE_TROUBLE;
    return deps.desk.saveEdit(editing, { title: draft.title, body: draft.body });
  };

  /**
   * The administrator tapped Send on news or an edit: the desk takes it to the site. A problem leaves the sheet open with
   * the desk's words; otherwise the sheet closes, the clerk says what became of it and the tab it touched reloads.
   */
  const writeAtDesk = async (spec: ComposeSpec, draft: NewsDraft | EditDraft): Promise<void> => {
    sending.value = true;
    trouble.value = null;
    let problem: string | null;
    try {
      problem = await sendToDesk(spec, draft);
    } catch (error) {
      debug.error("Town Hall could not send the desk's words:", error);
      problem = SAVE_TROUBLE;
    } finally {
      sending.value = false;
    }
    if (problem) {
      trouble.value = problem;
      return;
    }
    composeOpen.value = false;
    await reveal.showPrompt(deskNotice(outcomeOf(draft)));
    const isNews = draft.kind === "news";
    const changed = isNews ? draft.category : spec.editing?.type;
    if (changed) deps.desk.changed(changed);
  };

  /**
   * Keep the hero's draft, close the sheet, start sending and say where the post goes next. A draft that cannot be kept
   * leaves the sheet open with the reason.
   */
  const sendPost = async (spec: ComposeSpec, draft: PostDraft): Promise<void> => {
    sending.value = true;
    trouble.value = null;
    let kept: { problem: string | null; post?: TownHallPost };
    try {
      kept = await keep(spec, draft);
    } catch (error) {
      debug.error("Town Hall could not keep the post:", error);
      kept = { problem: SAVE_TROUBLE };
    } finally {
      sending.value = false;
    }
    const problem = kept.problem;
    if (problem) {
      trouble.value = problem;
      return;
    }
    composeOpen.value = false;
    const post = kept.post;
    if (!post) return;
    const flushed = flushNow();
    await reveal.showPrompt(postedNotice(postedOutcome(post, store.isLinked, deps.isGameMaster(), store.canPublish)));
    await deliver(await flushed);
  };

  /**
   * The hero tapped Send: a post is kept in the outbox, news and an edit go to the desk. A second tap while one is being
   * kept, or after the sheet closed, does nothing (a post is kept once).
   */
  const sendDraft = async (draft: ComposeDraft): Promise<void> => {
    const spec = composeSpec.value;
    if (!spec) return;
    const isSheetBusy = !composeOpen.value || sending.value;
    if (isSheetBusy) return;
    if (isDeskDraft(draft)) await writeAtDesk(spec, draft);
    else await sendPost(spec, draft);
  };

  /**
   * A Game Master shares a pack on the Pack Exchange: kept like any post of theirs (no approval to wait for), then sent,
   * and the clerk says where it goes. Returns what stopped it being kept, or null.
   */
  const postPack = async (draft: PostDraft): Promise<string | null> => {
    let kept: { problem: string | null; post?: TownHallPost };
    try {
      kept = await store.submit(draft, { id: deps.userId(), name: deps.heroName() }, deps.isGameMaster(), deps.route());
    } catch (error) {
      debug.error("Town Hall could not keep the pack:", error);
      return SAVE_TROUBLE;
    }
    const { problem, post } = kept;
    if (problem) return problem;
    if (!post) return SAVE_TROUBLE;
    const flushed = flushNow();
    await reveal.showPrompt(postedNotice(postedOutcome(post, store.isLinked, deps.isGameMaster(), store.canPublish)));
    await deliver(await flushed);
    return null;
  };

  /** Clear a post from the list; a failure is logged and the post stays */
  const dismissPost = async (id: string): Promise<void> => {
    try {
      await store.dismiss(id);
    } catch (error) {
      debug.error("Town Hall could not clear the post:", error);
    }
  };

  return {
    composeSpec,
    composeOpen,
    sending,
    trouble,
    waiting,
    openTopic,
    openComment,
    openBug,
    openNews,
    openSiteEdit,
    openEdit,
    closeCompose,
    openClerkMenu,
    sendDraft,
    postPack,
    dismissPost,
    sendQueue,
  };
}
