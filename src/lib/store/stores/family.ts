import { Capacitor } from "@capacitor/core";
import { defineStore } from "pinia";
import { computed, onScopeDispose, ref, watch } from "vue";
import { AchievementDb, achievementStorage } from "@/lib/databases/AchievementDb";
import { getFamilyEventsDb, type FamilyEventsState, type HomeStatus } from "@/lib/databases/FamilyEventsDb";
import { getHeroDeviceDb, type HeroDevice } from "@/lib/databases/HeroDeviceDb";
import { ageGroupOf, type AgeGroup } from "@/lib/services/multiplayer/ageGroup";
import { normalizeCode, phoneLabel } from "@/lib/services/multiplayer/deviceLink";
import { enqueue, resetSending, type QueuedEvent } from "@/lib/services/multiplayer/eventOutbox";
import { questDoneEvent, type FamilyEvent } from "@/lib/services/multiplayer/familyEvents";
import {
  bindFamily,
  claimDevice,
  familyProblem,
  getFamily,
  listPhones,
  makeLinkCode,
  moveHome,
  removeHero,
  removePhone as serverRemovePhone,
  saveHero,
} from "@/lib/services/multiplayer/familyServer";
import type { BindAnswer, FamilyProblem, HeroPhone, LinkCode, ServerHero } from "@/lib/services/multiplayer/familyServer";
import { onHeroRemoved, onQuestPaid, type QuestPaid } from "@/lib/services/multiplayer/gameSignals";
import { cardOf } from "@/lib/services/multiplayer/heroCard";
import { multiplayerEnabled } from "@/lib/services/multiplayer/multiplayerFlag";
import { adoptFamily, ensureIdentity } from "@/lib/services/pro/familyIdentity";
import type { TownHallAuth } from "@/lib/services/townhall/townHallClient";
import { townHallSiteUrl } from "@/lib/services/townhall/townHallSite";
import { useTownHallStore } from "@/lib/store/stores/townHall";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";
import { createCardQueue } from "./family/familyCards";
import { createFamilySender } from "./family/familySender";

/** Where each answer of the site leaves this device: `created` and `home` both mean this device is the family's home */
const HOME_OF_ANSWER: Record<BindAnswer, HomeStatus> = {
  created: "home",
  home: "home",
  "home-elsewhere": "home-elsewhere",
  "other-family": "other-family",
};

/** The record without one key */
const without = <T>(record: Record<string, T>, key: string): Record<string, T> =>
  Object.fromEntries(Object.entries(record).filter(([id]) => id !== key));

/** A hero the site can be told about: a profile with a nickname, and the age group it is registered under */
interface RegistrableHero {
  heroId: string;
  nickname: string;
  ageGroup: AgeGroup;
}

/** Sending waits this long after something is queued, so a burst of events goes in one request */
const SEND_DELAY_MS = 5_000;
/** A profile change queues its card this long after the last change */
const CARDS_DELAY_MS = 2_000;

/** The quest's difficulty for quest.done; 0 when the quest is gone or has none */
const difficultyOf = async (questId: string): Promise<number> => {
  try {
    const quest = (await new AchievementDb(achievementStorage).get(questId)) as { difficulty?: unknown } | null;
    const difficulty = Number(quest?.difficulty);
    const isRated = Number.isFinite(difficulty) && difficulty > 0;
    return isRated ? difficulty : 0;
  } catch (error) {
    debug.warn(`family: could not read quest ${questId}`, error);
    return 0;
  }
};

/**
 * The family on the server, seen from this device (multiplayer, part 1): whether this device is the family's home, the
 * heroes the site holds, and what went wrong last. Nothing in the game waits on it, and with the flag off it does
 * nothing at all.
 *
 * `init()` loads what this device kept and starts the bind without waiting for the site, so a screen that awaits it
 * (a router guard) never waits for the network. `bind()` joins the bind that is running: await it when you need to
 * know `home`.
 *
 * Game events (MP12): while this device is the family's home, each hero's card goes in the send queue when it changes
 * (`queueCards`, also 2 s after any profile change), a level up adds `hero.leveled`, and a paid quest adds `quest.done`.
 * `flush()` sends the queue, one request at a time, 50 events per request; it runs after the start, 5 s after
 * something is queued, when the browser comes back online and when the app comes back to the front. Nothing is queued
 * or sent unless the flag is on and this device is home.
 */
export const useFamilyStore = defineStore("family", () => {
  const townHall = useTownHallStore();

  /** Where this device stands with the family's home; the last answer is kept until the site gives the next one */
  const home = ref<HomeStatus>("unknown");
  /** The heroes the site holds for the family, as of the last registering */
  const heroes = ref<ServerHero[]>([]);
  /** The last thing the site refused or could not do, until a bind goes well */
  const problem = ref<FamilyProblem | null>(null);
  /** heroId -> the age group the Game Master picked, for heroes whose profile has no birthday */
  const ageGroupPicks = ref<Record<string, AgeGroup>>({});
  /** The hero device record when this device is a kid phone */
  const device = ref<HeroDevice | null>(null);
  /** The linked phones for this family (Game Master only) */
  const phones = ref<HeroPhone[]>([]);

  const enabled = computed(() => multiplayerEnabled());
  /** Whether this device is in kid mode (linked as a hero phone) */
  const isKidMode = computed(() => device.value !== null);
  /** The Town Hall's sign-in while the family is linked (or the website hosts the app); no parent powers without it */
  const parentAuth = computed<TownHallAuth | null>(() => (townHall.isLinked ? townHall.auth : null));

  // --- What this device keeps (FamilyEventsDb), changed one save at a time so two saves never overwrite each other ---

  let state: FamilyEventsState | null = null;
  let loading: Promise<void> | null = null;
  let writing: Promise<void> = Promise.resolve();

  function load(): Promise<void> {
    if (!loading) {
      loading = (async () => {
        const stored = await getFamilyEventsDb().getState();
        // An event still marked sending was out when the app closed; its answer was never read, so it goes again
        state = { ...stored, outbox: resetSending(stored.outbox) };
        home.value = stored.home;
        ageGroupPicks.value = { ...stored.ageGroupPicks };
      })().catch((error) => {
        loading = null;
        throw error;
      });
    }
    return loading;
  }

  /** Saves the change to what the device keeps; the age picks on screen follow the saved ones */
  function update(change: (current: FamilyEventsState) => FamilyEventsState): Promise<void> {
    const run = writing.then(async () => {
      await load();
      const next = change(state as FamilyEventsState);
      await getFamilyEventsDb().saveState(next);
      state = next;
      ageGroupPicks.value = { ...next.ageGroupPicks };
    });
    writing = run.catch(() => undefined);
    return run;
  }

  async function setHome(next: HomeStatus): Promise<void> {
    home.value = next;
    await update((current) => ({ ...current, home: next }));
  }

  // --- When the site says no ---

  /** Keeps what went wrong for the screens. A refused link is the Town Hall's rule: forget it, the parent registers again. */
  async function noteProblem(found: FamilyProblem): Promise<void> {
    problem.value = found;
    const isRefusedLink = found === "unlinked";
    if (isRefusedLink) await townHall.forgetLink();
  }

  async function noteFailure(error: unknown): Promise<FamilyProblem> {
    const found = familyProblem(error);
    const isUnexplained = found === "server";
    if (isUnexplained) debug.warn("family: the site could not do that", error);
    await noteProblem(found);
    return found;
  }

  // --- Game events: what goes in the send queue, and sending it (MP12) ---

  /** Events are queued and sent only with the flag on, while this device is the family's home */
  const canQueue = (): boolean => enabled.value && home.value === "home";

  /** What the device keeps, loaded */
  async function loaded(): Promise<FamilyEventsState> {
    await load();
    return state as FamilyEventsState;
  }

  const sender = createFamilySender({
    maySend: canQueue,
    auth: () => parentAuth.value,
    kept: loaded,
    update,
    moved: () => setHome("home-elsewhere"),
    refused: noteProblem,
  });

  /** Puts events in the send queue together with any other change (the cards sent), in one save; sends 5 s later */
  async function queueEvents(events: FamilyEvent[], alsoChange: (current: FamilyEventsState) => Partial<FamilyEventsState> = () => ({})): Promise<void> {
    const hasEvents = events.length > 0;
    if (!hasEvents) return;
    let isQueued = false;
    await update((current) => {
      // Checked again at the save: an answer that moved home away meanwhile queues nothing
      const mayQueue = canQueue();
      if (!mayQueue) return current;
      isQueued = true;
      const outbox = events.reduce<QueuedEvent[]>((queue, e) => enqueue(queue, e), current.outbox);
      return { ...current, ...alsoChange(current), outbox };
    });
    if (isQueued) sender.sendIn(SEND_DELAY_MS);
  }

  const cards = createCardQueue({
    mayQueue: canQueue,
    auth: () => parentAuth.value,
    lastCards: async () => (await loaded()).lastCards,
    deviceId: async () => (await ensureIdentity()).deviceId,
    profiles: () => Object.values(useUserStore().users),
    ageGroupPick: (heroId) => ageGroupPicks.value[heroId],
    queue: (events, sentCards) => queueEvents(events, (current) => ({ lastCards: { ...current.lastCards, ...sentCards } })),
    failed: async (error) => {
      await noteFailure(error);
    },
  });

  /**
   * A paid quest: quest.done with the quest's difficulty, never its name or category. A hero the site does not know
   * (no nickname yet) sends nothing, since the site would refuse it.
   */
  async function queueQuestDone(paid: QuestPaid): Promise<void> {
    const mayQueue = canQueue();
    if (!mayQueue) return;
    const isKnown = cards.isKnown(paid.heroId, (await loaded()).lastCards);
    if (!isKnown) return;
    const difficulty = await difficultyOf(paid.questId);
    const { deviceId } = await ensureIdentity();
    await queueEvents([questDoneEvent(paid.heroId, deviceId, { difficulty, xp: paid.xp, fight: paid.fight })]);
  }

  /** Sends what waits, one request at a time: a call while a send runs joins it */
  const flush = (): Promise<void> => sender.flush();

  // --- Heroes ---

  /** The profiles with a nickname (Game Masters included), each with the age group it is registered under */
  function registrableHeroes(): RegistrableHero[] {
    return Object.values(useUserStore().users).flatMap((profile) => {
      const card = cardOf(profile);
      if (!card) return [];
      return [{ heroId: card.heroId, nickname: card.nickname, ageGroup: ageGroupOf(profile, ageGroupPicks.value[card.heroId]) }];
    });
  }

  async function refreshHeroes(auth: TownHallAuth): Promise<void> {
    try {
      heroes.value = (await getFamily(auth)).heroes;
    } catch (error) {
      debug.warn("family: could not read the heroes back", error);
    }
  }

  /**
   * Tells the site about every hero on this device that has a nickname, once this device is the family's home. A hero
   * the site refuses (a nickname it cannot take) does not stop the others; a dead connection or a refused link does.
   */
  async function registerHeroes(): Promise<void> {
    const auth = parentAuth.value;
    const canRegister = enabled.value && home.value === "home" && auth !== null;
    if (!canRegister) return;
    for (const hero of registrableHeroes()) {
      try {
        await saveHero(auth, hero.heroId, hero.nickname, hero.ageGroup);
        cards.registered(hero.heroId);
      } catch (error) {
        const found = familyProblem(error);
        const isOneHeroOnly = found === "invalid";
        if (isOneHeroOnly) {
          debug.warn(`family: the site refused hero ${hero.heroId}`, error);
          cards.refused(hero.heroId, hero.nickname);
          continue;
        }
        await noteFailure(error);
        return;
      }
    }
    await refreshHeroes(auth);
  }

  /** The Game Master picked an age group for a hero whose profile has no birthday: keep it, and tell the site if home */
  async function setAgeGroup(heroId: string, group: AgeGroup): Promise<void> {
    if (!enabled.value) return;
    await update((current) => ({ ...current, ageGroupPicks: { ...current.ageGroupPicks, [heroId]: group } }));
    const auth = parentAuth.value;
    const profile = useUserStore().users[heroId];
    const card = cardOf(profile);
    const canTellTheSite = home.value === "home" && auth !== null && card !== null;
    if (!canTellTheSite) return;
    try {
      await saveHero(auth, heroId, card.nickname, ageGroupOf(profile, group));
      cards.registered(heroId);
    } catch (error) {
      await noteFailure(error);
    }
  }

  /** A profile was deleted: forget its card and pick here, and take the hero off the site while this device is home */
  async function forgetHero(heroId: string): Promise<void> {
    cards.forget(heroId);
    try {
      await update((current) => ({
        ...current,
        lastCards: without(current.lastCards, heroId),
        ageGroupPicks: without(current.ageGroupPicks, heroId),
      }));
      const auth = parentAuth.value;
      const canTellTheSite = home.value === "home" && auth !== null;
      if (!canTellTheSite) return;
      await removeHero(auth, heroId);
      heroes.value = heroes.value.filter((hero) => hero.heroId !== heroId);
    } catch (error) {
      await noteFailure(error);
    }
  }

  // --- Binding ---

  async function runBind(): Promise<void> {
    try {
      if (!enabled.value) return;
      await load();
      const auth = parentAuth.value;
      if (!auth) return;
      const { familyId, deviceId } = await ensureIdentity();
      const answer = await bindFamily(auth, familyId, deviceId);
      problem.value = null;
      await setHome(HOME_OF_ANSWER[answer] ?? "unknown");
      await registerHeroes();
      // Home, and the site took the heroes: the cards that changed (all of them, the first time) go in the queue
      const isHomeAndWell = home.value === "home" && problem.value === null;
      if (isHomeAndWell) await cards.queueCards();
    } catch (error) {
      await noteFailure(error);
    }
  }

  let binding: Promise<void> | null = null;

  /**
   * Ties the family to the Game Master's account (the spec, section 4) and, when this device is home, registers the
   * heroes. A call while a bind runs joins it. Never rejects: what went wrong lands in `problem`.
   */
  function bind(): Promise<void> {
    if (!binding) {
      binding = runBind().finally(() => {
        binding = null;
      });
    }
    return binding;
  }

  /** "Make this one home": the site moves the family's home here (the old home's next send is refused), then a fresh bind */
  async function makeHome(): Promise<void> {
    const auth = parentAuth.value;
    const canMove = enabled.value && auth !== null;
    if (!canMove) return;
    await binding;
    try {
      await load();
      const { familyId, deviceId } = await ensureIdentity();
      await moveHome(auth, familyId, deviceId);
    } catch (error) {
      await noteFailure(error);
      return;
    }
    await bind();
  }

  /** Queues the hero cards that changed since the last ones sent; a running bind decides `home` first */
  async function queueCards(): Promise<void> {
    await binding;
    await cards.queueCards();
  }

  // --- Kid mode and phone linking (MP14) ---

  /** Trades a link code for a hero key, keeps the device, and adopts the family */
  async function claim(code: string): Promise<"linked" | FamilyProblem> {
    const clean = normalizeCode(code);
    if (!clean) {
      problem.value = "code-invalid";
      return "code-invalid";
    }
    const { deviceId } = await ensureIdentity();
    const platform = Capacitor.getPlatform();
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const initialLabel = phoneLabel("", userAgent, platform);
    try {
      const claimed = await claimDevice(clean, deviceId, initialLabel);
      const siteUrl = townHallSiteUrl();
      const label = phoneLabel(claimed.card?.nickname ?? "", userAgent, platform);
      const heroDevice: HeroDevice = {
        siteUrl,
        familyId: claimed.familyId,
        heroId: claimed.heroId,
        deviceId,
        key: claimed.key,
        label,
        linkedAt: Date.now(),
        card: claimed.card,
      };
      await getHeroDeviceDb().saveDevice(heroDevice);
      await adoptFamily(claimed.familyId);
      device.value = heroDevice;
      problem.value = null;
      return "linked";
    } catch (error) {
      const found = familyProblem(error);
      problem.value = found;
      return found;
    }
  }

  /** Refreshes this hero phone's card with the hero key; a revoked key marks the phone unlinked */
  async function refreshCard(): Promise<void> {
    const current = device.value;
    const hasDevice = current !== null;
    if (!hasDevice) return;
    const auth: TownHallAuth = { kind: "hero", key: current.key };
    try {
      const answer = await getFamily(auth);
      const matched = answer.heroes.find((h) => h.heroId === current.heroId);
      const hasCard = Boolean(matched?.card);
      if (hasCard) {
        const updated = { ...current, card: matched!.card };
        device.value = updated;
        await getHeroDeviceDb().saveDevice(updated);
      }
    } catch (error) {
      const found = familyProblem(error);
      problem.value = found;
      const isKeyRevoked = found === "key-revoked" || found === "unlinked";
      if (isKeyRevoked) {
        const marked = { ...current, unlinked: true };
        device.value = marked;
        await getHeroDeviceDb().saveDevice(marked);
      }
    }
  }

  /** Clears the device record and leaves kid mode */
  async function forgetDevice(): Promise<void> {
    await getHeroDeviceDb().clearDevice();
    device.value = null;
  }

  /** Generates a new link code for a hero */
  async function linkCode(heroId: string): Promise<LinkCode> {
    const auth = parentAuth.value;
    if (!auth) throw new Error("family: cannot make a link code without parent auth");
    return await makeLinkCode(auth, heroId);
  }

  /** Loads the list of linked phones */
  async function loadPhones(): Promise<void> {
    const auth = parentAuth.value;
    if (!auth) return;
    try {
      phones.value = await listPhones(auth);
    } catch (error) {
      await noteFailure(error);
    }
  }

  /** Unlinks a phone by device row id */
  async function removePhone(id: number): Promise<void> {
    const auth = parentAuth.value;
    if (!auth) return;
    try {
      await serverRemovePhone(auth, id);
      phones.value = phones.value.filter((p) => p.id !== id);
    } catch (error) {
      await noteFailure(error);
    }
  }

  // --- Starting ---

  /** Everything init started listening to, stopped when the store goes */
  const stops: (() => void)[] = [];
  let cardsTimer: ReturnType<typeof setTimeout> | undefined;
  let started = false;
  let disposed = false;
  let initPromise: Promise<void> | null = null;

  /** A profile changed: its card is compared (and queued when it changed) 2 s after the last change */
  function queueCardsSoon(): void {
    if (disposed) return;
    clearTimeout(cardsTimer);
    cardsTimer = setTimeout(() => {
      cardsTimer = undefined;
      queueCards().catch((error) => debug.warn("family: could not queue the cards", error));
    }, CARDS_DELAY_MS);
  }

  /** The browser is back online or the app is back in front: the connection may be back, so send what waits */
  function sendEverythingNow(): void {
    sender.sendEverything().catch((error) => debug.warn("family: could not send", error));
  }

  function onVisibilityChange(): void {
    const isInFront = document.visibilityState === "visible";
    if (isInFront) sendEverythingNow();
  }

  function listen(): void {
    // Only an explicit profile delete removes a hero on the site: an empty roster while profiles load removes nothing
    stops.push(
      onHeroRemoved((heroId) => {
        forgetHero(heroId).catch((error) => debug.warn("family: could not forget a removed hero", error));
      })
    );
    stops.push(
      onQuestPaid((paid) => {
        queueQuestDone(paid).catch((error) => debug.warn("family: could not queue a paid quest", error));
      })
    );
    stops.push(watch(() => useUserStore().users, () => queueCardsSoon(), { deep: true }));
    const hasWindow = typeof window !== "undefined";
    if (hasWindow) {
      window.addEventListener("online", sendEverythingNow);
      stops.push(() => window.removeEventListener("online", sendEverythingNow));
    }
    const hasDocument = typeof document !== "undefined";
    if (hasDocument) {
      document.addEventListener("visibilitychange", onVisibilityChange);
      stops.push(() => document.removeEventListener("visibilitychange", onVisibilityChange));
    }
  }

  /**
   * Loads what this device kept, starts listening (deleted profiles, paid quests, profile changes, the send moments)
   * and starts the bind, then a send. Once; a second call is the same promise. With the flag off it does nothing. It
   * does not wait for the site (see the note on the store). In kid mode, loads the device and refreshes the card.
   */
  function init(): Promise<void> {
    if (!initPromise) {
      initPromise = (async () => {
        if (!enabled.value) return;
        const stored = await getHeroDeviceDb().getDevice();
        device.value = stored;
        const isKidDevice = stored !== null;
        if (isKidDevice) {
          await refreshCard().catch((error) => debug.warn("family: could not refresh card", error));
          return;
        }
        await townHall.init();
        await load();
        listen();
        started = true;
        bind()
          .then(() => flush())
          .catch((error) => debug.warn("family: the first bind or send failed", error));
      })().catch((error) => {
        initPromise = null;
        throw error;
      });
    }
    return initPromise;
  }

  // A family linked after the app started binds at once; the first bind is init's own
  watch(
    () => parentAuth.value !== null,
    (isLinked, wasLinked) => {
      const justLinked = isLinked && !wasLinked && started;
      if (justLinked) bind().catch((error) => debug.warn("family: could not bind after linking", error));
    }
  );

  onScopeDispose(() => {
    disposed = true;
    stops.splice(0).forEach((stop) => stop());
    sender.dispose();
    clearTimeout(cardsTimer);
  });

  return {
    home,
    heroes,
    problem,
    ageGroupPicks,
    device,
    phones,
    isKidMode,
    enabled,
    parentAuth,
    init,
    bind,
    makeHome,
    registerHeroes,
    setAgeGroup,
    queueCards,
    flush,
    claim,
    refreshCard,
    forgetDevice,
    linkCode,
    loadPhones,
    removePhone,
  };
});
