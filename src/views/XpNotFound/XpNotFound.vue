<template>
  <ion-page class="xp-not-found">
    <ion-content :fullscreen="true" class="ion-padding">
      <div class="xp-not-found__scene" data-cy="not-found">
        <i class="fad fa-compass xp-not-found__icon" aria-hidden="true"></i>
        <h1 class="xp-not-found__title">Lost in the Wilds</h1>
        <p class="xp-not-found__text">
          You wandered off the map, traveller. Nothing lives at this spot.
        </p>
        <ion-button
          class="xp-not-found__button"
          data-cy="not-found-home"
          @click="goBack"
        >
          Back to the Heroes
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonPage } from "@ionic/vue";
import { useRouter } from "vue-router";
import { play$fx } from "@/assets/fx";

const router = useRouter();

/** The one way out: the hero picker, which every hero and Game Master can open without signing in */
const goBack = (): void => {
  play$fx("select");
  router.replace({ name: "xp-profile" });
};
</script>

<style scoped lang="scss">
.xp-not-found {
  &__scene {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100%;
    gap: 16px;
    text-align: center;
  }

  &__icon {
    font-size: 72px;
    opacity: 0.85;
  }

  &__title {
    margin: 0;
    font-family: "StatusPlz", monospace;
    font-size: 28px;
  }

  &__text {
    max-width: 320px;
    margin: 0;
    font-size: 16px;
    line-height: 1.5;
  }
}
</style>
