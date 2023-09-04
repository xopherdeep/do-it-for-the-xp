import { defineComponent, ref, watch } from "vue";
import { mapGetters } from "vuex";
import { alertController } from "@ionic/vue";
import ionic from "@/mixins/ionic";
import { useRouter, useRoute } from 'vue-router';

import {
  addOutline,
  addSharp,
  searchOutline,
  searchSharp,
  thumbsUpOutline,
  thumbsUpSharp,
} from "ionicons/icons";

import AchievementDb, {
  achievementStorage,
  achievementCategoryStorage,
  Achievement,
  AchievementCategoryDb,
  AchievementCategoryInterface
} from "@/databases/AchievementDb"

import XpAchievementItem from "./XpAddAchievement/components/XpAchievementItem.vue";

export default defineComponent({
  name: "xp-achievements",
  mixins: [ionic],
  components: { XpAchievementItem },
  computed: {
    ...mapGetters(["usersAz"]),
    users() { return this.usersAz },

    hasAchievements() {
      return this.groupedAchievements?.length > 0;
    },
    filteredAchievements() {
      return this.achievements?.filter(this.filterAchievement);
    },
    expiredAchievements() {
      const now = new Date();
      return this.filteredAchievements?.filter(achievement => new Date(achievement.endsOn) < now);
    },

    asNeededAchievements() {
      return this.filteredAchievements?.filter(achievement => achievement.type === "asNeeded");
    },

    groupedAchievements() {
      const groupAchievements = (grouped, achievement) => {
        const category = grouped.find(group => group.categoryId === achievement.categoryId);
        // TODO: do the same for assignee, but its an array of ids
        const assignee = grouped.find(group => achievement.assignee.includes(group.assignee));

        switch (this.groupBy) {
          case "assignee":
            if (assignee) {
              assignee.achievements.push(achievement);
            } else if (achievement.assignee) {
              achievement.assignee.forEach(assignee => {
                grouped.push({ assignee, achievements: [achievement] });
              });
            }
            break;

          default:

            if (category) {
              category.achievements.push(achievement);
            } else {
              grouped.push({ categoryId: achievement.categoryId, achievements: [achievement] });
            }

            break;
        }

        return grouped;
      }

      return this.filteredAchievements?.reduce(groupAchievements, []);

    },
  },

  watch: {
    groupBy(group) {
      let groupAchievements = () => { /** Do nothing */ };

      switch (group) {
        case "category":
        case "assignee":
          // No specific grouping logic for these cases, so just load achievements.
          break;
        case "asNeeded":
          groupAchievements = () => this.setAchievements(this.asNeededAchievements);
          break;
        case "expired":
          groupAchievements = () => this.setAchievements(this.expiredAchievements);
          break;
      }

      this.loadAchievements().then(groupAchievements);
    },
  },

  methods: {
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
      this.showFilters = !this.showFilters
    },
    clickAdd() {
      this.$router.push("/add-achievement");
    },
    clickDiscover() {
      this.$router.push("/discover-achievements");
    },
    clickEdit(id) {
      this.$router.push({
        name: "xp-add-achievement",
        params: { id },
      });
    },
    clickCloneAchievement(task: Achievement) {
      const { achievementDb, loadAchievements } = this;
      achievementDb.cloneTask(task).then(loadAchievements);
    },
    deleteTask(task: Achievement) {
      const { achievementDb, loadAchievements } = this;
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
      const { searchText } = this;
      const { achievementName } = achievement;
      if (!searchText) return true;

      const lowerName = achievementName?.toLowerCase();
      const lowerSearch = searchText?.toLowerCase();
      const indexOf = lowerName.indexOf(lowerSearch);

      return lowerName ? indexOf > -1 : !lowerSearch;
    },

    async loadCategories() {
      const categories = await this.categoryDb.getAll();
      this.categories = categories.sort(this.sortCategoryByName);
    },

    getCategoryById(id: string) {
      const findCatById = cat => cat.id === id;
      return this.categories.find(findCatById);
    },

    getAssigneeById(id: string) {
      const findUserById = user => user.id === id
      return this.users.find(findUserById);
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
    const achievements = ref();
    const searchText = ref("");
    const showFilters = ref(false)
    const groupBy = ref("category");
    const achievementDb = new AchievementDb(achievementStorage);
    const categoryDb = new AchievementCategoryDb(achievementCategoryStorage)
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
    }

    const showPoints = ref(true)
    const isLoading = ref(true)


    const route = useRoute();
    watch(
      () => route.path,
      async (newPath, oldPath) => {
        if (newPath !== oldPath) {
          // Reload your component's data when the route changes
          achievements.value = await achievementDb.getAll();
        }
      },
      { immediate: true }  // Fetch data immediately when the component is created
    );

    return {
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
