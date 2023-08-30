<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/game-master" />
        </ion-buttons>
        <ion-title> XP Game Master Achievements</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="clickFilter">
            <i class="fad fa-filter fa-lg" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar v-if="showFilters">
        <ion-select
          label="Stacked label"
          label-placement="stacked"
          placeholder="Group by..."
          v-model="groupBy"
        >
          <ion-select-option value="category">
            Category
          </ion-select-option>
          <!-- <ion-select-option value="assignee">
            Assignee
          </ion-select-option> -->
        </ion-select>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div
        v-for="(group, index) in groupedAchievements"
        :key="index"
      >
        <ion-item-group>
          <ion-item-divider>
            <ion-label>{{ group.category }}</ion-label>
          </ion-item-divider>
          <ion-item-sliding
            v-for="(achievement, index) in filteredAchievements"
            :key="index"
          >
            <xp-achievement-item
              :achievement="achievement"
              :categories="categories"
            >
              <template #end>
                <i
                  class="fad fa-grip-vertical ml-2"
                  slot="end"
                />
              </template>
            </xp-achievement-item>
            <ion-item-options side="start">
              <ion-item-option
                color="danger"
                @click="clickDeleteAchievement(achievement)"
              >
                <i class="fad fa-trash fa-lg"></i>
              </ion-item-option>
            </ion-item-options>
            <ion-item-options side="end">
              <ion-item-option @click="clickEdit(achievement.id)">
                <!-- Edit -->
                <i class="fa fad fa-edit fa-lg mx-2"></i>
              </ion-item-option>
              <ion-item-option @click="clickCloneAchievement(achievement)">
                <i class="fa fad fa-copy fa-lg mx-2"></i>
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </ion-item-group>


      </ion-list>
    </ion-content>
    <ion-fab
      slot="fixed"
      vertical="bottom"
      horizontal="end"
    >
      <ion-fab-button>
        <ion-icon :icon="addOutline" />
      </ion-fab-button>
      <ion-fab-list side="top">
        <ion-fab-button @click="clickAdd">
          <ion-icon :icon="addSharp" />
        </ion-fab-button>
        <ion-fab-button @click="clickDiscover">
          <ion-icon
            :ios="searchOutline"
            :md="searchSharp"
          />
        </ion-fab-button>
        <ion-fab-button>
          <ion-icon
            :ios="thumbsUpOutline"
            :md="thumbsUpSharp"
          />
        </ion-fab-button>
      </ion-fab-list>
    </ion-fab>
    <ion-footer>
      <ion-toolbar color="light">
        <ion-grid>
          <ion-row>
            <ion-col class="ion-no-padding">
              <ion-searchbar
                color="light"
                v-model="searchText"
              ></ion-searchbar>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent, ref } from "vue";
  import ionic from "@/mixins/ionic";

  import {
    addOutline,
    addSharp,
    searchOutline,
    searchSharp,
    thumbsUpOutline,
    thumbsUpSharp,
  } from "ionicons/icons";
  import { alertController } from "@ionic/vue";
  import type { Achievement } from "@/databases/AchievementDb";
  import { Drivers, Storage } from "@ionic/storage";

  import XpAchievementItem from "./XpAddAchievement/components/XpAchievementItem.vue";
  import AchievementDb, { AchievementCategoryDb, AchievementCategoryInterface } from "@/databases/AchievementDb"

  import { achievementCategoryStorage } from "./XpAddAchievement/XpAddAchievement.vue";

  export const achievementStorage = new Storage({
    name: "__achievements",
    driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
  });

  export default defineComponent({
    name: "xp-achievements",
    mixins: [ionic],
    components: { XpAchievementItem },

    computed: {
      hasAchievements() {
        return this.groupedAchievements?.length > 0;
      },
      filteredAchievements() {
        return this.achievements?.filter(this.filterAchievement);
      },
      groupedAchievements() {
        if (this.groupBy === 'category') {
          return this.achievements.reduce((grouped, achievement) => {
            const category = grouped.find(group => group.category === achievement.category);
            if (category) {
              category.achievements.push(achievement);
            } else {
              grouped.push({ category: achievement.category, achievements: [achievement] });
            }
            return grouped;
          }, []);
        }
        return this.achievements;
      },
    },
    methods: {
      async loadAchievements() {
        const achievements = await this.storage.getTasks();
        this.setAchievements(achievements);
      },

      setAchievements(achievements: Achievement[]) {
        this.achievements = achievements;
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
        const { storage, loadAchievements } = this;
        storage.cloneTask(task).then(loadAchievements);
      },
      deleteTask(task: Achievement) {
        const { storage, loadAchievements } = this;
        storage.deleteTask(task).then(loadAchievements);
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
        const categories = await this.categoryStorage.getAll();
        this.categories = categories.sort(this.sortCategoryByName);
      },
    },
    mounted() {
      this.loadAchievements();
      this.loadCategories();
    },
    updated() {
      this.loadAchievements();
    },
    setup() {
      const achievements = ref();
      const storage = new AchievementDb(achievementStorage);
      const searchText = ref("");
      const showFilters = ref(false)
      const categoryStorage = new AchievementCategoryDb(achievementCategoryStorage)

      const groupBy = ref("");

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
      return {
        groupBy,
        categories,
        sortCategoryByName,
        categoryStorage,
        showFilters,
        achievements,
        searchText,
        storage,
        addOutline,
        addSharp,
        searchOutline,
        searchSharp,
        thumbsUpOutline,
        thumbsUpSharp,
      };
    },
  });
</script>
<style lang="scss" scoped>
  ion-fab-list {
    ion-fab-button {
      &::before {
        position: absolute;
        right: 53px;
        top: 12px;
        cursor: pointer;
      }

      &:nth-child(1)::before {
        content: "Create your Own ";
      }

      &:nth-child(2)::before {
        content: "Add from Discover";
      }

      &:nth-child(3)::before {
        content: "Add from Recommended";
      }
    }
  }
</style>
