<template>
  <ion-modal
    :is-open="isOpen"
    @didDismiss="$emit('close')"
    class="user-profile"
    :breakpoints="[1]"
    :initialBreakpoint="1"
  >
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-title>{{ user?.name?.nick || "User Profile" }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('close')">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <!-- Swiper removed -->
      <ion-grid class="ion-no-padding">
        <ion-row class="ion-align-items-center">
          <!-- Avatar/Sprite Section -->
          <ion-col
            size="4"
            class="ion-text-center"
          >
            <!-- Reference Ness sprite from public/assets -->
            <img
              src="/assets/sprites/ness.png"
              alt="Ness Sprite"
              style="max-width: 80px; image-rendering: pixelated;"
            />
            <!-- Display user avatar using imported appConfig -->
            <img
              v-if="user?.avatar"
              :src="appConfig.$getUserAvatar(user)"
              alt="User Avatar"
              style="max-width: 80px; margin-top: 10px; border-radius: 50%;"
            />
            <!-- Placeholder if no avatar -->
            <div
              v-else
              style="margin-top: 10px; font-size: 0.8em;"
            >(No Avatar)</div>
          </ion-col>

          <!-- User Info Section -->
          <ion-col
            size="8"
            class="user-info-header"
          >
            <ion-card>
              <ion-card-header>
                <ion-card-title>{{
                  user?.name?.full || "User"
                  }}</ion-card-title>
                <ion-card-subtitle v-if="user?.name?.nick">Nickname: {{ user.name.nick }}</ion-card-subtitle>
              </ion-card-header>
              <!-- Placeholder for Avatar/Image -->
              <!-- <img src="path/to/avatar.png" alt="User Avatar" /> -->
            </ion-card>
          </ion-col>
        </ion-row>

        <!-- Removed Name Details Section -->

        <!-- Stats Placeholder Section -->
        <ion-row>
          <ion-col size="12">
            <ion-card>
              <ion-card-header>
                <ion-card-title>Stats</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <!-- Placeholder for stats -->
                <p>HP: --- / ---</p>
                <p>MP: --- / ---</p>
                <p>Level: --</p>
                <p>XP: ------</p>
                <p>GP: ------</p>
                <p>AP: ------</p>
                <p>...</p>
                <p>(Stats display coming soon)</p>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>

        <!-- Favorites Section -->
        <ion-row>
          <ion-col size="12">
            <ion-card>
              <ion-card-header>
                <ion-card-subtitle>Favorite Thing</ion-card-subtitle>
              </ion-card-header>
              <ion-card-content>
                {{ user?.favoriteThing || "Creation" }}
                <!-- Use actual data or placeholder -->
              </ion-card-content>
            </ion-card>
          </ion-col>

          <ion-col size="12">
            <ion-card class="favorite-food">
              <ion-card-header>
                <ion-card-subtitle>Favorite Food</ion-card-subtitle>
              </ion-card-header>
              <ion-card-content>
                <!-- Display actual favorite food or icons -->
                {{ user?.favoriteFood || "Not Specified" }}
                <!-- Or keep icons if preferred -->
                <!--
                    <i class="fad fa-pizza-slice fa-3x"></i>
                    ... other icons ...
                -->
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
      <!-- Original content merged and simplified above -->
      <!-- Removed original grid structure -->
      <!--
              <ion-col size="2">
              -->
    </ion-content>
  </ion-modal>
</template>

<script setup>
  import {
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardHeader,
    IonCardSubtitle,
    IonCardContent,
    // IonAccordionGroup, // Removed
    // IonAccordion, // Removed
    // IonItem, // Removed (unless needed elsewhere)
    // IonNote, // Removed (unless needed elsewhere)
    // IonLabel, // Removed (unless needed elsewhere)
    // IonList, // Removed
    // IonIcon, // Removed (unless needed elsewhere)
    IonCardTitle,
    // IonItemDivider, // Removed
  } from "@ionic/vue";
  import { defineProps, defineEmits } from "vue"; // Removed ref as areas is gone
  import appConfig from "@/app.config"; // Import appConfig

  // Props definition - used by template but linter doesn't detect it
  defineProps({
    isOpen: {
      type: Boolean,
      required: true,
    },
    user: {
      type: Object,
      default: () => ({}),
    },
  });

  // Emits definition - used by template but linter doesn't detect it
  defineEmits(["close"]);

  // Removed areas ref as stats are now a placeholder
  // const areas = ref({ ... });

  // Swiper-related functions removed
  // const onSwiper = (instance) => { ... };
  // const clickStats = () => { ... };
</script>

<style scoped lang="scss">
  /* Add any specific styles for the modal here */
  /* .user-profile { */
  /* --height: 90%; Removed to allow fullscreen */
  /* } */

  .favorite-food ion-card-content {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    /* Adjust spacing between icons */
    justify-content: center;
  }

  .favorite-food i {
    color: var(--ion-color-primary);
    /* Example color */
  }
</style>
