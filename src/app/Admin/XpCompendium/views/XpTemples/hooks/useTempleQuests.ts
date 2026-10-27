/**
 * useTempleQuests: the Quests tab of a temple (docs/Quest-Rooms-Spec.md section 9). It loads the family's quests and
 * every hero's quest board, hands them to the pure rules (services/temples/templeQuestRows) for the rows, the size and
 * the status dots, and runs "Wake quests": which heroes, which dormant templates, and the write through the normal DBs
 * (services/temples/wakeTempleQuests). The rules live in those modules; this only wires them to storage and the sheet.
 */
import { computed, ref, type Ref } from "vue";
import { toastController } from "@ionic/vue";
import AchievementDb, { achievementStorage, type Achievement } from "@/lib/databases/AchievementDb";
import BestiaryDb, { beastStorage, type Beast } from "@/lib/databases/BestiaryDb";
import { readQuestBoard } from "@/lib/engine/core/dungeons/templeSystem/questRooms";
import { metadataForAsync } from "@/lib/engine/temples/templeRegistry";
import { useUserStore } from "@/lib/store/stores/user";
import { play$fx } from "@/assets/fx";
import debug from "@/lib/utils/debug";
import { buildTempleQuests, type QuestHero, type QuestLayout } from "@/lib/services/temples/templeQuestRows";
import { templeThemeLabel } from "@/lib/services/temples/templeThemes";
import { commitWake, planWake, wakeChoices, wakeProblem, type WakeChoice } from "@/lib/services/temples/wakeTempleQuests";

/** A hero the sheet can pick. */
export interface HeroOption {
  id: string;
  nick: string;
  isAdult: boolean;
}

/** What the sheet says after a wake. */
export interface WakeReport {
  woken: number;
  /** The names of the quests that were made */
  names: string[];
  heroes: string;
  /** "Dish Goblin: uses your quest ..." for each template that was skipped */
  skipped: string[];
}

const nickOf = (user: { id?: unknown; name?: { nick?: string; first?: string } }): string =>
  user.name?.nick || user.name?.first || String(user.id);

const say = async (message: string, color?: string) => {
  const toast = await toastController.create({
    message,
    duration: 4000,
    position: "middle",
    cssClass: "rpg-toast",
    color,
    buttons: [{ text: "Close", role: "cancel" }],
  });
  await toast.present();
};

export function useTempleQuests(templeId: string, layout: Ref<QuestLayout | null | undefined>, allBeasts: Ref<Beast[]>) {
  const achievementDb = new AchievementDb(achievementStorage);
  const bestiaryDb = new BestiaryDb(beastStorage);
  const userStore = useUserStore();

  const quests = ref<Achievement[]>([]);
  const heroes = ref<QuestHero[]>([]);
  const now = ref(new Date());
  const isLoading = ref(true);
  /** "Kitchen · Shadow": the chores this temple is about; empty for a temple that has no theme */
  const themeLabel = ref("");

  const heroOptions = computed<HeroOption[]>(() =>
    (userStore.usersAz as Array<{ id: unknown; isAdult?: boolean; name?: { nick?: string; first?: string } }>).map((user) => ({
      id: String(user.id),
      nick: nickOf(user),
      isAdult: user.isAdult === true,
    }))
  );

  /** The family's quests, and each hero's board at this moment (a board that cannot be read leaves the hero's dot out). */
  const load = async () => {
    try {
      const at = new Date();
      const [tasks, boards, meta] = await Promise.all([
        achievementDb.getTasks(),
        Promise.all(heroOptions.value.map((hero) => readQuestBoard(hero.id, at))),
        metadataForAsync(templeId),
      ]);
      quests.value = tasks;
      themeLabel.value = templeThemeLabel(meta.element);
      heroes.value = heroOptions.value.map((hero, index) => {
        const read = boards[index];
        return { id: hero.id, nick: hero.nick, board: read ? { board: read.board, effects: read.effects } : null };
      });
      now.value = at;
    } catch (error) {
      // The tab still shows the rooms from the layout; the quests and dots are what is missing
      debug.warn("[TempleQuests] could not load the quests", error);
    } finally {
      isLoading.value = false;
    }
  };

  const view = computed(() =>
    buildTempleQuests({ layout: layout.value, quests: quests.value, beasts: allBeasts.value, heroes: heroes.value, now: now.value })
  );

  // -------------------------------------------------------------------------------------------------------------------
  // Wake quests
  // -------------------------------------------------------------------------------------------------------------------

  const choices = computed<WakeChoice[]>(() => wakeChoices(layout.value, quests.value, allBeasts.value));
  /** Templates nobody has a quest for yet: tickable */
  const sleeping = computed(() => choices.value.filter((choice) => !choice.quest));
  /** Templates a family quest already fills: "uses your quest" */
  const covered = computed(() => choices.value.filter((choice) => choice.quest));

  const showWake = ref(false);
  const pickedHeroes = ref<string[]>([]);
  const ticked = ref<string[]>([]);
  const waking = ref(false);
  const report = ref<WakeReport | null>(null);

  const pickedTemplates = computed(() => sleeping.value.filter((choice) => ticked.value.includes(choice.beastId)).map((choice) => choice.template));
  const problem = computed(() => wakeProblem(pickedHeroes.value, pickedTemplates.value));
  const pickedNames = computed(() =>
    heroOptions.value.filter((hero) => pickedHeroes.value.includes(hero.id)).map((hero) => hero.nick).join(", ")
  );

  /** "Wake 4 quests for Dad, Max": what the button will do */
  const confirmText = computed(() => {
    const count = pickedTemplates.value.length;
    const who = pickedNames.value;
    return `Wake ${count} quest${count !== 1 ? "s" : ""}${who ? ` for ${who}` : ""}`;
  });

  /** The sheet opens with the family's heroes (not the Game Masters) picked and every sleeping template ticked. */
  const openWake = () => {
    play$fx("openMenu");
    report.value = null;
    pickedHeroes.value = heroOptions.value.filter((hero) => !hero.isAdult).map((hero) => hero.id);
    ticked.value = sleeping.value.map((choice) => choice.beastId);
    showWake.value = true;
  };

  const closeWake = () => {
    showWake.value = false;
  };

  const toggle = (list: Ref<string[]>, id: string) => {
    list.value = list.value.includes(id) ? list.value.filter((item) => item !== id) : [...list.value, id];
  };
  const toggleHero = (id: string) => toggle(pickedHeroes, id);
  const toggleTick = (beastId: string) => toggle(ticked, beastId);
  const setAllTicks = (on: boolean) => {
    ticked.value = on ? sleeping.value.map((choice) => choice.beastId) : [];
  };

  /**
   * Wakes the ticked templates for the picked heroes. The quests and the bestiary are read again first, so a quest the
   * family made since the tab loaded is respected (the beast "uses your quest") and nothing is written over.
   */
  const confirmWake = async () => {
    const hasNothingToWake = problem.value !== null || waking.value;
    if (hasNothingToWake) return;
    waking.value = true;
    try {
      const [records, beasts] = await Promise.all([achievementDb.getTasks(), bestiaryDb.getLiveBeasts()]);
      const plan = planWake({
        templeId,
        templates: pickedTemplates.value,
        heroIds: pickedHeroes.value,
        quests: records,
        beasts,
        now: new Date(),
      });
      const done = await commitWake(plan, {
        saveBeast: (beast) => bestiaryDb.setBeast(beast),
        saveQuest: (quest) => achievementDb.setTask(quest),
      });
      report.value = {
        woken: done.woken.length,
        names: done.woken.map((quest) => quest.achievementName),
        heroes: pickedNames.value,
        skipped: plan.skipped.map((skip) => skip.line),
      };
      play$fx(done.woken.length ? "select" : "no");
      allBeasts.value = await bestiaryDb.getLiveBeasts();
      await load();
    } catch (error) {
      debug.error("[TempleQuests] waking the quests failed", error);
      play$fx("no");
      await say(error instanceof Error ? `The quests would not wake: ${error.message}` : "The quests would not wake.", "danger");
      await load();
    } finally {
      waking.value = false;
    }
  };

  return {
    isLoading,
    load,
    themeLabel,
    view,
    heroOptions,
    choices,
    sleeping,
    covered,
    showWake,
    pickedHeroes,
    ticked,
    waking,
    report,
    problem,
    confirmText,
    openWake,
    closeWake,
    toggleHero,
    toggleTick,
    setAllTicks,
    confirmWake,
  };
}
