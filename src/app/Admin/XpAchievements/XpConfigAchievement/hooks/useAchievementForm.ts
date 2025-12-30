import { ref, computed, watch, InjectionKey } from "vue";
import { useRouter } from "vue-router";
import { alertController, toastController, modalController } from "@ionic/vue";
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
import { profileStorage } from "@/app/SideMenu/SwitchProfile/SwitchProfile.vue";
import { useBestiarySelectionStore } from "@/lib/store/stores/bestiary-selection";
import appConfig from "@/app.config";
import {
  DIFFICULTY_ICONS,
  ACHIEVEMENT_TYPE_ICONS,
  BASIC_SCHEDULE_ICONS,
} from "@/constants";
import XpReorderAchievementsModal from "../components/XpReorderAchievementsModal.vue";

export const sortCategoryByName = (a: any, b: any) => {
  const nameA = a.name.toLowerCase();
  const nameB = b.name.toLowerCase();
  if (nameA < nameB) return -1;
  if (nameA > nameB) return 1;
  return 0;
};

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
  const achievement = ref<Achievement>(AchievementDb.getDefault());

  const achievements = ref<Achievement[]>([]);
  const beasts = ref<Beast[]>([]);
  const categories = ref<AchievementCategoryInterface[]>([]);
  const users = ref<User[]>([]);

  const loading = ref(false);
  const saving = ref(false);
  const lastSavedState = ref("");

  // UI State
  const activeSegment = ref("dashboard");
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

  const segments = computed(() => {
    const type = achievement.value.adventureType;
    let typeName = "Type";
    let typeIcon = "fa-shapes"; // valid fad icon? yes.

    if (type === "beast") {
      typeName = "Beast";
      typeIcon = "fa-dragon";
    } else if (type === "chain") {
      typeName = "Chain";
      typeIcon = "fa-link";
    }

    return [
      { name: "Points", icon: "fa-hand-holding-medical", path: "points" },
      { name: "Heros", icon: "fa-users", path: "heros" },
      { name: "Quest", icon: "fa-cubes", path: "dashboard" },
      { name: typeName, icon: typeIcon, path: "quest-type" },
      { name: "When", icon: "fa-calendar", path: "when" },
    ];
  });

  // Achievement types for bottom tab bar
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

  // Lore Combo Matrix - combines Assignment + Depth into thematic quest names
  const loreComboMatrix: Record<
    string,
    Record<string, { name: string; icon: string; tagline: string }>
  > = {
    asNeeded: {
      simple: {
        name: "Public Bounty",
        icon: "fa-scroll",
        tagline: "A simple favor for the local townsfolk",
      },
      beast: {
        name: "Monster Hunt",
        icon: "fa-skull-crossbones",
        tagline: "The cryptid is back! Wanted: Dead not Alive",
      },
      chain: {
        name: "Guild Campaign",
        icon: "fa-map-marked-alt",
        tagline: "A multi-stage expedition for the guild",
      },
    },
    individual: {
      simple: {
        name: "Han Solo",
        icon: "fa-user-astronaut",
        tagline: "A lone hero on a simple errand",
      },
      beast: {
        name: "Vendetta",
        icon: "fa-swords",
        tagline: "Face the beast alone in single combat",
      },
      chain: {
        name: "Personal Saga",
        icon: "fa-route",
        tagline: "An epic personal journey across the realms",
      },
    },
    collaborate: {
      simple: {
        name: "Party Event",
        icon: "fa-users",
        tagline: "The whole party helps a neighbor",
      },
      beast: {
        name: "Boss Raid",
        icon: "fa-dragon",
        tagline: "Unite the guild to slay the behemoth!",
      },
      chain: {
        name: "Epic Saga",
        icon: "fa-dungeon",
        tagline: "A legendary multi-chapter tale for the party",
      },
    },
    rotate: {
      simple: {
        name: "Shift Duty",
        icon: "fa-sync",
        tagline: "A cycle of mundane civic duties",
      },
      beast: {
        name: "Rotating Challenge",
        icon: "fa-crosshairs",
        tagline: "The monster returns... who is next to fight?",
      },
      chain: {
        name: "Seasonal Arc",
        icon: "fa-calendar-alt",
        tagline: "A recurring adventure for the rotating heroes",
      },
    },
    compete: {
      simple: {
        name: "Time Trial",
        icon: "fa-rabbit-fast",
        tagline: "Race to finish the NPC errand first!",
      },
      beast: {
        name: "Arena Battle",
        icon: "fa-trophy",
        tagline: "Last hero standing against the beast wins",
      },
      chain: {
        name: "Tournament",
        icon: "fa-crown",
        tagline: "A multi-round champion of champions challenge",
      },
    },
  };

  const activeLoreCombo = computed(() => {
    const assignment = achievement.value.type || "asNeeded";
    const depth = achievement.value.adventureType || "";
    return (
      loreComboMatrix[assignment]?.[depth] || {
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
      const pad = activeBeast.value.avatar.toString().padStart(3, "0");
      return new URL(`/src/assets/images/beasts/${pad}.png`, import.meta.url)
        .href;
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
    if (a.basicSchedule === "custom" || a.scheduleType === "custom") {
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
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return a.name.first.localeCompare(b.name.first);
    });
  });

  // Clear assignees when switching to 'As Needed' type
  watch(
    () => achievement.value.type,
    (newType) => {
      if (newType === "asNeeded") {
        achievement.value.assignee = [];
        // If currently on Heros tab, switch to Quest tab
        if (activeSegment.value === "heros") {
          activeSegment.value = "dashboard";
        }
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

  // Validation
  const isValidAdventure = computed(() => {
    const a = achievement.value;
    if (!a.achievementName?.trim()) return false;
    if (!a.categoryId) return false;
    if (!a.difficulty) return false;

    return isStrategyComplete.value && isPartyComplete.value;
  });

  const getValidationMessage = () => {
    const messages: string[] = [];
    if (!achievement.value.achievementName?.trim())
      messages.push("• Name your achievement");
    if (!achievement.value.categoryId) messages.push("• Select a category");
    if (!achievement.value.difficulty)
      messages.push("• Set the difficulty level");

    if (
      achievement.value.adventureType === "beast" &&
      !achievement.value.beastId
    ) {
      messages.push("• Choose a beast to challenge");
    }
    if (
      achievement.value.adventureType === "chain" &&
      !achievement.value.subAchievementIds?.length
    ) {
      messages.push("• Add achievements to your quest chain");
    }
    return messages.join("\n");
  };

  // Actions
  const loadData = async (routeId?: string) => {
    loading.value = true;
    try {
      // Update ID if provided
      if (routeId) {
        id.value = routeId;
      } else {
        // Fallback to route param if not set (legacy support)
        const paramId = router.currentRoute.value.params.id as string;
        if (paramId && paramId !== "new") {
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

      if (id.value && id.value !== "new") {
        const task = await achievementDb.getTaskById(id.value);
        if (task) {
          achievement.value = { ...achievement.value, ...task };

          // Honor stored adventureType, or infer if legacy
          if (!task.adventureType) {
            const hasBeast = !!task.beastId;
            const hasSub =
              task.subAchievementIds && task.subAchievementIds.length > 0;
            achievement.value.adventureType = hasBeast
              ? "beast"
              : hasSub
              ? "chain"
              : "simple";
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
        if (id.value && id.value !== "new") achievement.value.id = id.value;
      }

      // Store initial state for change detection
      lastSavedState.value = JSON.stringify(achievement.value);
    } finally {
      loading.value = false;
    }
  };

  // Debounced Autosave
  const autosave = debounce(async () => {
    const currentState = JSON.stringify(achievement.value);
    if (currentState === lastSavedState.value) return;

    // Auto-save regardless of validity? Or only valid?
    // Let's save as draft if we can, but since DB structure is simple,
    // maybe we just save it.
    // User requested "form needs to be saved or autosave".

    saving.value = true;
    try {
      await achievementDb.setTask(achievement.value);
      lastSavedState.value = currentState;
      // Optional: show subtle indicator
    } catch {
      // Autosave failed - silently ignore or handle error
    } finally {
      saving.value = false;
    }
  }, 2000); // 2 second debounce

  const saveManual = async () => {
    if (!isValidAdventure.value) {
      const alert = await alertController.create({
        header: "Incomplete Adventure",
        message: getValidationMessage(),
        buttons: ["OK"],
      });
      await alert.present();
      return;
    }

    await achievementDb.setTask(achievement.value);
    const toast = await toastController.create({
      message: "Achievement Saved!",
      duration: 2000,
      color: "success",
    });
    await toast.present();
    router.go(-1);
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
    if (newIndex >= 0 && newIndex < fibonacciArray.length) {
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

    // UI
    activeSegment,
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
    segments,
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
      const type = achievement.value.adventureType;
      return (
        achievementTypes.find((t) => t.value === type) || {
          name: "Select",
          value: "",
          icon: "fa-question-circle",
          text: "Choose a quest type",
          example: "",
        }
      );
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
    saveManual,
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
            achievementDb.setTask(achievement.value);
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
    addCategory: async (cat: any) => {
      await categoryDb.setCategory(cat);
      const all = await categoryDb.getAll();
      categories.value = all.sort(sortCategoryByName);
      achievement.value.categoryId = cat.id;
    },
    deleteCategory: async (cat: any) => {
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
  };
}
