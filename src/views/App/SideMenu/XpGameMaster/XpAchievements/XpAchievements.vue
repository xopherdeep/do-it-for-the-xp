<template>
  <ion-page :class="$options.name">
    <ion-content>
      <ion-grid class="ion-overflow">
        <ion-row class="ion-align-items-center ion-justify-content-center">
          <ion-col class="ion-text-center" v-if="!hasAchievements">
            <i class="fa fad fa-medal fa-5x" />
            <br />
            No Achievements
          </ion-col>
          <!-- <ion-col class="" v-if="!hasAchievements"> No Achievements </ion-col> -->
          <ion-col
            v-for="(achivement, index) in filteredAchievements"
            :key="index"
            size-sm="12"
            size-lg="6"
          >
            <ion-card class="rpg-box ion-width-full">
              <ion-card-header>
                <ion-card-title>
                  <!-- {{ achivement.achievementName }} -->
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>
                Name: {{ achivement?.achievementName }}
                <br />
                xp: {{ achivement?.xp }}
                <ion-footer>
                  <ion-toolbar>
                    <ion-buttons>
                      <ion-button @click="clickEdit(achivement.id)">
                        <i class="fa fad fa-edit"></i>
                        <!-- Edit -->
                        Edit
                      </ion-button>
                      <ion-button @click="clickCloneAchievement(achivement)">
                        <i class="fa fad fa-copy"></i>
                        <!-- Edit -->
                        Clone
                      </ion-button>
                      <ion-button @click="clickDeleteAchievement(achivement)">
                        <i class="fa fad fa-trash"></i>
                        <!-- Edit -->
                        Delete
                      </ion-button>
                    </ion-buttons>
                  </ion-toolbar>
                </ion-footer>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
    <ion-fab slot="fixed" vertical="bottom" horizontal="end">
      <ion-fab-button>
        <ion-icon :icon="addOutline" />
      </ion-fab-button>
      <ion-fab-list side="top">
        <ion-fab-button @click="clickAdd">
          <ion-icon :icon="addSharp" />
        </ion-fab-button>
        <ion-fab-button>
          <ion-icon :ios="searchOutline" :md="searchSharp" />
        </ion-fab-button>
        <ion-fab-button>
          <ion-icon :ios="thumbsUpOutline" :md="thumbsUpSharp" />
        </ion-fab-button>
      </ion-fab-list>
    </ion-fab>
    <ion-footer>
      <ion-toolbar color="light">
        <ion-grid>
          <ion-row>
            <ion-col class="ion-no-padding">
              <ion-searchbar color="light" v-model="searchText"></ion-searchbar>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script lang="ts">
  import { computed, defineComponent, ref } from "vue";
  import ionic from "@/mixins/ionic";

  import {
    addOutline,
    addSharp,
    searchOutline,
    searchSharp,
    thumbsUpOutline,
    thumbsUpSharp,
  } from "ionicons/icons";
  import { useRouter } from "vue-router";
  import { AchievementDb } from "@/databases";
  import { alertController } from "@ionic/vue";
  import type { Achievement } from "@/databases/AchievementDb";
  import { Drivers, Storage } from "@ionic/storage";

  export const achievementStorage = new Storage({
    name: "__achievements",
    driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
  });

  export default defineComponent({
    name: "xp-achievements",
    mixins: [ionic],

    computed: {
      hasAchievements() {
        return this.filteredAchievements?.length > 0;
      },
      filteredAchievements() {
        return this.achievements?.filter(this.filterAchievement);
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

      clickAdd() {
        this.$router.push("/add-achievement");
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
    },
    mounted() {
      this.loadAchievements();
    },
    setup() {
      const achievements = ref();
      const storage = new AchievementDb(achievementStorage);
      const searchText = ref("");
      return {
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
