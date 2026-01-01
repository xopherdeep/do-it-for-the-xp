<template>
  <ion-header>
    <ion-toolbar class="rpg-box">
      <ion-buttons slot="start">
        <ion-button @click="closeAchievement">
          <i class="fad fa-arrow-left fa-2x"></i>
        </ion-button>
      </ion-buttons>
      <ion-title> Copy Achievement Details? </ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content class="bg-slide">
    <ion-grid>
      <ion-row>
        <ion-col>
          <ion-card>
            <ion-card-header>
              <ion-thumbnail>
                <ion-img v-bind="getFeaturedImg(achievement?._embedded)" />
              </ion-thumbnail>
              <ion-card-title
                v-html="achievement.title.rendered"
                class="ion-text-center"
              />
            </ion-card-header>
          </ion-card>
        </ion-col>
      </ion-row>
      <ion-row>
        <ion-col>
          <ion-card>
            <ion-card-header>
              <ion-card-title>XP {{ achievement.xp || "?" }}</ion-card-title>
            </ion-card-header>
          </ion-card>
        </ion-col>
        <ion-col>
          <ion-card>
            <ion-card-header>
              <ion-card-title>AP{{ achievement.ap || "?" }}</ion-card-title>
            </ion-card-header>
          </ion-card>
        </ion-col>
        <ion-col>
          <ion-card>
            <ion-card-header>
              <ion-card-title>GP{{ achievement.gp || "?" }}</ion-card-title>
            </ion-card-header>
          </ion-card>
        </ion-col>
      </ion-row>
    </ion-grid>
  </ion-content>
  <ion-footer>
    <ion-toolbar class="rpg-box">
      <ion-buttons slot="start">
        <ion-button @click="closeAchievement">
          <i class="fad fa-times fa-3x"></i>
          No
        </ion-button>
      </ion-buttons>
      <ion-buttons slot="end">
        <ion-button @click="saveAchievement">
          Yes
          <i class="fad fa-save fa-3x"></i>
        </ion-button>
      </ion-buttons>
      <!-- <ion-title>
        Achievement Details
      </ion-title> -->
      <!-- <ion-buttons>
        <ion-buton>
          Cancel
        </ion-buton>
        <ion-button>
          Save
        </ion-button>
      </ion-buttons> -->
    </ion-toolbar>
  </ion-footer>
</template>

<script lang="ts">
  import { defineComponent } from "vue";
  import ionic from "@/lib/mixins/ionic";
  import { modalController } from "@ionic/vue";

  export default defineComponent({
    props: ["achievement"],
    mixins: [ionic],
    setup(props) {
      //

      const getFeaturedImg = (embedded) => {
        const [img] = embedded["wp:featuredmedia"] || [{}];
        return {
          src: img?.source_url,
          alt: img?.alt_text,
        };
      };

      const featuredImg = getFeaturedImg(props.achievement._embedded);

      const closeAchievement = modalController.dismiss;
      const saveAchievement = () =>
        closeAchievement({
          achievementName: props.achievement.title.rendered,
          imageUrl: featuredImg.src,
        });

      return {
        closeAchievement,
        saveAchievement,
        getFeaturedImg,
      };
    },
  });
</script>
