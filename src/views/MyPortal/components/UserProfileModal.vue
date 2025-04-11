<template>
  <ion-modal
    :is-open="isOpen"
    @didDismiss="$emit('close')"
    class="user-profile"
    :breakpoints="[1]"
    :initialBreakpoint="1"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ user?.name?.nick || 'User Profile' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('close')">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <swiper @swiper="onSwiper">
        <swiper-slide>
          <ion-grid class="ion-no-padding">
            <ion-row>
              <ion-col size="2">
                <span></span>
              </ion-col>
              <ion-col size="6" class="ion-no-margin">
                <ion-card v-if="user?.name">
                  {{ user.name.full }}
                  <ion-button
                    expand="block"
                    color="dark"
                    @click="clickStats"
                    size="4"
                  >
                    <i class="fad fa-2x fa-hand-holding-heart"></i>
                    Status
                  </ion-button>
                </ion-card>
              </ion-col>
              <ion-col size="4" v-if="user?.name">
                <ion-card>
                  <ion-card-header>
                    <ion-card-subtitle> Nickname </ion-card-subtitle>
                  </ion-card-header>
                  <ion-card-content>
                    {{ user.name.nick }}
                  </ion-card-content>
                </ion-card>
              </ion-col>
              <ion-col v-if="user?.name">
                <ion-card>
                  <ion-card-header>
                    <ion-card-subtitle> First </ion-card-subtitle>
                  </ion-card-header>
                  <ion-card-content>
                    {{ user.name.first }}
                  </ion-card-content>
                </ion-card>
              </ion-col>
              <ion-col v-if="user?.name">
                <ion-card>
                  <ion-card-header>
                    <ion-card-subtitle> Middle </ion-card-subtitle>
                  </ion-card-header>
                  <ion-card-content>
                    {{ user.name.middle }}
                  </ion-card-content>
                </ion-card>
              </ion-col>
              <ion-col v-if="user?.name">
                <ion-card>
                  <ion-card-header>
                    <ion-card-subtitle> Last </ion-card-subtitle>
                  </ion-card-header>
                  <ion-card-content>
                    {{ user.name.last }}
                  </ion-card-content>
                </ion-card>
              </ion-col>
              <ion-col size="6">
                <ion-card>
                  <ion-card-header>
                    <ion-card-subtitle> Favorite Thing </ion-card-subtitle>
                  </ion-card-header>
                  <!-- Placeholder -->
                  <ion-card-content> Creation </ion-card-content>
                </ion-card>
              </ion-col>
              <ion-col size="12">
                <ion-card class="favorite-food">
                  <ion-card-header>
                    <ion-card-subtitle> Favorite Food </ion-card-subtitle>
                  </ion-card-header>
                  <ion-card-content>
                    <!-- Placeholder Icons -->
                    <i class="fad fa-pizza-slice fa-3x"></i>
                    <i class="fad fa-burger-soda fa-3x"></i>
                    <i class="fad fa-cheeseburger fa-3x"></i>
                    <i class="fad fa-french-fries fa-3x"></i>
                    <i class="fad fa-popcorn fa-3x"></i>
                    <i class="fad fa-burrito fa-3x"></i>
                    <i class="fad fa-apple fa-3x"></i>
                    <i class="fad fa-carrot fa-3x"></i>
                    <i class="fad fa-candy-cane fa-3x"></i>
                    <i class="fad fa-candy-corn fa-3x"></i>
                    <i class="fad fa-cookie fa-3x"></i>
                    <i class="fad fa-corn fa-3x"></i>
                    <i class="fad fa-egg-fried fa-3x"></i>
                    <i class="fad fa-drumstick fa-3x"></i>
                    <i class="fad fa-hotdog fa-3x"></i>
                    <i class="fad fa-pie fa-3x"></i>
                    <i class="fad fa-salad fa-3x"></i>
                  </ion-card-content>
                </ion-card>
              </ion-col>
            </ion-row>
          </ion-grid>
        </swiper-slide>
        <swiper-slide>
          <ion-grid>
            <ion-row>
              <ion-col
                size="12"
                v-for="(area, category) in areas"
                :key="category"
              >
                <ion-card>
                  <ion-accordion-group :value="category">
                    <ion-accordion :value="category">
                      <ion-item slot="header">
                        <ion-note slot="start">
                          <ion-icon
                            size="large"
                            :color="area.color"
                            :icon="area.icon"
                          ></ion-icon>
                        </ion-note>
                        <ion-label :color="area.color">
                          <strong>{{ category }}</strong>
                        </ion-label>
                      </ion-item>
                      <ion-list slot="content">
                        <ion-item
                          v-for="(desc, stat) in area.stats"
                          :key="stat"
                        >
                          <ion-label :color="area.color">
                            <strong>
                              {{ stat }}
                            </strong>
                          </ion-label>
                          <ion-note slot="end" :color="area.color">
                            <strong>
                              {{ desc }}
                              --
                              {{ user?.stats?.[stat] }}
                            </strong>
                          </ion-note>
                        </ion-item>
                      </ion-list>
                    </ion-accordion>
                  </ion-accordion-group>
                </ion-card>
              </ion-col>
            </ion-row>
          </ion-grid>
        </swiper-slide>
      </swiper>
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
} from "@ionic/vue";
import { Swiper, SwiperSlide } from "swiper/vue";
import "swiper/css";
import { ref, defineProps, defineEmits } from "vue";

// Swiper instance ref
const swiperInstance = ref(null);

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
  // }
});

// Store Swiper instance
const onSwiper = (instance) => {
  swiperInstance.value = instance;
};

// Navigate swiper on click
const clickStats = () => {
  if (swiperInstance.value) {
    swiperInstance.value.slideTo(1); // Slide to the second slide (index 1)
  }
};

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
