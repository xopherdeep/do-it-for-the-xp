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
          {{ calendarTitle }}
          <!-- Dynamic Title -->
        </ion-title>
        <ion-buttons slot="end">
          <ion-button
            @click="handleDayClick"
            color="light"
            fill="clear"
            slot="icon-only"
          >
            <ion-icon :icon="addCircleOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="my-calendar" :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleUpdatePage"></ion-refresher>
      <xp-loading v-if="isLoading" />
      <!-- v-calendar Integration -->
      <!-- <v-calendar
        is-expanded
        :attributes="attributes"
        :model-config="{
          type: 'month',
          month: calendarPage.month,
          year: calendarPage.year,
        }"
        @update:model-config="handleUpdatePage"
        @dayclick="handleDayClick"
        class="ion-padding"
      /> -->
      <!-- fab placed to the bottom and start and on the bottom edge of the content overlapping footer with a list to the right -->
      <ion-fab
        vertical="bottom"
        horizontal="center"
        slot="fixed"
        @click.stop="presentActionSheet"
      >
        <ion-fab-button>
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
              <ion-button @click="prevMonth" color="light" expand="block">
                <ion-icon :icon="chevronBack" slot="icon-only" />
              </ion-button>
            </ion-col>
            <ion-col>
              <!-- Next Month Button -->
              <ion-button @click="nextMonth" color="light" expand="block">
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
  import {
    ref,
    computed,
    watch,
    onMounted,
    defineComponent,
    toRef      
  } from "vue";
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
  // import { Calendar as VCalendar } from "v-calendar";
  import {
    calendarOutline,
    addCircleOutline,
    removeCircleOutline,
    close,
    chevronBack,
    chevronForward,
  } from "ionicons/icons";

  // Define the component (required for script setup)
  defineComponent({
    name: "MyCalendar",
    // components: {
    //   "v-calendar": VCalendar,
    // },
  });

  // Props - correct implementation of defineProps
  // eslint-disable-next-line no-undef, vue/valid-define-props
  const props = defineProps<{
    userId: string | number;
  }>();
  const userId = toRef(props, 'userId');

  // Data
  const today = new Date();
  const isLoading = ref(false);
  const calendarPage = ref({
    month: today.getMonth() + 1,
    year: today.getFullYear(),
  });
  const searchQuery = ref("");

  // Define a proper type for calendar attributes to fix the type error
  type CalendarAttribute = {
    key: string;
    highlight?: { color: string; fillMode: string };
    dot?: string;
    dates: Date;
    popover?: { label: string };
  };

  const attributes = ref<CalendarAttribute[]>([
    {
      key: "today",
      highlight: {
        color: "purple",
        fillMode: "light",
      },
      dates: new Date(),
    },
  ]);

  // Computed
  const calendarTitle = computed(() => {
    const date = new Date(
      calendarPage.value.year,
      calendarPage.value.month - 1
    );
    return date.toLocaleString("default", { month: "long", year: "numeric" });
  });

  // Methods
  // These functions are not used now but will be needed when v-calendar is uncommented
  const handleDayClick = (day: any) => {
    // Show selected date's events in a modal or action sheet
    const date = new Date(day.year, day.month - 1, day.day);
    const eventsForDay = attributes.value.filter(
      (attr) =>
        attr.dates instanceof Date && attr.dates.getTime() === date.getTime()
    );

    if (eventsForDay.length > 0) {
      // If there are events, show them
      presentActionSheet();
    }
  };
  //
  const handleUpdatePage = (page: any) => {
    if (page?.month && page?.year) {
      calendarPage.value = { month: page.month, year: page.year };
      fetchEventsForMonth(page.year, page.month);
    }
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
    fetchEventsForMonth(calendarPage.value.year, calendarPage.value.month);
  };

  const presentActionSheet = async () => {
    const actionSheet = await actionSheetController.create({
      header: "Look at the time!",
      cssClass: "my-custom-class",
      buttons: [
        {
          text: "Add Quest",
          icon: addCircleOutline,
          data: "Data value",
          handler: () => {
            // Add quest logic here
          },
        },
        {
          text: "Request Time Off",
          icon: removeCircleOutline,
          data: 10,
          handler: () => {
            // Request time off logic here
          },
        },
        {
          text: "Some other action...",
          icon: calendarOutline,
          handler: () => {
            // Other action logic here
          },
        },
        {
          text: "Cancel",
          icon: close,
          role: "cancel",
          handler: () => {
            // Cancel logic here
          },
        },
      ],
    });
    await actionSheet.present();
  };

  // Placeholder for fetching actual event data
  const fetchEventsForMonth = (year: number, month: number) => {
    isLoading.value = true;
    setTimeout(() => {
      const dummyEventDate = new Date(year, month - 1, 15);
      attributes.value = [
        ...attributes.value.filter((attr) => attr.key !== "dummy"),
        {
          key: "dummy",
          dot: "red",
          dates: dummyEventDate,
          popover: { label: `Quest available ${month}/${year}` },
        },
      ];
      isLoading.value = false;
    }, 1000);
  };

  // Watchers
  watch(
    calendarPage,
    (newPage) => {
      if (newPage?.year && newPage?.month) {
        fetchEventsForMonth(newPage.year, newPage.month);
      }
    },
    { immediate: false }
  );

  watch(searchQuery, () => {
    fetchEventsForMonth(calendarPage.value.year, calendarPage.value.month);
  });

  // Lifecycle Hooks
  onMounted(() => {
    fetchEventsForMonth(calendarPage.value.year, calendarPage.value.month);
  });
</script>

<style lang="scss" src="./_MyCalendar.scss" scoped>
  // v-calendar styles are now imported globally in main.ts
</style>
