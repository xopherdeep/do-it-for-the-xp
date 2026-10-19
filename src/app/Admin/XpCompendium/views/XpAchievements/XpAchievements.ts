import { defineComponent, ref, watch } from "vue";
import { useUserStore } from "@/lib/store/stores/user";
import { alertController, actionSheetController, toastController } from "@ionic/vue";
import ionic from "@/lib/mixins/ionic";
import { useRoute } from "vue-router";

import {
  addOutline,
  addSharp,
  searchOutline,
  searchSharp,
  thumbsUpOutline,
  thumbsUpSharp,
  createOutline,
  compassOutline,
  listOutline,
  cloudUploadOutline,
  shareOutline,
  trashOutline,
  copyOutline,
} from "ionicons/icons";

import { LORE_COMBO_MATRIX } from "@/constants";
import { formatQuestName } from "@/lib/utils/format";
import { formatPoints } from "@/lib/services/quests/QuestLabels";
import { sanitizeHtml } from "@/lib/utils/sanitizeHtml";

import AchievementDb, {
  achievementStorage,
  achievementCategoryStorage,
  Achievement,
  AchievementCategoryDb,
  AchievementCategoryInterface,
} from "@/lib/databases/AchievementDb";
import BestiaryDb, { beastStorage, Beast } from "@/lib/databases/BestiaryDb";

import XpAchievementItem from "./XpConfigAchievement/components/XpAchievementItem.vue";
import XpRpgPage from "@/components/templates/pages/XpRpgPage.vue";
import { confirmDelete } from "@/hooks/useConfirmDelete";
import { deleteQuest, usageOfQuest } from "@/lib/services/compendium/deleteContent";
import { listedQuests } from "@/lib/services/quests/QuestList";

export default defineComponent({
  name: "xp-achievements",
  mixins: [ionic],
  components: { XpRpgPage, XpAchievementItem },
  data() {
    return {
      viewMode: "list" as "list" | "grid",
    };
  },
  computed: {
    usersAz() {
      return (this as any).userStore.usersAz;
    },
    users() {
      return (this as any).usersAz;
    },

    hasAchievements() {
      return this.groupedAchievements?.length > 0;
    },

    flatAchievements() {
      return (this as any).filteredAchievements || [];
    },

    emptyStateIcon() {
      const icons: Record<string, string> = {
        category: "fad fa-hand-holding-seedling fa-4x",
        assignee: "fad fa-users fa-4x",
        asNeeded: "fad fa-scroll-old fa-4x",
        expired: "fad fa-check-circle fa-4x",
      };
      return icons[(this as any).groupBy] || icons.category;
    },

    emptyStateTitle() {
      const titles: Record<string, string> = {
        category: "No Quests Yet",
        assignee: "No Assigned Quests",
        asNeeded: "No Bounty Quests",
        expired: "All Caught Up!",
      };
      return titles[(this as any).groupBy] || titles.category;
    },

    emptyStateMessage() {
      const messages: Record<string, string> = {
        category: "Create your first quest to get started!",
        assignee: "Assign heroes to quests to see them here.",
        asNeeded: "Bounties are available anytime for heroes to claim!",
        expired: "No expired quests. Great job keeping up!",
      };
      return messages[(this as any).groupBy] || messages.category;
    },

    filteredAchievements() {
      return (this as any).achievements?.filter(
        (this as any).filterAchievement
      );
    },
    expiredAchievements() {
      const now = new Date();
      return (this as any).filteredAchievements?.filter(
        (achievement: any) => new Date(achievement.endsOn) < now
      );
    },

    asNeededAchievements() {
      return (this as any).filteredAchievements?.filter(
        (achievement: any) => achievement.type === "asNeeded"
      );
    },

    groupedAchievements() {
      const groupAchievements = (grouped: any, achievement: any) => {
        const category = grouped.find(
          (group: any) => group.categoryId === achievement.categoryId
        );
        // A quest can have several assignees: it joins the group of each one, creating the group when it is new.
        const assigneeIds: any[] = [achievement.assignee].flat().filter(Boolean);

        switch ((this as any).groupBy) {
          case "assignee":
            assigneeIds.forEach((assigneeId: any) => {
              const group = grouped.find((g: any) => g.assignee === assigneeId);
              if (group) group.achievements.push(achievement);
              else grouped.push({ assignee: assigneeId, achievements: [achievement] });
            });
            break;

          default:
            if (category) {
              category.achievements.push(achievement);
            } else {
              grouped.push({
                categoryId: achievement.categoryId,
                achievements: [achievement],
              });
            }

            break;
        }

        return grouped;
      };

      return (this as any).filteredAchievements?.reduce(groupAchievements, []);
    },
  },

  watch: {
    groupBy(group) {
      let groupAchievements = () => {
        /** Do nothing */
      };

      switch (group) {
        case "category":
        case "assignee":
          // No specific grouping logic for these cases, so just load achievements.
          break;
        case "asNeeded":
          groupAchievements = () =>
            this.setAchievements(this.asNeededAchievements);
          break;
        case "expired":
          groupAchievements = () =>
            this.setAchievements(this.expiredAchievements);
          break;
      }

      this.loadAchievements().then(groupAchievements as any);
    },
  },

  methods: {
    clickSettings() {
      this.$router.push({ name: "xp-settings-chore" });
    },

    setViewMode(mode: "list" | "grid") {
      this.viewMode = mode;
    },

    async loadAchievements() {
      this.isLoading = true;
      const [achievements, beasts] = await Promise.all([
        this.achievementDb.getTasks(),
        this.bestiaryDb.getAll(),
      ]);
      // The Game Master's list keeps the drafts: each wears its Draft badge
      this.setAchievements(listedQuests(achievements, "gameMaster"));
      (this as any).beasts = beasts;
    },

    setAchievements(achievements: Achievement[]) {
      this.achievements = achievements;
      this.isLoading = false;
    },

    clickFilter() {
      this.showFilters = !this.showFilters;
    },
    clickAdd() {
      this.$router.push({
        name: "xp-achievement-config-dashboard",
        params: { id: "new" },
      });
    },
    clickDiscover() {
      this.$router.push("/game-master/discover-achievements");
    },
    async presentQuestOptions(achievement: Achievement) {
      const actionSheet = await actionSheetController.create({
        header: achievement.achievementName,
        subHeader:
          this.getCategoryById(achievement.categoryId)?.name || "Uncategorized",
        mode: "ios",
        buttons: [
          {
            text: "Edit Quest",
            icon: createOutline,
            cssClass: "action-edit",
            handler: () => {
              this.clickEdit(achievement.id);
            },
          },
          {
            text: "Copy Quest",
            icon: copyOutline,
            cssClass: "action-medium",
            handler: () => {
              this.clickCloneAchievement(achievement);
            },
          },
          {
            text: "Delete Quest",
            role: "destructive",
            icon: trashOutline,
            // role destructive: the Earthbound theme paints it light red
            cssClass: "action-delete",
            handler: () => {
              this.clickDeleteAchievement(achievement);
            },
          },
          {
            text: "Cancel",
            role: "cancel",
          },
        ],
      });
      await actionSheet.present();
    },
    clickEdit(id) {
      this.$router.push({
        name: "xp-achievement-config-dashboard",
        params: { id },
      });
    },
    clickCloneAchievement(task: Achievement) {
      const { achievementDb, loadAchievements } = this as any;
      achievementDb.cloneTask(task).then(loadAchievements);
    },
    async clickDeleteAchievement(task: Achievement) {
      const isDeleted = await confirmDelete({
        kind: "quest",
        name: task.achievementName,
        usage: () => usageOfQuest(task.id),
        detaching: "Deleting it takes the quest off them first; a temple room left with no quest gets a random beast.",
        note: "A claim a hero already made stays in Approvals, so it can still be paid.",
        run: () => deleteQuest(task),
      });
      if (isDeleted) await (this as any).loadAchievements();
    },
    filterAchievement(achievement: Achievement) {
      const { searchText } = this as any;
      const { achievementName } = achievement;
      if (!searchText) return true;

      const lowerName = achievementName?.toLowerCase();
      const lowerSearch = searchText?.toLowerCase();
      const indexOf = lowerName.indexOf(lowerSearch);

      return lowerName ? indexOf > -1 : !lowerSearch;
    },

    async loadCategories() {
      const categories = await (this as any).categoryDb.getAll();
      (this as any).categories = categories.sort(
        (this as any).sortCategoryByName
      );
    },

    getCategoryById(id: string) {
      const findCatById = (cat: any) => cat.id === id;
      return (this as any).categories.find(findCatById);
    },

    getAssigneeById(id: string) {
      const findUserById = (user: any) => user.id === id;
      return (this as any).users.find(findUserById);
    },
    async presentActionSheet() {
      const actionSheet = await actionSheetController.create({
        header: "Quest Actions",
        cssClass: "achievements-action-sheet",
        mode: "ios",
        buttons: [
          {
            text: "Create New Quest",
            icon: createOutline,
            cssClass: "action-create rpg-box",
            handler: () => {
              this.clickAdd();
            },
          },
          {
            text: "Discover Quests",
            icon: compassOutline,
            cssClass: "action-discover",
            handler: () => {
              this.clickDiscover();
            },
          },
          {
            text: "Import Quests",
            icon: cloudUploadOutline,
            cssClass: "action-import",
            handler: () => {
              this.achievementDb.importAchievements(() =>
                this.loadAchievements()
              );
            },
          },
          {
            text: "Export Quests",
            icon: shareOutline,
            cssClass: "action-export",
            handler: () => {
              this.achievementDb.exportAchievements();
            },
          },
          {
            text: "Bulk Import (Text)",
            icon: listOutline,
            cssClass: "action-bulk-import",
            handler: () => {
              this.clickBulkImport();
            },
          },
          {
            text: "Cancel",
            role: "cancel",
            cssClass: "action-cancel",
            handler: () => {
              // Just close the action sheet
            },
          },
        ],
      });
      await actionSheet.present();
    },

    getAchievementTypeIcon(achievement: Achievement) {
      const assignment = achievement.type || "asNeeded";
      const depth = achievement.adventureType || "simple";
      const combo = LORE_COMBO_MATRIX[assignment]?.[depth] || {
        icon: "fa-scroll",
      };
      return `fad ${combo.icon} fa-3x`;
    },

    getBeastAvatar(achievement: Achievement) {
      const beast = (this as any).beasts?.find(
        (b) => b.id === achievement.beastId
      );
      if (!beast) return null;
      const imageUrl = beast.imageUrl;
      if (imageUrl) return imageUrl;
      const localImage = beast.localImage;
      if (localImage) return localImage;
      const avatar = beast.avatar;
      if (avatar) {
        try {
          const pad = avatar.toString().padStart(3, "0");
          return require(`@/assets/images/beasts/${pad}.webp`);
        } catch {
          return null;
        }
      }
      return null;
    },

    async clickBulkImport() {
      const alert = await alertController.create({
        header: "Bulk Import Quests",
        subHeader: "Enter one quest title per line",
        message:
          "Each line will be imported as a basic quest with default settings.",
        mode: "ios",
        cssClass: "bulk-import-alert",
        inputs: [
          {
            name: "questList",
            type: "textarea",
            placeholder: `Clean the kitchen
Take out trash
Wash dishes
Vacuum living room
Feed the pets`,
            attributes: {
              rows: 10,
            },
          },
        ],
        buttons: [
          {
            text: "Cancel",
            role: "cancel",
          },
          {
            text: "Import",
            handler: async (data) => {
              await this.processBulkImport(data.questList);
            },
          },
        ],
      });
      await alert.present();
    },

    async processBulkImport(questList: string) {
      const isQuestListEmpty = !questList || !questList.trim();
      if (isQuestListEmpty) {
        return;
      }

      const lines = questList
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      const hasNoLines = lines.length === 0;
      if (hasNoLines) {
        return;
      }

      const { achievementDb, loadAchievements } = this as any;

      for (const questTitle of lines) {
        const newQuest = {
          ...AchievementDb.getDefault(),
          achievementName: questTitle,
        };
        await achievementDb.setTask(newQuest);
      }

      // Reload the achievements list
      await loadAchievements();

      // Show success toast
      const toast = await toastController.create({
        message: `Imported ${lines.length} quest${lines.length !== 1 ? "s" : ""}.`,
        duration: 2500,
        position: "top",
        cssClass: "rpg-toast",
      });
      await toast.present();
    },
  },
  mounted() {
    this.loadAchievements();
    this.loadCategories();
  },
  updated() {
    // this.loadAchievements();
  },
  setup() {
    const userStore = useUserStore();
    const achievements = ref();
    const searchText = ref("");
    const showFilters = ref(false);
    const groupBy = ref("category");
    const achievementDb = new AchievementDb(achievementStorage);
    const categoryDb = new AchievementCategoryDb(achievementCategoryStorage);
    const bestiaryDb = new BestiaryDb(beastStorage);
    const categories = ref([] as AchievementCategoryInterface[]);
    const beasts = ref([] as Beast[]);

    const sortCategoryByName = (a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();

      const isBefore = nameA < nameB;
      if (isBefore) {
        return -1;
      }

      const isAfter = nameA > nameB;
      if (isAfter) {
        return 1;
      }

      return 0;
    };

    const showPoints = ref(true);
    const isLoading = ref(true);

    const route = useRoute();
    watch(
      () => route.path,
      async (newPath, oldPath) => {
        const isRouteChanged = newPath !== oldPath;
        if (isRouteChanged) {
          // Reload your component's data when the route changes
          achievements.value = await achievementDb.getAll();
        }
      },
      { immediate: true } // Fetch data immediately when the component is created
    );

    return {
      userStore,
      achievementDb,
      achievements,
      addOutline,
      addSharp,
      categories,
      categoryDb,
      groupBy,
      isLoading,
      searchOutline,
      searchSharp,
      searchText,
      showFilters,
      showPoints,
      sortCategoryByName,
      thumbsUpOutline,
      thumbsUpSharp,
      bestiaryDb,
      beasts,
      formatQuestName,
      formatPoints,
      sanitizeHtml,
    };
  },
});
