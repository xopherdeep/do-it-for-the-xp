import { ref, computed, watch, InjectionKey } from "vue";
import { useRouter } from "vue-router";
import { toastController, modalController } from "@ionic/vue";
import { debounce } from "lodash";

import AchievementDb, {
  Achievement,
  achievementStorage,
  achievementCategoryStorage,
  AchievementCategoryDb,
  AchievementCategoryInterface,
} from "@/lib/databases/AchievementDb";

import BestiaryDb, { Beast, beastStorage } from "@/lib/databases/BestiaryDb";
import ProfileDb from "@/lib/databases/ProfileDb";
import User from "@/lib/utils/User";
import { profileStorage } from "@/lib/databases/profileStorage";
import { useBestiarySelectionStore } from "@/lib/store/stores/bestiary-selection";
import appConfig from "@/app.config";
import {
  DIFFICULTY_ICONS,
  ACHIEVEMENT_TYPE_ICONS,
  BASIC_SCHEDULE_ICONS,
  LORE_COMBO_MATRIX,
} from "@/constants";
import XpReorderAchievementsModal from "../components/XpReorderAchievementsModal.vue";
import { formatQuestName } from "@/lib/utils/format";
import debug from "@/lib/utils/debug";
import { withoutEmptyTimes } from "./timesOfDayEditor";
import { useProStore } from "@/lib/store/stores/pro";
import { withoutUnsetMinutes } from "@/lib/services/quests/questFormRules";
import { useQuestEffort } from "./useQuestEffort";
import { useBeastSuggestion } from "./useBeastSuggestion";
import { cleanCategoryName, findCategory, isQuestReady, questMissing } from "../../questConfigWizard";

export const sortCategoryByName = (a: any, b: any) => {
  const nameA = a.name.toLowerCase();
  const nameB = b.name.toLowerCase();
  if (nameA < nameB) return -1;
  if (nameA > nameB) return 1;
  return 0;
};

const resolveLegacyAdventureType = (hasBeast: boolean, hasSubAchievements: boolean): "beast" | "chain" | "simple" => {
  if (hasBeast) {
    return "beast";
  }
  if (hasSubAchievements) {
    return "chain";
  }
  return "simple";
};

// "new" is the route placeholder for a quest that has no saved id yet
const isSavedQuestId = (questId?: string) =>
  Boolean(questId && questId !== "new");

/** What opening a quest found: whether it was already saved, and whether it was still a draft (the wizard opens by it). */
export interface LoadedQuest {
  isSaved: boolean;
  wasDraft: boolean;
}

export const AchievementFormInjectionKey: InjectionKey<
  ReturnType<typeof useAchievementForm>
> = Symbol("AchievementForm");

export function useAchievementForm() {
  const router = useRouter();

  // State
  const id = ref<string>("");

  // Databases
  const achievementDb = new AchievementDb(achievementStorage);
  const bestiaryDb = new BestiaryDb(beastStorage);
  const categoryDb = new AchievementCategoryDb(achievementCategoryStorage);
  const profilesDb = new ProfileDb(profileStorage);

  // State
  // State
  // timesOfDay starts as an empty list so the Schedule tab's chips have something to toggle;
  // withoutEmptyTimes drops it again on save while no time is picked
  const achievement = ref<Achievement>({ ...AchievementDb.getDefault(), timesOfDay: [] });

  const achievements = ref<Achievement[]>([]);
  const beasts = ref<Beast[]>([]);
  const categories = ref<AchievementCategoryInterface[]>([]);
  const users = ref<User[]>([]);

  const loading = ref(false);
  const saving = ref(false);
  /** What the editor's save chip says: draft = saved but hidden from heroes until the quest is complete */
  const saveState = ref<"idle" | "saving" | "saved" | "draft" | "error">("idle");
  const isGeneratingSchedule = ref(false);
  const lastSavedState = ref("");

  // UI State
  const addCategoryModalOpen = ref(false);
  const endsModalOpen = ref(false);
  const startsModalOpen = ref(false);
  const dueModalOpen = ref(false);

  // Selectors
  const showQuestTypeSelector = ref(false);
  const showPartyTypeSelector = ref(false);
  const showTypeConfigModal = ref(false);
  const showApprovalModal = ref(false);
  const showBonusModal = ref(false);

  // Constants
  const fibonacciArray = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];
  const fibonacciDescriptions = [
    "Trivial",
    "Simple",
    "Easy",
    "Moderate",
    "Challenging",
    "Difficult",
    "Very Difficult",
    "Extremely Difficult",
    "Insane",
    "Legendary",
    "Mythical",
  ];
  const fibonacciIndex = ref(0);

  // The three kinds of quest (step one's Normal / Beast / Chain segments are QUEST_KINDS in questConfigWizard)
  const achievementTypes = [
    {
      name: "Basic Task",
      value: "simple",
      icon: "fa-check",
      text: `Mundane request from an NPC.`,
      example: `"Make the bed", "Practice piano for 30 minutes", "NPC: 'Deliver this mail'"`,
    },
    {
      name: "Beast Encounter",
      value: "beast",
      icon: "fa-paw-claws",
      text: `Subdue a mundane task turned monster.`,
      example: `"Defeat the Socktopus", "Exorcise the Dust Bunnies", "Slay the Laundry Dragon"`,
    },
    {
      name: "Immersive Sequence",
      value: "chain",
      icon: "fa-link",
      text: `Tie chores together into an epic arc.`,
      example: `"Clean up the Yard" → Weed → Mow → Bag → Celebrate`,
    },
  ];

  // Assignment types for Heros tab
  const assignmentTypes = [
    {
      value: "asNeeded",
      name: "Open Bounty",
      shortDesc: "Public Bounty.",
      icon: "fa-user-cowboy",
      example:
        'Common area chores or "extra credit" tasks posted for the whole party.',
    },
    {
      value: "individual",
      name: "Solo Mission",
      shortDesc: "Solo Objective.",
      icon: "fa-user-ninja",
      example: "Personal homework, hygiene, or individual training.",
    },
    {
      value: "collaborate",
      name: "Team Effort",
      shortDesc: "Group Raid.",
      icon: "fa-user-headset",
      example: "Cleaning the garage, family projects, or big assemblies.",
    },
    {
      value: "rotate",
      name: "Rotate Out",
      shortDesc: "Fair Rotations.",
      icon: "fa-user-injured",
      example: "Weekly chores, pet feeding, or recurring shifts.",
    },
    {
      value: "compete",
      name: "Rat Race",
      shortDesc: "Speed Run.",
      icon: "fa-user-crown",
      example: "Reading contest, fastest cleanup, or most points earned.",
    },
  ];

  const activeLoreCombo = computed(() => {
    const assignment = achievement.value.type || "asNeeded";
    const depth = achievement.value.adventureType || "";
    return (
      LORE_COMBO_MATRIX[assignment]?.[depth] || {
        name: "Quest",
        icon: "fa-scroll",
        tagline: "An adventure awaits",
      }
    );
  });

  const isAssignmentSelected = computed(() => !!achievement.value.type);
  const isDepthSelected = computed(() => !!achievement.value.adventureType);

  const activeBeast = computed(() => {
    if (!achievement.value.beastId) return null;
    return beasts.value.find((b) => b.id === achievement.value.beastId);
  });

  const beastAvatarUrl = computed(() => {
    if (!activeBeast.value?.avatar) return null;
    try {
      // webpack resolves require(); new URL("/src/...") never pointed at a bundled file
      const pad = activeBeast.value.avatar.toString().padStart(3, "0");
      return require(`@/assets/images/beasts/${pad}.webp`);
    } catch {
      return null;
    }
  });

  const subAchievements = computed(() => {
    if (!achievement.value.subAchievementIds?.length) return [];
    return achievement.value.subAchievementIds
      .map((id: string) => achievements.value.find((a) => a.id === id))
      .filter(Boolean);
  });

  const assignedHeroes = computed(() => {
    return users.value.filter((u) =>
      achievement.value.assignee?.includes(u.id)
    );
  });

  const scheduleSummary = computed(() => {
    const a = achievement.value;
    if (a.basicSchedule === "once") return "One-time";
    if (a.basicSchedule === "daily") return "Daily";
    if (a.basicSchedule === "weekly") {
      const days = a.repeatOnDays || [];
      if (days.length === 0) return "Weekly";

      const getLocalAbbreviation = (dayValue: string) => {
        const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
        const date = new Date(2025, 0, 5 + days.indexOf(dayValue));
        return date.toLocaleDateString(undefined, { weekday: "narrow" });
      };

      const order = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
      const activeDays = order
        .filter((d) => days.includes(d))
        .map((d) => getLocalAbbreviation(d))
        .join(" ");

      return `Weekly\n${activeDays}`;
    }
    const isCustomSchedule =
      a.basicSchedule === "custom" || a.scheduleType === "custom";
    if (isCustomSchedule) {
      return `${a.customFrequency}x Every ${a.customPeriodNumber} ${
        a.customPeriodType
      }${a.customPeriodNumber > 1 ? "s" : ""}`;
    }
    return a.basicSchedule
      ? a.basicSchedule.charAt(0).toUpperCase() + a.basicSchedule.slice(1)
      : "One-time";
  });

  const activeScheduleIcon = computed(() => {
    const schedule = achievement.value
      .basicSchedule as keyof typeof BASIC_SCHEDULE_ICONS;
    return BASIC_SCHEDULE_ICONS[schedule] || "fa-calendar";
  });

  const scheduleTagline = computed(() => {
    if (achievement.value.basicSchedule === "once")
      return "A one-time adventure.";
    return "The quest board refreshes on this rotation.";
  });

  // Toggle hero function
  const toggleHero = (userId: string) => {
    if (achievement.value.type === "asNeeded") return;

    const assignees = achievement.value.assignee || [];
    const index = assignees.indexOf(userId);

    if (index > -1) {
      achievement.value.assignee = assignees.filter(
        (id: string) => id !== userId
      );
    } else {
      achievement.value.assignee = [...assignees, userId];
    }
  };

  // Sorted heroes - active first, then inactive
  const sortedHeroes = computed(() => {
    const assignees = achievement.value.assignee || [];
    return [...users.value].sort((a, b) => {
      const aActive = assignees.includes(a.id);
      const bActive = assignees.includes(b.id);
      const isOnlyFirstAssigned = aActive && !bActive;
      if (isOnlyFirstAssigned) return -1;
      const isOnlySecondAssigned = !aActive && bActive;
      if (isOnlySecondAssigned) return 1;
      return a.name.first.localeCompare(b.name.first);
    });
  });

  // Clear assignees when switching to 'As Needed' type
  watch(
    () => achievement.value.type,
    (newType) => {
      if (newType === "asNeeded") {
        achievement.value.assignee = [];
      }
    }
  );

  const displayFibonacciValue = (index: number) => {
    const value = fibonacciArray[index];
    return value ? value.toString() : "0";
  };

  const updatePoints = () => {
    const { difficulty } = achievement.value;
    const closestFib = fibonacciArray.reduce((prev, curr) =>
      Math.abs(curr - difficulty) < Math.abs(prev - difficulty) ? curr : prev
    );

    achievement.value = {
      ...achievement.value,
      difficulty: closestFib,
      xp: closestFib * 100,
      gp: closestFib * 10,
      ap: closestFib * 1,
    };
  };

  const difficultyIcon = computed(() => {
    return DIFFICULTY_ICONS[achievement.value.difficulty] || "fa-question";
  });

  const isFibonacci = computed(() => {
    return fibonacciArray.includes(achievement.value.difficulty);
  });

  const saveBtnDisabled = computed(() => {
    return (
      !achievement.value.achievementName?.trim() ||
      !achievement.value.categoryId ||
      saving.value
    );
  });

  const increaseDifficulty = () => {
    if (fibonacciIndex.value < fibonacciArray.length - 1) {
      fibonacciIndex.value++;
    }
  };

  const decreaseDifficulty = () => {
    if (fibonacciIndex.value > 0) {
      fibonacciIndex.value--;
    }
  };

  const handleDifficultyChange = (ev: any) => {
    fibonacciIndex.value = ev.detail.value;
  };

  // Section Completeness
  const isStrategyComplete = computed(() => {
    const type = achievement.value.adventureType;
    if (type === "simple") return true;
    if (type === "beast") return !!achievement.value.beastId;
    if (type === "chain")
      return (achievement.value.subAchievementIds?.length || 0) > 0;
    return false;
  });

  const isPartyComplete = computed(() => {
    if (achievement.value.type === "asNeeded") return true;
    return (achievement.value.assignee?.length || 0) > 0;
  });

  const isRewardsComplete = computed(() => {
    return (
      (achievement.value.xp || 0) > 0 ||
      (achievement.value.gp || 0) > 0 ||
      (achievement.value.ap || 0) > 0
    );
  });

  const isTimingComplete = computed(() => {
    return (
      !!achievement.value.basicSchedule ||
      achievement.value.scheduleType === "custom"
    );
  });

  // Validation: the rules are one list, shared with the wizard's steps (questConfigWizard.ts)
  const isValidAdventure = computed(() => isQuestReady(achievement.value));

  // The How hard? step's tier chip and minutes, and the chore step's suggested beast (docs/Quest-Rooms-Spec.md section 9)
  const effort = useQuestEffort(achievement);
  const { applySuggestedBeast, resetPick, ...suggestionForTabs } = useBeastSuggestion({
    achievement,
    beasts,
    bestiaryDb,
    isLive: isValidAdventure,
  });

  /** What the quest still needs before heroes see it, one "• line" each (the Save chip's list) */
  const getValidationMessage = () =>
    questMissing(achievement.value)
      .map((line) => `• ${line}`)
      .join("\n");

  // Actions
  const loadData = async (routeId?: string): Promise<LoadedQuest> => {
    loading.value = true;
    resetPick();
    let loaded: LoadedQuest = { isSaved: false, wasDraft: false };
    try {
      // Update ID if provided
      if (routeId) {
        id.value = routeId;
      } else {
        // Fallback to route param if not set (legacy support)
        const paramId = router.currentRoute.value.params.id as string;
        if (isSavedQuestId(paramId)) {
          id.value = paramId;
        }
      }

      const [allAchievements, allBeasts, allCategories, allUsers] =
        await Promise.all([
          achievementDb.getAll(),
          bestiaryDb.getAll(),
          categoryDb.getAll(),
          profilesDb.getAll(),
        ]);

      achievements.value = allAchievements;
      beasts.value = allBeasts;
      categories.value = allCategories.sort(sortCategoryByName);
      users.value = allUsers;

      if (isSavedQuestId(id.value)) {
        const task = await achievementDb.getTaskById(id.value);
        if (task) {
          loaded = { isSaved: true, wasDraft: task.draft === true };
          achievement.value = { ...achievement.value, ...task };

          // Honor stored adventureType, or infer if legacy
          if (!task.adventureType) {
            const hasBeast = Boolean(task.beastId);
            const hasSub = Boolean(task.subAchievementIds && task.subAchievementIds.length > 0);
            achievement.value.adventureType = resolveLegacyAdventureType(hasBeast, hasSub);
          }

          // Set fib index
          if (task.difficulty) {
            const index = fibonacciArray.indexOf(task.difficulty);
            if (index !== -1) fibonacciIndex.value = index;
          }
        } else {
          // ID provided but not found? Treat as new or use the ID for a new task?
          achievement.value.id = id.value;
        }
      } else {
        // If new, setup default fib index
        fibonacciIndex.value = 0;
        updatePoints();
        // Ensure ID is set on the object
        if (isSavedQuestId(id.value)) achievement.value.id = id.value;
      }

      // Store initial state for change detection
      lastSavedState.value = JSON.stringify(achievement.value);
    } finally {
      loading.value = false;
    }
    return loaded;
  };

  /** What goes to storage: no empty times of day, no unusable minutes */
  const questForStorage = () => withoutUnsetMinutes(withoutEmptyTimes(achievement.value));

  // Debounced Autosave. An incomplete quest is saved as a draft, which heroes never see
  // (QuestEngine.filterQuests); it goes live by itself the moment it is complete.
  const autosave = debounce(async () => {
    if (JSON.stringify(achievement.value) === lastSavedState.value) return;
    // A quest without a name has nothing worth keeping yet
    if (!achievement.value.achievementName?.trim()) {
      saveState.value = "draft";
      return;
    }

    saving.value = true;
    saveState.value = "saving";
    try {
      achievement.value.achievementName = formatQuestName(
        achievement.value.achievementName
      );
      achievement.value.draft = !isValidAdventure.value;
      await applySuggestedBeast();
      await achievementDb.setTask(questForStorage());
      // Taken after the edits above, so they don't trigger another save
      lastSavedState.value = JSON.stringify(achievement.value);
      saveState.value = achievement.value.draft ? "draft" : "saved";
    } catch (error) {
      debug.error("Quest autosave failed:", error);
      saveState.value = "error";
    } finally {
      saving.value = false;
    }
  }, 2000); // 2 second debounce

  /** Save now (the chip's retry after a failed save) */
  const saveNow = async () => {
    lastSavedState.value = "";
    autosave();
    await autosave.flush();
  };

  /** Quests per category id, so a category that is still in use can't be deleted */
  const categoryQuestCounts = computed(() =>
    achievements.value.reduce((counts, quest) => {
      if (quest.categoryId) counts[quest.categoryId] = (counts[quest.categoryId] || 0) + 1;
      return counts;
    }, {} as Record<string, number>)
  );

  /** Save the pending edit now (leaving the page before the 2 second timer runs) */
  const flushSave = async () => {
    await autosave.flush();
  };

  /**
   * The last step's verb: the quest is complete, so mark it Ready (no longer a draft) and save it for good. Returns
   * false, saving nothing, while it is not complete; the wizard keeps the verb shut until then. The page says "Ready".
   */
  const markReady = async (): Promise<boolean> => {
    if (!isValidAdventure.value) return false;
    saving.value = true;
    saveState.value = "saving";
    try {
      achievement.value.achievementName = formatQuestName(
        achievement.value.achievementName
      );
      achievement.value.draft = false;
      await applySuggestedBeast();
      await achievementDb.setTask(questForStorage());
      lastSavedState.value = JSON.stringify(achievement.value);
      saveState.value = "saved";
      return true;
    } catch (error) {
      debug.error("Quest could not be marked Ready:", error);
      saveState.value = "error";
      return false;
    } finally {
      saving.value = false;
    }
  };

  // Watchers
  watch(
    achievement,
    () => {
      autosave();
    },
    { deep: true }
  );

  watch(fibonacciIndex, (newIndex) => {
    const isValidDifficultyStep =
      newIndex >= 0 && newIndex < fibonacciArray.length;
    if (isValidDifficultyStep) {
      const targetDiff = fibonacciArray[newIndex];
      // Only update if changed prevents loop
      if (achievement.value.difficulty !== targetDiff) {
        achievement.value.difficulty = targetDiff;
        updatePoints();
      }
    }
  });

  const toggleApproval = (val: boolean) => {
    achievement.value.requiresApproval = val;
    autosave(); // Trigger save
  };

  const toggleBonus = (val: boolean) => {
    achievement.value.bonusAchievement = val;
    autosave(); // Trigger save
  };

  return {
    // State
    achievement,
    achievements,
    beasts,
    categories,
    users,
    id,
    loading,
    saving,
    saveState,
    saveNow,
    categoryQuestCounts,
    getValidationMessage,

    // UI
    adventureType: computed({
      get: () => achievement.value.adventureType,
      set: (val) => (achievement.value.adventureType = val),
    }),
    addCategoryModalOpen,
    endsModalOpen,
    startsModalOpen,
    dueModalOpen,
    fibonacciIndex,
    fibonacciArray,
    fibonacciDescriptions,
    displayFibonacciValue,
    ...effort,
    ...suggestionForTabs,
    achievementTypes,
    assignmentTypes,
    toggleHero,
    sortedHeroes,

    // Constants / Icons
    ACHIEVEMENT_TYPE_ICONS,
    BASIC_SCHEDULE_ICONS,
    DIFFICULTY_ICONS,
    difficultyIcon,
    isFibonacci,
    saveBtnDisabled,

    // Computed
    isValidAdventure,
    isAssignmentSelected,
    isDepthSelected,
    activeAdventureType: computed(() => {
      const depth = achievement.value.adventureType;
      const assignment = achievement.value.type || "asNeeded";
      const combo = LORE_COMBO_MATRIX[assignment]?.[depth];

      const base = achievementTypes.find((t) => t.value === depth) || {
        name: "Select",
        value: "",
        icon: "fa-question-circle",
        text: "Choose a quest type",
        example: "",
      };

      if (combo) {
        return {
          ...base,
          icon: combo.icon,
          name: combo.name,
        };
      }

      return base;
    }),
    activePartyType: computed(() => {
      return (
        assignmentTypes.find((t) => t.value === achievement.value.type) ||
        assignmentTypes[0]
      );
    }),
    activeLoreCombo,
    activeScheduleIcon,
    activeBeast,
    beastAvatarUrl,
    subAchievements,
    assignedHeroes,
    getUserAvatar: (user: any) => appConfig.$getUserAvatar(user),
    scheduleSummary,
    scheduleTagline,
    isStrategyComplete,
    isPartyComplete,
    isRewardsComplete,
    isTimingComplete,

    // Actions
    loadData,
    markReady,
    flushSave,
    updatePoints,
    increaseDifficulty,
    decreaseDifficulty,
    handleDifficultyChange,
    toggleApproval,
    toggleBonus,

    setupStrategy: async () => {
      // Flush autosave to ensure current state is persisted before navigation
      autosave.flush();

      if (achievement.value.adventureType === "beast") {
        const selectionStore = useBestiarySelectionStore();
        selectionStore.startSelection(
          achievement.value.beastId ? [achievement.value.beastId] : [],
          "xp-achievement-config",
          (ids) => {
            achievement.value.beastId = ids[0] || "";
            // Immediately save when a beast is selected to prevent loss during route transitions
            achievementDb.setTask(questForStorage());
          }
        );
        router.push({ name: "xp-bestiary-select" });
      } else if (achievement.value.adventureType === "chain") {
        // For chains, we still use the reorder modal or a similar mechanism
        // But the user might want a separate selection flow later.
        // For now, let's just trigger the reorder if they have items,
        // or we could show an achievement selector.
        // Since there's no "Achievement Selection Page" yet, we stick to inline or modal.
        // But the user said "configuration... in its own modal" before.
        // Wait, the user's LATEST request says "navigate them to our beast selector page... we dont need a custom modal for it".
        // This likely means ONLY for beasts.
        // So for "chain", maybe they still want the modal I built?
        // But they ALSO said "configuration of the quest type in its own modal" in the previous turn.
        // I think they want a SHARED modal for things that DON'T have a dedicated page.
        // Let's assume for now beasts navigate, others might use common UI.
        // I will keep showTypeConfigModal for chains until told otherwise.
        showTypeConfigModal.value = true;
      }
    },

    // Selectors
    showQuestTypeSelector,
    showPartyTypeSelector,
    showTypeConfigModal,
    showApprovalModal,
    showBonusModal,

    // Category Actions
    /** Tapping a category in the modal files the quest under it */
    pickCategory: (cat: AchievementCategoryInterface) => {
      achievement.value.categoryId = cat.id;
    },
    /** A typed name that is already a category (any case or spacing) is picked, never added a second time */
    addCategory: async (cat: AchievementCategoryInterface) => {
      const existing = findCategory(categories.value, cat.name);
      if (existing) {
        achievement.value.categoryId = existing.id;
        return;
      }
      await categoryDb.setCategory({ ...cat, name: cleanCategoryName(cat.name) });
      const all = await categoryDb.getAll();
      categories.value = all.sort(sortCategoryByName);
      achievement.value.categoryId = cat.id;
    },
    deleteCategory: async (cat: any) => {
      // The category modal refuses this already; never leave a quest pointing at a deleted category
      if (categoryQuestCounts.value[cat.id]) return;
      await categoryDb.remove(cat.id);
      const all = await categoryDb.getAll();
      categories.value = all.sort(sortCategoryByName);
    },
    editCategories: async (cats: any) => {
      await categoryDb.setCategories(cats);
      const all = await categoryDb.getAll();
      categories.value = all.sort(sortCategoryByName);
    },

    // Modals
    dismissModal: () => {
      modalController.dismiss();
    },
    clickReorder: async () => {
      const achievementChain = (achievement.value.subAchievementIds || [])
        .map((id: string) => achievements.value.find((a) => a.id === id))
        .filter(Boolean);

      const modal = await modalController.create({
        component: XpReorderAchievementsModal,
        componentProps: {
          achievements: achievementChain,
        },
      });

      modal.onDidDismiss().then(({ data }) => {
        if (data) achievement.value.subAchievementIds = data;
      });

      await modal.present();
    },

    // AI Scheduler
    isGeneratingSchedule,
    generateScheduleWithAI: async () => {
      // Lazy import to avoid circular dependency issues if any, or just standard import usage
      const { generateSchedule, isGeminiConfigured } = await import(
        "@/lib/services/ai/GeminiService"
      );

      if (!isGeminiConfigured()) {
        // AI helpers are XP Pro: show the upsell instead of a "not configured" message
        await useProStore().requirePro("aiHelpers");
        return;
      }

      if (!achievement.value.achievementName) {
        const toast = await toastController.create({
          message: "Please name your quest first!",
          duration: 2000,
          color: "warning",
          position: "top",
        });
        await toast.present();
        return;
      }

      // Gather Context
      let beastName;
      let checklist: string[] = [];

      const isChallengingBeast =
        achievement.value.adventureType === "beast" && activeBeast.value;
      // If Beast
      if (isChallengingBeast) {
        beastName = activeBeast.value.name;
        checklist = activeBeast.value.checklist || [];
      }

      // If Chain
      else if (achievement.value.adventureType === "chain") {
        checklist = subAchievements.value
          .map((s) => s?.achievementName) // Safe access
          .filter((name): name is string => !!name);
      }

      isGeneratingSchedule.value = true;
      try {
        const result = await generateSchedule({
          taskName: achievement.value.achievementName,
          beastName,
          checklist,
        });

        if (result.success && result.scheduleType) {
          // Reset relevant fields
          achievement.value.customFrequency = 1;
          achievement.value.customPeriodNumber = 1;

          if (result.scheduleType === "custom") {
            achievement.value.basicSchedule = "custom";
            achievement.value.scheduleType = "custom";
            achievement.value.customFrequency = result.frequency || 1;
            achievement.value.customPeriodNumber = result.periodNumber || 1;
            achievement.value.customPeriodType = result.periodType || "week";
          } else {
            // Basic types (daily, weekly, once)
            achievement.value.basicSchedule = result.scheduleType;
            achievement.value.scheduleType = "basic";

            // Map frequency if provided (e.g. 2 times daily)
            if (result.frequency && result.frequency > 1) {
              achievement.value.customFrequency = result.frequency;
            }

            // Map days for weekly
            if (
              result.scheduleType === "weekly" &&
              result.days &&
              result.days.length > 0
            ) {
              achievement.value.repeatOnDays = result.days;
            }
          }

          const toast = await toastController.create({
            message: `Oracle Suggestion: ${
              result.reasoning || "Schedule Updated!"
            }`,
            duration: 4000,
            color: "tertiary",
            position: "top",
            icon: "star",
          });
          await toast.present();
        } else {
          throw new Error(result.error || "Failed to generate schedule");
        }
      } catch (error) {
        console.error("AI Schedule Error", error);
        const toast = await toastController.create({
          message: "The Oracle is silent right now. Try again later.",
          duration: 3000,
          color: "danger",
          position: "top",
        });
        await toast.present();
      } finally {
        isGeneratingSchedule.value = false;
      }
    },
  };
}
