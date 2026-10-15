import { RouteLocationNormalized, RouteLocationRaw, Router } from "vue-router";
import { alertController } from "@ionic/vue";
import { useBattleStore } from "@/lib/store/stores/battle";
import { useUserStore } from "@/lib/store/stores/user";
import {
  freeBattleRoute,
  questBattleRoute,
  regionForRoute,
  WORLD_REGIONS,
} from "@/app/Console/BattleField/battle/battleContext";
import { getQuestEngine } from "@/lib/engine/quests/QuestEngine";
import type { HeroQuestEffects } from "@/lib/engine/quests/QuestSchedule";
import {
  ambushAlertCopy,
  libraryBeastName,
  pickQuestAmbush,
  withAmbushStamped,
  type AmbushMemories,
  type QuestAmbush,
} from "@/lib/services/battle/questAmbush";
import { hasNoEncounters } from "@/lib/services/quests/ItemEffects";
import { isThiefRoll, THIEF_BEAST_ID } from "@/lib/services/battle/thiefEncounter";
import {
  AMBUSH_ALERT_ID,
  alertPermission,
  battleAlertsChoice,
  cancelAlert,
  isNativeApp,
  requestAlertPermission,
  scheduleAlert,
  setBattleAlertsChoice,
  showAlert,
} from "@/lib/services/notifications/alertBridge";
import debug from "@/lib/utils/debug";

/** Routes that trigger random battle encounters: the home town, the map and the nine region pages. */
const BATTLE_ENABLED_ROUTES: readonly string[] = [
  "home-town",
  "world-map",
  ...Object.values(WORLD_REGIONS).map((region) => region.routeName),
];

/** True while a modal, alert, action sheet or popover is open over the page (a shop panel, a dialog). */
const isOverlayOpen = (): boolean =>
  typeof document !== "undefined" &&
  document.querySelector("ion-modal.show-modal, ion-alert, ion-action-sheet, ion-popover.show-popover") !== null;

/** Battle pages are named battle-quest, battle-temple and battle-free (see battleContext). */
const isBattleRoute = (name: unknown): boolean =>
  typeof name === "string" && name.startsWith("battle-");

/**
 * The OS alert for an ambush the hero is away from; the fixed id lets a newer one replace the older. A quest
 * ambush names its beast and chore; with no names it is the plain "a beast" alert of a free encounter.
 */
const ambushAlert = (names: { beastName?: string; questName?: string } = {}) => ({
  id: AMBUSH_ALERT_ID,
  ...ambushAlertCopy(names),
});

/** What the alert for a quest ambush can name: the beast (the family's bestiary first, then the library) and the chore. */
async function ambushNames(ambush: QuestAmbush): Promise<{ beastName?: string; questName?: string }> {
  const questName = ambush.quest.achievementName;
  try {
    const { BestiaryService } = await import("@/lib/services/battle/BestiaryService");
    const beast = await new BestiaryService().loadBeastById(ambush.beastId);
    const beastName = beast?.name;
    const isNamed = Boolean(beastName);
    if (isNamed) return { beastName, questName };
  } catch (error) {
    debug.warn("The ambushing beast could not be read from the bestiary", error);
  }
  return { beastName: libraryBeastName(ambush.beastId), questName };
}

/**
 * The overdue quest whose beast takes this encounter, or null when it stays a free fight (nothing is overdue,
 * every overdue quest rested in the last hour, or the board cannot be read). The board is read fresh because
 * the quest log changes under the timer.
 */
async function findQuestAmbush(heroId: string, profile: unknown, now: Date): Promise<QuestAmbush | null> {
  try {
    const effects = (profile as { questEffects?: HeroQuestEffects } | null | undefined)?.questEffects;
    const board = await getQuestEngine().getQuestBoardForUser(heroId, now, undefined, effects);
    // The hero's own record of grudge marks and when each quest last ambushed them (spec 5.7)
    const grudges = (profile as { questGrudges?: AmbushMemories } | null | undefined)?.questGrudges;
    return pickQuestAmbush(board, effects, grudges ?? {}, now);
  } catch (error) {
    debug.warn("Quest ambush could not be looked up, so the encounter is free", error);
    return null;
  }
}

/** True when the hero said yes to OS alerts for ambushes. */
const wantsAlerts = (): boolean => battleAlertsChoice() === "on";

/**
 * Where an encounter goes: the quest's battle when a quest sent it, else a free fight. Either one carries the region
 * page it sprang on (if any), so the fight goes back there.
 */
const encounterRoute = (
  heroId: string,
  questId: string | undefined,
  region: string | undefined,
  encounter?: string
): RouteLocationRaw => {
  const isThief = encounter === "thief";
  if (isThief) return freeBattleRoute(heroId, [THIEF_BEAST_ID], region, "thief");
  if (questId) return questBattleRoute(heroId, questId, region);
  return region ? freeBattleRoute(heroId, [], region) : freeBattleRoute(heroId);
};

/** True unless the page is hidden (another tab, a locked phone); with no document at all the hero is "here". */
const isHeroHere = (): boolean => typeof document === "undefined" || document.visibilityState === "visible";

/** The hero's profile when the user store has it, else the signed-in hero. */
const heroProfile = (userStore: ReturnType<typeof useUserStore>, heroId: string) =>
  userStore.users?.[heroId] ?? userStore.currentUser;

/**
 * One exploration tick, run by the battle store's timer while the hero is out exploring.
 *
 * Exploring goes on in the background: the encounter clock counts wall-clock time, so a hidden tab still
 * walks. An encounter that springs while the hero is away does not navigate; it waits for them as the
 * store's pendingAmbush, rings the OS alert when they chose to have one, and the fight starts the moment
 * they come back (see onReturn).
 *
 * An encounter is a free fight unless a quest of the hero's is overdue (spec 5.9, see questAmbush): then the
 * quest's beast takes the slot and the fight is that quest's battle. A quest rests for an hour after it ambushes.
 *
 * A tick that cannot start a fight spends no steps (the tick rests the walk clock), and the encounter
 * that was coming is still coming afterwards instead of landing the moment the hero is free again:
 *  - the live route is a battle page (returning from a fight restarts this timer while the
 *    route is still battle-free, so reading the live route also stops a second fight stacking
 *    on the first);
 *  - nobody is the current hero;
 *  - the hero cast the Quiet Day Power (no random encounters until it runs out; an old save's X's Invisibility
 *    wrote the same field);
 *  - a battle is already active;
 *  - an ambush is already waiting for the hero (one at a time);
 *  - a modal / shop panel is open over the page.
 */
async function onExplorationTick(router: Router): Promise<void> {
  const battleStore = useBattleStore();
  const userStore = useUserStore();
  const heroId = userStore.currentUser.id;

  const routeName = router.currentRoute.value.name;

  const blocked =
    isBattleRoute(routeName) ||
    isOverlayOpen() ||
    !heroId ||
    hasNoEncounters(heroProfile(userStore, heroId), new Date()) ||
    battleStore.active ||
    Boolean(battleStore.pendingAmbush);
  if (blocked) {
    battleStore.restWalk();
    return;
  }

  const hasEncounter = battleStore.randomEncounter();
  if (!hasEncounter) return;

  debug.log("Random encounter triggered!");
  // Re-arm the step counter (a new random wait inside steps.min..steps.max) before navigating,
  // so no tick can fire again while the push is still in flight.
  battleStore.resetBattleTimer();

  // A free fight's battle page picks a random bestiary beast (from the region's element on a region page)
  // and returns to the page the hero left, home-town or the region.
  const region = regionForRoute(routeName);

  const isThief = isThiefRoll();
  if (isThief) {
    if (!isHeroHere()) {
      battleStore.setPendingAmbush({ heroId, region, at: Date.now(), encounter: "thief" });
      if (wantsAlerts()) void showAlert(ambushAlert({ beastName: "Thief Beast" }));
      return;
    }

    try {
      await router.push(encounterRoute(heroId, undefined, region, "thief"));
    } catch (error) {
      debug.error("Random thief encounter could not start a battle", error);
    }
    return;
  }

  const now = new Date();
  const ambush = await findQuestAmbush(heroId, heroProfile(userStore, heroId), now);
  // Look the beast up before the last look at where the hero is: nothing below waits, so the alert is never
  // rung after the hero is back.
  const needsNames = Boolean(ambush) && !isHeroHere() && wantsAlerts();
  const names = ambush && needsNames ? await ambushNames(ambush) : {};

  // The lookups took a moment: a fight that started meanwhile must not get a second one stacked on it
  const isFightAlreadyOn = isBattleRoute(router.currentRoute.value.name) || battleStore.active;
  if (isFightAlreadyOn) return;

  const questId = ambush ? String(ambush.quest.id) : undefined;
  if (questId) {
    const grudges = heroProfile(userStore, heroId)?.questGrudges;
    userStore.setQuestGrudges(heroId, withAmbushStamped(grudges, questId, now.getTime()));
  }

  if (!isHeroHere()) {
    // Away: hold the fight until the hero is back, and ring the alert if they asked for one.
    battleStore.setPendingAmbush({ heroId, region, at: Date.now(), ...(questId ? { questId } : {}) });
    if (wantsAlerts()) void showAlert(ambushAlert(names));
    return;
  }

  try {
    await router.push(encounterRoute(heroId, questId, region));
  } catch (error) {
    debug.error("Random encounter could not start a battle", error);
  }
}

/**
 * The hero is back (the tab shows again, or the packaged app is in front): take the ambush alert back and
 * spring the ambush that waited. An ambush for another hero, or one that meets a battle page already open,
 * is dropped. The time away is not rested here: it counts as walking, so the next tick can spring a fresh
 * encounter, and that one goes straight to battle because the hero is here.
 */
async function onReturn(router: Router): Promise<void> {
  try {
    void cancelAlert(AMBUSH_ALERT_ID);

    const battleStore = useBattleStore();
    const ambush = battleStore.pendingAmbush;
    if (!ambush) return;
    battleStore.clearPendingAmbush();

    const shouldDropAmbush = useUserStore().currentUser.id !== ambush.heroId || isBattleRoute(router.currentRoute.value.name);
    if (shouldDropAmbush) return;

    try {
      await router.push(encounterRoute(ambush.heroId, ambush.questId, ambush.region, ambush.encounter));
    } catch (error) {
      debug.error("Ambush could not start a battle", error);
    }
  } catch (error) {
    debug.error("Ambush could not be sprung", error);
  }
}

/**
 * The hero is leaving (the tab hides, or the packaged app goes to the background) with the encounter
 * timer running: book the OS alert for the moment the counter runs out. Only the packaged app can book it
 * (on the web scheduleAlert does nothing and the live tick rings the alert instead); if the tick springs
 * the ambush first while hidden, showAlert uses the same id and replaces the booking.
 */
function onLeave(router: Router): void {
  try {
    const battleStore = useBattleStore();
    const userStore = useUserStore();
    const heroId = userStore.currentUser.id;

    // The same reasons a tick would rest: nothing is coming for the hero, so nothing is booked
    const isNothingComingForHero =
      !battleStore.interval ||
      battleStore.pendingAmbush ||
      isBattleRoute(router.currentRoute.value.name) ||
      isOverlayOpen() ||
      !heroId ||
      battleStore.active ||
      battleAlertsChoice() !== "on";
    if (isNothingComingForHero) {
      return;
    }

    // A Quiet Day (the Power; old saves: X's Invisibility) holds the walk back, so the alert waits for it to run out
    const until = heroProfile(userStore, heroId)?.questEffects?.noEncountersUntil;
    const invisibleUntil = until ? new Date(until) : null;
    const at = battleStore.nextEncounterAt(new Date(), invisibleUntil);
    if (!at) return;

    void scheduleAlert({ ...ambushAlert(), at });
  } catch (error) {
    debug.error("Ambush alert could not be booked", error);
  }
}

// The router the listeners act on: the latest one handleBattleTimerGuard saw (the app has just the one).
let guardRouter: Router | null = null;
let awayListenersInstalled = false;

/** The hero comes and goes: a visible page is a hero who is here, a hidden one a hero who is away. */
const onVisibilityChange = (): void => {
  if (!guardRouter) return;
  if (isHeroHere()) void onReturn(guardRouter);
  else onLeave(guardRouter);
};

/**
 * Listen for the hero coming and going, once: the page's visibilitychange (browser) and Capacitor's
 * appStateChange (packaged app) feed the same onReturn / onLeave. Safe to call on every navigation.
 */
function installAwayListeners(): void {
  if (awayListenersInstalled) return;
  awayListenersInstalled = true;

  try {
    const hasDocument = typeof document !== "undefined";
    if (hasDocument) document.addEventListener("visibilitychange", onVisibilityChange);

    if (isNativeApp()) {
      // A plain dynamic import: the bare specifier has to be bundled to resolve inside the packaged app
      void import("@capacitor/app")
        .then(({ App }) =>
          App.addListener("appStateChange", ({ isActive }) => {
            if (!guardRouter) return;
            if (isActive) void onReturn(guardRouter);
            else onLeave(guardRouter);
          })
        )
        .catch((error) => debug.warn("App state alerts are unavailable", error));
    }
  } catch (error) {
    debug.warn("Away alerts are unavailable", error);
  }
}

let askedAboutAlerts = false;

/**
 * The one-time ask about ambush alerts, shown once per session while the hero has not answered yet. A device
 * that already settled the question (allowed or blocked alerts for the game) answers it silently; one that
 * cannot ring alerts is left alone. "Sure!" asks the device for permission inside the tap, as browsers insist.
 */
async function askAboutAmbushAlerts(): Promise<void> {
  const permission = await alertPermission();
  const isUnsupported = permission === "unsupported";
  if (isUnsupported) return;
  const isPermissionSettled = permission === "denied" || permission === "granted";
  if (isPermissionSettled) {
    setBattleAlertsChoice(permission === "granted" ? "on" : "off");
    return;
  }

  const alert = await alertController.create({
    header: "Ambush alerts",
    message: "Want a heads-up when a beast ambushes you while you're away?",
    buttons: [
      {
        text: "No thanks",
        role: "cancel",
        handler: () => setBattleAlertsChoice("off"),
      },
      {
        text: "Sure!",
        handler: () => {
          // Nothing awaited before the request: the browser's prompt only opens inside the tap
          requestAlertPermission()
            .then((result) => setBattleAlertsChoice(result === "granted" ? "on" : "off"))
            .catch(() => setBattleAlertsChoice("off"));
        },
      },
    ],
  });
  await alert.present();
}

/**
 * Manages battle timer based on current route.
 * Starts timer on exploration routes, stops it elsewhere.
 * While it runs, running out of steps sends the current hero into a free battle (or, with the hero
 * away, holds the fight until they come back). The first exploration route also asks about ambush alerts.
 */
export function handleBattleTimerGuard(
  to: RouteLocationNormalized,
  router: Router
): void {
  const battleStore = useBattleStore();
  guardRouter = router;
  installAwayListeners();

  const isExplorationRoute = BATTLE_ENABLED_ROUTES.includes(String(to.name));
  if (isExplorationRoute) {
    const region = regionForRoute(to.name);
    battleStore.setTerrainForRoute(region ? WORLD_REGIONS[region].terrain : null);
    battleStore.startBattleTimer({
      onEncounter: () => onExplorationTick(router),
    });

    const shouldAskAboutAlerts = !askedAboutAlerts && battleAlertsChoice() === "unasked";
    if (shouldAskAboutAlerts) {
      askedAboutAlerts = true;
      askAboutAmbushAlerts().catch((error) => debug.warn("Ambush alerts could not be asked", error));
    }
  } else {
    battleStore.stopBattleTimer();
  }
}
