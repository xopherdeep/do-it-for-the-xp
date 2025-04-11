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
        <ion-row>
          <!-- User Info Section -->
          <ion-col size="12" class="user-info-header">
            <ion-card>
              <ion-card-header>
                <ion-card-title>{{
                  user?.name?.full || "User"
                }}</ion-card-title>
                <ion-card-subtitle v-if="user?.name?.nick"
                  >Nickname: {{ user.name.nick }}</ion-card-subtitle
                >
              </ion-card-header>
              <!-- Placeholder for Avatar/Image -->
              <!-- <img src="path/to/avatar.png" alt="User Avatar" /> -->
            </ion-card>
          </ion-col>

          <!-- Name Details (Optional - could be integrated elsewhere or kept simple) -->
          <ion-col size="6" v-if="user?.name?.first">
            <ion-card>
              <ion-card-header>
                <ion-card-subtitle>First Name</ion-card-subtitle>
              </ion-card-header>
              <ion-card-content>{{ user.name.first }}</ion-card-content>
            </ion-card>
          </ion-col>
          <ion-col size="6" v-if="user?.name?.last">
            <ion-card>
              <ion-card-header>
                <ion-card-subtitle>Last Name</ion-card-subtitle>
              </ion-card-header>
              <ion-card-content>{{ user.name.last }}</ion-card-content>
            </ion-card>
          </ion-col>
          <!-- Middle name might be less common to display -->
          <!-- <ion-col v-if="user?.name?.middle">...</ion-col> -->

          <!-- Stats Section -->
          <ion-col size="12">
            <ion-card>
              <ion-card-header>
                <ion-card-title>Stats</ion-card-title>
              </ion-card-header>
              <ion-list lines="none">
                <!-- Iterate through stats - Adapt this based on how 'areas' or 'user.stats' is structured -->
                <!-- Example: Displaying HP/MP if available -->
                <ion-item v-if="user?.stats?.hp !== undefined">
                  <ion-label>HP</ion-label>
                  <ion-note slot="end"
                    >{{ user.stats.hp }} /
                    {{ user.stats.maxHp || user.stats.hp }}</ion-note
                  >
                </ion-item>
                <ion-item v-if="user?.stats?.mp !== undefined">
                  <ion-label>MP</ion-label>
                  <ion-note slot="end"
                    >{{ user.stats.mp }} /
                    {{ user.stats.maxMp || user.stats.mp }}</ion-note
                  >
                </ion-item>
                <!-- Iterate through stats defined in 'areas' -->
                <template v-for="(area, category) in areas" :key="category">
                  <ion-item-divider v-if="Object.keys(area.stats).length > 0">
                    <ion-label :color="area.color || 'primary'">{{
                      category
                    }}</ion-label>
                  </ion-item-divider>
                  <ion-item v-for="(desc, stat) in area.stats" :key="stat">
                    <ion-label :color="area.color || 'primary'">{{
                      stat
                    }}</ion-label>
                    <ion-note slot="end" :color="area.color || 'primary'">{{
                      user?.stats?.[stat] ?? "N/A"
                    }}</ion-note>
                  </ion-item>
                </template>
              </ion-list>
            </ion-card>
          </ion-col>

          <!-- Favorites Section -->
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
      <!-- Original content from slide 1 and 2 merged above -->
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
    IonAccordionGroup,
    IonAccordion,
    IonItem,
    IonNote,
    IonLabel,
    IonList,
    IonIcon,
    IonCardTitle, // Added IonCardTitle
    IonItemDivider, // Added IonItemDivider
  } from "@ionic/vue";
  // Removed Swiper imports
  import { ref, defineProps, defineEmits } from "vue";

  // Swiper instance ref removed
  // const swiperInstance = ref(null);

  // Props definition
  const props = defineProps({
    isOpen: {
      type: Boolean,
      required: true,
    },
    user: {
      type: Object,
      default: () => ({}),
    },
  });

  // Emits definition
  const emit = defineEmits(["close"]);

  // Placeholder for areas data - you'll need to define this based on your application's needs
  const areas = ref({
    // Example structure:
    // Stats: {
    //   color: 'primary',
    //   icon: 'bar-chart-outline', // Replace with actual icon if needed
    //   stats: {
    //     hp: 'Health Points',
    //     mp: 'Magic Points',
    //     // ... other stats
    //   }
    // Example structure (ensure this matches your actual data for stats display):
    Stats: {
      color: "primary",
      icon: "bar-chart-outline", // Icon might not be used in the new layout
      stats: {
        hp: "Health Points",
        mp: "Magic Points",
        strength: "Strength",
        defense: "Defense",
        // ... other stats
      },
    },
    // Add other categories if needed
    // Attributes: { ... }
  });

  // Swiper-related functions removed
  // const onSwiper = (instance) => { ... };
  // const clickStats = () => { ... };
</script>

<style scoped lang="scss">
  /* Add any specific styles for the modal here */
  .user-profile {
    --height: 90%; /* Example height */
  }

  .favorite-food ion-card-content {
    display: flex;
    flex-wrap: wrap;
    gap: 10px; /* Adjust spacing between icons */
    justify-content: center;
  }

  .favorite-food i {
    color: var(--ion-color-primary); /* Example color */
  }
</style>
