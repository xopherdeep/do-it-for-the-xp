<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button 
            :default-href="`/my-portal/${userId}/my-home`"
          ></ion-back-button>
          <ion-icon :icon="calendarOutline" slot="icon-only" />
          <!-- <i class="fad fa-calendar" /> -->
        </ion-buttons>
        <ion-title>
          {{ calendarTitle }} <!-- Dynamic Title -->
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="my-calendar" :fullscreen="true">
      <xp-loading v-if="isLoading" />
      <!-- v-calendar Integration -->
      <Calendar
        is-expanded
        title-position="left"
        :attributes="attributes"
        :from-page="calendarPage"
        @update:fromPage="handleUpdatePage"  
        @dayclick="handleDayClick"
        class="ion-padding"
      />
      <!-- Note: v-calendar v3 uses @update:fromPage instead of @update:from-page -->
      <!-- Removed the old ion-item select and ion-grid -->
      <!-- fab placed to the bottom and start and on the bottom edge of the content overlapping footer with a list to the right -->
      <ion-fab
        vertical="bottom"
        horizontal="center"
        slot="fixed"
        @click.stop="presentActionSheet"
      >
        <ion-fab-button >
          <ion-icon :icon="calendarOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
    <ion-footer>
      <ion-toolbar color="secondary">
        <ion-grid>
          <ion-row>
            <ion-col class="ion-no-padding">
              <!-- Updated search bar model and event -->
              <ion-searchbar
                color="light"
                :debounce="500"
                @ionChange="searchEvents"
                v-model="searchQuery"
                placeholder="Search Quests..."
              ></ion-searchbar>
            </ion-col>
          </ion-row>
          <ion-row>
            <ion-col>
              <!-- Previous Month Button -->
              <ion-button
                @click="prevMonth"
                color="light"
                expand="block"
              >
                <ion-icon :icon="chevronBack" slot="icon-only" />
              </ion-button>
            </ion-col>
            <ion-col>
              <!-- Next Month Button -->
              <ion-button
                @click="nextMonth"
                color="light"
                expand="block"
              >
                <ion-icon :icon="chevronForward" slot="icon-only" />
              </ion-button>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonIcon,
  IonTitle,
  IonContent,
  IonFab,
  IonFabButton,
  IonFooter,
  IonGrid,
  IonRow,
  IonCol,
  IonSearchbar,
  IonButton,
  actionSheetController,
} from "@ionic/vue";
import { Calendar, DatePicker } from 'v-calendar';
// XpLoading is registered globally in main.ts, no need to import here

import {
  calendarOutline,
  addCircleOutline,
  removeCircleOutline,
  close,
  chevronBack,
  chevronForward,
  // Import other icons used in the template or action sheet if needed
} from "ionicons/icons";
// import { useStore } from 'vuex'; // Uncomment if/when Vuex integration is needed

// Props
const props = defineProps<{
  userId: string | number; // Adjust type as needed
}>();

// Store (Uncomment if/when Vuex integration is needed)
// const store = useStore();

// Components (v-calendar is imported, others are from IonicVue)

// Data
const today = new Date();
const isLoading = ref(false);
const calendarPage = ref({ month: today.getMonth() + 1, year: today.getFullYear() });
const searchQuery = ref("");
const attributes = ref([
  {
    key: 'today',
    highlight: {
      color: 'purple', // Example: Highlight today in purple
      fillMode: 'light',
    },
    dates: new Date(),
  },
  // Add more attributes based on fetched quests/events
  // {
  //   key: 'quest1',
  //   dot: 'blue',
  //   dates: new Date(2025, 3, 15), // Example date
  //   popover: { label: 'Quest: Defeat the Slime King' }
  // }
]);

// Computed
// const calendarEventsForMonth = computed(() => store.getters.calendarEventsForMonth); // Example Vuex getter
const calendarTitle = computed(() => {
  const date = new Date(calendarPage.value.year, calendarPage.value.month - 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
});

// Methods
const handleDayClick = (day) => {
  console.log("Day clicked:", day);
  // Potentially open details for this day or select it
};

const handleUpdatePage = (page) => {
  console.log("Calendar page updated:", page);
  // v-calendar v3 emits the page object directly, not in an array
  if (page && page.month && page.year) {
     calendarPage.value = { month: page.month, year: page.year };
  } else {
    console.warn("Received unexpected page update format:", page);
  }
  // Trigger fetching events for the new month/year here
  // fetchEventsForMonth(calendarPage.value.year, calendarPage.value.month);
};

const prevMonth = () => {
  const currentMonth = calendarPage.value.month;
  const currentYear = calendarPage.value.year;
  const newMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const newYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  calendarPage.value = { month: newMonth, year: newYear };
};

const nextMonth = () => {
  const currentMonth = calendarPage.value.month;
  const currentYear = calendarPage.value.year;
  const newMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const newYear = currentMonth === 12 ? currentYear + 1 : currentYear;
  calendarPage.value = { month: newMonth, year: newYear };
};

const searchEvents = () => {
  console.log("Searching for:", searchQuery.value);
  // Implement search logic - either filter existing attributes or fetch new ones
  fetchEventsForMonth(calendarPage.value.year, calendarPage.value.month);
};

const presentActionSheet = async () => {
  const actionSheet = await actionSheetController.create({
    header: 'Look at the time!',
    cssClass: 'my-custom-class',
    buttons: [
      {
        text: 'Add Quest',
        icon: addCircleOutline,
        data: 'Data value',
        handler: () => {
          console.log('Add Quest clicked');
        },
      },
      {
        text: 'Request Time Off',
        icon: removeCircleOutline,
        data: 10,
        handler: () => {
          console.log('Request Time Off clicked');
        },
      },
      {
        text: 'Some other action...',
        icon: calendarOutline,
        handler: () => {
          console.log('Some other action clicked');
        },
      },
      {
        text: 'Cancel',
        icon: close,
        role: 'cancel',
        handler: () => {
          console.log('Cancel clicked');
        },
      },
    ],
  });
  actionSheet.present();

  const { role, data } = await actionSheet.onDidDismiss();
  console.log('onDidDismiss resolved with role and data', role, data);
};

// Placeholder for fetching actual event data
const fetchEventsForMonth = (year, month) => {
  isLoading.value = true;
  console.log(`Fetching events for ${year}-${month}`);
  // Replace with actual API call, e.g., using Vuex actions
  // store.dispatch('fetchCalendarEvents', { year, month, search: searchQuery.value }).then(events => {
  //   attributes.value = transformEventsToAttributes(events);
  //   isLoading.value = false;
  // });
  setTimeout(() => { // Simulate API call
    // Example: Add a dummy event for the fetched month
    const dummyEventDate = new Date(year, month - 1, 15);
     attributes.value = [
        ...attributes.value.filter(attr => attr.key !== 'dummy'), // Remove previous dummy event
        {
          key: 'dummy',
          dot: 'red',
          dates: dummyEventDate,
          popover: { label: `Fetched event for ${month}/${year}` }
        }
     ];
    isLoading.value = false;
  }, 1000);
};

// Helper to convert fetched data to v-calendar attributes format
const transformEventsToAttributes = (events) => {
  // Example transformation
  return events.map(event => ({
    key: event.id,
    dot: event.color || 'blue', // Or use highlights, bars, etc.
    dates: new Date(event.date),
    popover: { label: event.title }
  }));
};

// Watchers
watch(calendarPage, (newPage) => {
  if (newPage && newPage.year && newPage.month) {
    fetchEventsForMonth(newPage.year, newPage.month);
  }
}, { immediate: false }); // Don't run immediately, wait for mounted

watch(searchQuery, () => {
  // Debounce this in a real app
  fetchEventsForMonth(calendarPage.value.year, calendarPage.value.month);
});

// Lifecycle Hooks
onMounted(() => {
  // Fetch events for the initial month
  fetchEventsForMonth(calendarPage.value.year, calendarPage.value.month);
  // Play sound effects if desired
  // appConfig.$fx.ui[appConfig.$fx.theme.ui].openShop.play(); // Access global properties if needed
});

</script>

<style lang="scss" src="./_MyCalendar.scss" scoped>
  // v-calendar styles are now imported globally in main.ts
</style>
