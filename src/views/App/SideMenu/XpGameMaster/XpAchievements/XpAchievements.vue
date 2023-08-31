<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/game-master" />
        </ion-buttons>
        <ion-title>
          Achievements
        </ion-title>
        <ion-buttons slot="end">
          <!-- <ion-button @click="clickFilter">
            <i class="fad fa-filter fa-lg" />
          </ion-button> -->
          <ion-button id="popover-button">
            <i class="fad fa-eye fa-2x" />
          </ion-button>
        </ion-buttons>
        <ion-popover
          trigger="popover-button"
          :dismiss-on-select="true"
        >
          <ion-content>
            <ion-list>
              <ion-item
                :button="true"
                :detail="false"
                @click="showPoints = !showPoints"
              >
                <i
                  class="fad fa-ring fa-lg mr-3"
                  slot="start"
                />

                <ion-label slot="start">
                  Points
                </ion-label>
                <ion-checkbox
                  v-model="showPoints"
                  slot="end"
                  @click.stop
                >
                </ion-checkbox>
              </ion-item>
              <ion-item
                :button="true"
                :detail="false"
                @click="showPoints = !showPoints"
              >
                <i
                  class="fad fa-clipboard-check fa-lg mr-3"
                  slot="start"
                />
                <ion-label>
                  Requires Approval
                </ion-label>
                <ion-checkbox
                  slot="end"
                  @click.stop
                >
                </ion-checkbox>
              </ion-item>
              <ion-item
                :button="true"
                :detail="false"
                @click="showPoints = !showPoints"
              >
                <i
                  class="fad fa-gift fa-lg mr-3"
                  slot="start"
                />

                <ion-label>
                  Bonus Chore
                </ion-label>

                <ion-checkbox
                  slot="end"
                  @click.stop
                >
                </ion-checkbox>
              </ion-item>

              <ion-popover
                trigger="nested-trigger"
                :dismiss-on-select="true"
                side="end"
              >
                <ion-content>
                  <ion-list>
                    <ion-item
                      :button="true"
                      :detail="false"
                    >
                      Nested option
                    </ion-item>
                  </ion-list>
                </ion-content>
              </ion-popover>

            </ion-list>
          </ion-content>
        </ion-popover>
      </ion-toolbar>
      <!-- <ion-toolbar v-if="showFilters">
        <ion-select
          label="Stacked label"
          label-placement="stacked"
          placeholder="Group by..."
          v-model="groupBy"
        >
          <ion-select-option value="category">
            Category
          </ion-select-option>
        </ion-select>
      </ion-toolbar> -->
      <ion-segment
        v-model="groupBy"
        mode="ios"
      >
        <ion-segment-button value="category">
          By Category
        </ion-segment-button>
        <ion-segment-button value="assignee">
          By Assignee
        </ion-segment-button>
        <ion-segment-button value="asNeeded">
          As Needed
        </ion-segment-button>
        <ion-segment-button value="expired">
          Expired
        </ion-segment-button>
      </ion-segment>
    </ion-header>
    <ion-content>
      <ion-item-group
        v-for="(group, index) in groupedAchievements"
        :key="index"
      >
        <ion-item-divider v-if="groupBy !== 'expired'">
          <ion-label>
            {{ getCategoryById(group.categoryId)?.name }}
          </ion-label>
        </ion-item-divider>
        <ion-item-sliding
          v-for="(achievement, index) in group.achievements"
          :key="index"
        >
          <xp-achievement-item
            :achievement="achievement"
            :categories="categories"
            :show-points="showPoints"
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
              <i class="fad fa-fire fa-lg mx-1"></i>
              Remove
            </ion-item-option>
          </ion-item-options>
          <ion-item-options side="end">
            <ion-item-option @click="clickEdit(achievement.id)">
              <!-- Edit -->
              <i class="fa fad fa-treasure-chest fa-lg mx-2"></i>
              Edit
            </ion-item-option>
            <ion-item-option @click="clickCloneAchievement(achievement)">
              <i class="fa fad fa-swords fa-lg mx-2"></i>
              Copy
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-item-group>


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
      expiredAchievements() {
        const now = new Date();
        return this.achievements?.filter(achievement => new Date(achievement.endsOn) < now);
      },
      groupedAchievements() {
        if (this.groupBy === 'category') {
          return this.achievements?.reduce((grouped, achievement) => {
            const category = grouped.find(group => group.categoryId === achievement.categoryId);
            if (category) {
              category.achievements.push(achievement);
            } else {
              grouped.push({ categoryId: achievement.categoryId, achievements: [achievement] });
            }
            return grouped;
          }, []);
        } else if (this.groupBy === 'expired') {
          return this.expiredAchievements;
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

      getCategoryById(id: string) {
        const findCatById = cat => cat.id === id
        return this.categories.find(findCatById)
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
      const searchText = ref("");
      const showFilters = ref(false)
      const groupBy = ref("category");
      const storage = new AchievementDb(achievementStorage);
      const categoryStorage = new AchievementCategoryDb(achievementCategoryStorage)
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

      return {
        showPoints,
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
