<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/game-master" />
        </ion-buttons>
        <ion-title>
          <i class="fad fa-place-of-worship fa-lg" />
          {{ templeId }}
        </ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        <ion-item>
          <ion-label position="floating"> Related Categories </ion-label>
          <ion-select
            v-model="temple.categoryIds"
            placeholder="Choose relating categories..."
            mode="ios"
            :clearInput="true"
            multiple
          >
            <ion-select-option
              v-for="(cat, index) in categories"
              :value="cat.id"
              :key="index"
            >
              {{ cat.name }}
            </ion-select-option>
          </ion-select>
        </ion-item>
      </ion-list>
      <ion-grid>
        <ion-row>
          <ion-col>
            <ion-card>
              <ion-item>
                <ion-avatar slot="start">
                  <ion-skeleton-text />
                </ion-avatar>
                <ion-label>Boss</ion-label>
              </ion-item>
            </ion-card>
          </ion-col>
        </ion-row>
        <ion-row>
          <ion-col size="7">
            <ion-card>
              <ion-item>
                <ion-avatar slot="start">
                  <ion-skeleton-text />
                </ion-avatar>
                <ion-label>Mini-Boss</ion-label>
              </ion-item>
            </ion-card>
          </ion-col>
          <ion-col size="5">
            <ion-card>
              <ion-item>
                <ion-avatar slot="start">
                  <ion-skeleton-text />
                </ion-avatar>
                <ion-label>Heavy</ion-label>
              </ion-item>
            </ion-card>
          </ion-col>
        </ion-row>
        <ion-row>
          <ion-col size="5">
            <ion-card>
              <ion-item>
                <ion-avatar slot="start">
                  <ion-skeleton-text />
                </ion-avatar>
                <ion-label> Mid</ion-label>
              </ion-item>
            </ion-card>
          </ion-col>
          <ion-col size="4">
            <ion-card>
              <ion-item>
                <ion-avatar slot="start">
                  <ion-skeleton-text />
                </ion-avatar>
                <ion-label> Lite</ion-label>
              </ion-item>
            </ion-card>
          </ion-col>
          <ion-col size="3">
            <ion-card>
              <ion-item>
                <ion-avatar slot="start">
                  <ion-skeleton-text />
                </ion-avatar>
                <ion-label> Easy </ion-label>
              </ion-item>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent, ref } from "vue";
  import ionic from "@/mixins/ionic";
  import {
    AchievementCategoryInterface,
    AchievementCategoryDb,
    achievementCategoryStorage,
  } from "@/databases/AchievementDb";

  import { sortCategoryByName } from "@/views/App/SideMenu/XpGameMaster/XpAchievements/XpAddAchievement/XpAddAchievement";

  export default defineComponent({
    props: ["templeId"],

    name: "XpTempleSettings",
    mixins: [ionic],
    mounted() {
      this.loadCategories();
    },
    setup() {
      const categoryDb = new AchievementCategoryDb(achievementCategoryStorage);
      const categories = ref([] as AchievementCategoryInterface[]);

      const loadCategories = async () => {
        categories.value = await categoryDb.getAll();
        categories.value = categories.value.sort(sortCategoryByName);
      };

      const temple = ref({
        categoryIds: [] as number[],
      });

      return {
        temple,
        categories,
        loadCategories,
      };
    },
  });
</script>
