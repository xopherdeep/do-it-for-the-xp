import { defineStore } from "pinia";
import { computed, onScopeDispose, ref, watch } from "vue";
import { getFamilyEventsDb, type FamilyEventsState, type HomeStatus } from "@/lib/databases/FamilyEventsDb";
import { ageGroupOf, type AgeGroup } from "@/lib/services/multiplayer/ageGroup";
import { bindFamily, familyProblem, getFamily, moveHome, removeHero, saveHero } from "@/lib/services/multiplayer/familyServer";
import type { BindAnswer, FamilyProblem, ServerHero } from "@/lib/services/multiplayer/familyServer";
import { onHeroRemoved } from "@/lib/services/multiplayer/gameSignals";
import { cardOf } from "@/lib/services/multiplayer/heroCard";
import { multiplayerEnabled } from "@/lib/services/multiplayer/multiplayerFlag";
import { ensureIdentity } from "@/lib/services/pro/familyIdentity";
import type { TownHallAuth } from "@/lib/services/townhall/townHallClient";
import { useTownHallStore } from "@/lib/store/stores/townHall";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";

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

/**
 * The family on the server, seen from this device (multiplayer, part 1): whether this device is the family's home, the
 * heroes the site holds, and what went wrong last. Nothing in the game waits on it, and with the flag off it does
 * nothing at all.
 *
 * `init()` loads what this device kept and starts the bind without waiting for the site, so a screen that awaits it
 * (a router guard) never waits for the network. `bind()` joins the bind that is running: await it when you need to
 * know `home`.
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

  const enabled = computed(() => multiplayerEnabled());
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
        state = stored;
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
      } catch (error) {
        const found = familyProblem(error);
        const isOneHeroOnly = found === "invalid";
        if (isOneHeroOnly) {
          debug.warn(`family: the site refused hero ${hero.heroId}`, error);
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
    } catch (error) {
      await noteFailure(error);
    }
  }

  /** A profile was deleted: forget its card and pick here, and take the hero off the site while this device is home */
  async function forgetHero(heroId: string): Promise<void> {
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

  // --- Starting ---

  let stopListening: (() => void) | null = null;
  let started = false;
  let initPromise: Promise<void> | null = null;

  /**
   * Loads what this device kept, starts listening for deleted profiles and starts the bind. Once; a second call is the
   * same promise. With the flag off it does nothing. It does not wait for the site (see the note on the store).
   */
  function init(): Promise<void> {
    if (!initPromise) {
      initPromise = (async () => {
        if (!enabled.value) return;
        await townHall.init();
        await load();
        // Only an explicit profile delete removes a hero on the site: an empty roster while profiles load removes nothing
        stopListening = onHeroRemoved((heroId) => {
          forgetHero(heroId).catch((error) => debug.warn("family: could not forget a removed hero", error));
        });
        started = true;
        bind().catch((error) => debug.warn("family: the first bind failed", error));
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
    stopListening?.();
  });

  return { home, heroes, problem, ageGroupPicks, enabled, parentAuth, init, bind, makeHome, registerHeroes, setAgeGroup };
});
