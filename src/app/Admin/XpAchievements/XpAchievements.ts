import { defineComponent, ref, watch } from "vue";
import { useUserStore } from "@/lib/store/stores/user";
import { alertController, actionSheetController } from "@ionic/vue";
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
} from "ionicons/icons";

import { ACHIEVEMENT_TYPE_ICONS } from "@/constants";

import AchievementDb, {
  achievementStorage,
  achievementCategoryStorage,
  Achievement,
  AchievementCategoryDb,
  AchievementCategoryInterface,
} from "@/lib/databases/AchievementDb";

import XpAchievementItem from "./XpConfigAchievement/components/XpAchievementItem.vue";
import XpRpgPage from "@/components/templates/pages/XpRpgPage.vue";

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
        // TODO: do the same for assignee, but its an array of ids
        const assignee = grouped.find((group: any) =>
          achievement.assignee.includes(group.assignee)
        );

        switch ((this as any).groupBy) {
          case "assignee":
            if (assignee) {
              assignee.achievements.push(achievement);
            } else if (achievement.assignee) {
              achievement.assignee.forEach((assignee: any) => {
                grouped.push({ assignee, achievements: [achievement] });
              });
            }
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
      const achievements = await this.achievementDb.getTasks();
      this.setAchievements(achievements);
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
    deleteTask(task: Achievement) {
      const { achievementDb, loadAchievements } = this as any;
      achievementDb.deleteTask(task).then(loadAchievements);
    },
    async clickDeleteAchievement(task: Achievement) {
      const alert = await alertController.create({
        header: "Delete " + task.achievementName + "?",
        subHeader: "Are you sure you want to delete this achievement?",
        message: "This action cannot be undone.",
        mode: "ios",
        buttons: [
          {
            text: "Cancel",
            role: "cancel",
            handler: () => {
              // handlerMessage.value = "Alert canceled";
            },
          },

          {
            text: "OK",
            role: "confirm",
            handler: () => this.deleteTask(task),
          },
        ],
      });

      await alert.present();
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
            cssClass: "action-create",
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

    getAchievementTypeIcon(type: string) {
      const icon =
        ACHIEVEMENT_TYPE_ICONS[type as keyof typeof ACHIEVEMENT_TYPE_ICONS];
      return `fad ${icon || "fa-scroll"} fa-3x`;
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
    const categories = ref([] as AchievementCategoryInterface[]);

    const sortCategoryByName = (a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();

      if (nameA < nameB) {
        return -1;
      }

      if (nameA > nameB) {
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
        if (newPath !== oldPath) {
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
    };
  },
});
