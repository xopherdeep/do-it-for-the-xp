import { defineComponent, ref } from "vue";
import ionic from "@/mixins/ionic";
import { Calendar, DatePicker } from 'v-calendar';
import 'v-calendar/dist/style.css';

import {
  calendarOutline,
  addCircleOutline,
  removeCircleOutline,
  close,
  arrowBack,
  chevronBack,
  chevronForward,
  stop,
  play,
  pause,
  colorWand,
  colorWandOutline,
  lockClosedOutline,
  lockOpenOutline,
  sunnyOutline,
  partlySunnyOutline,
  moonOutline,
  cloudyNightOutline,
  fitnessOutline,
  sparklesOutline,
  keyOutline,
  cartOutline,
  starSharp,
  storefrontOutline,
  banOutline,
  bagOutline,
} from "ionicons/icons";
import fetchItems from "@/mixins/fetchItems"
import { actionSheetController } from "@ionic/vue";

import { mapActions, mapGetters } from "vuex"; // Assuming you might need Vuex later for events

export default defineComponent({
  props: ["userId"],
  name: "my-calendar",
  mixins: [ionic], // Removed fetchItems for now, needs rework for calendar events
  components: {
    Calendar,
    DatePicker
  },
  data() {
    // Keep track of the calendar's current page (month/year)
    const today = new Date();
    return {
      isLoading: false, // Will be used when fetching calendar events
      calendarPage: { month: today.getMonth() + 1, year: today.getFullYear() },
      searchQuery: "", // Model for the search bar
      // Example attributes for events - replace with actual data fetching
      attributes: ref([
        {
          key: 'today',
          highlight: true,
          dates: new Date(),
        },
        // Add more attributes based on fetched quests/events
        // {
        //   key: 'quest1',
        //   dot: 'blue',
        //   dates: new Date(2025, 3, 15), // Example date
        //   popover: { label: 'Quest: Defeat the Slime King' }
        // }
      ]),
    };
  },
  computed: {
    // ...mapGetters(['calendarEventsForMonth']), // Example getter if using Vuex
    calendarTitle() {
      // Format a title like "April 2025"
      const date = new Date(this.calendarPage.year, this.calendarPage.month - 1);
      return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
  },
  methods: {
    // ...mapActions(['fetchCalendarEvents']), // Example action if using Vuex
    handleDayClick(day) {
      console.log("Day clicked:", day);
      // Potentially open details for this day or select it
    },
    handleUpdatePage(page) {
      console.log("Calendar page updated:", page);
      this.calendarPage = page[0]; // v-calendar returns an array
      // Trigger fetching events for the new month/year here
      // this.fetchEventsForMonth(page[0].year, page[0].month);
    },
    prevMonth() {
      const newDate = new Date(this.calendarPage.year, this.calendarPage.month - 2); // Month is 0-indexed for Date constructor
      this.calendarPage = { month: newDate.getMonth() + 1, year: newDate.getFullYear() };
    },
    nextMonth() {
      const newDate = new Date(this.calendarPage.year, this.calendarPage.month); // Month is 0-indexed for Date constructor
      this.calendarPage = { month: newDate.getMonth() + 1, year: newDate.getFullYear() };
    },
    searchEvents() {
      console.log("Searching for:", this.searchQuery);
      // Implement search logic - either filter existing attributes or fetch new ones
    },
    async presentActionSheet() {
      // Keep the action sheet logic, potentially add context based on selected date
      const actionSheet = await actionSheetController.create({
          header: 'Look at the time!',
          cssClass: 'my-custom-class',
          buttons: [
            // {
            //   text: 'Save Cash',
            //   icon: cashOutline,
            //   id: 'delete-button', 
            //   data: {
            //     type: 'delete'
            //   },
            //   handler: () => {
            //     // console.log('Delete clicked')
            //   },
            // },
            {
              text: 'Add Quest',
              icon: addCircleOutline,
              data: 'Data value',
              handler: () => {
                // console.log('Play clicked')
              },
            },
            {
              text: 'Request Time Off',
              icon: removeCircleOutline,
              data: 10,
              handler: () => {
                // console.log('Share clicked')
              },
            },
            {
              text: 'Some other action...',
              icon: calendarOutline,
              handler: () => {
                // console.log('Favorite clicked')
              },
            },
            {
              text: 'Cancel',
              icon: close,
              role: 'cancel',
              handler: () => {
                // console.log('Cancel clicked')
              },
            },
          ],
        });
      actionSheet.present();

      const { role, data } = await actionSheet.onDidDismiss();
      // console.log('onDidDismiss resolved with role and data', role, data);
    },
      // ... (rest of the action sheet buttons remain the same) ...
          ],
        });
      actionSheet.present();

      const { role, data } = await actionSheet.onDidDismiss();
      // console.log('onDidDismiss resolved with role and data', role, data);
    },
    // Placeholder for fetching actual event data
    fetchEventsForMonth(year, month) {
      this.isLoading = true;
      console.log(`Fetching events for ${year}-${month}`);
      // Replace with actual API call, e.g., using Vuex actions
      // this.fetchCalendarEvents({ year, month, search: this.searchQuery }).then(events => {
      //   this.attributes = this.transformEventsToAttributes(events);
      //   this.isLoading = false;
      // });
      setTimeout(() => { // Simulate API call
        this.isLoading = false;
      }, 1000);
    },
    // Helper to convert fetched data to v-calendar attributes format
    transformEventsToAttributes(events) {
      // Example transformation
      return events.map(event => ({
        key: event.id,
        dot: event.color || 'blue', // Or use highlights, bars, etc.
        dates: new Date(event.date),
        popover: { label: event.title }
      }));
    }
  },
  watch: {
    // Refetch events when the calendar page changes
    calendarPage(newPage) {
      this.fetchEventsForMonth(newPage.year, newPage.month);
    },
    // Refetch or filter when search query changes
    searchQuery() {
      // Debounce this in a real app
      this.fetchEventsForMonth(this.calendarPage.year, this.calendarPage.month);
    }
  },
  mounted() {
    // Fetch events for the initial month
    this.fetchEventsForMonth(this.calendarPage.year, this.calendarPage.month);
    // this.$fx.ui[this.$fx.theme.ui].openShop.play() // Keep sound effects if desired
  },
  setup() {
    // customAlertOptions might not be needed anymore if the select is removed
    // const customAlertOptions = {
    //   header: 'View Quests',
    //   subHeader: 'Select what quests to view',
    //   message: '',
    //   translucent: true
    // };
    return {
      // customAlertOptions, // Remove if IonSelect is removed
      header: 'View Quests',
      subHeader: 'Select what quests to view',
      message: '',
      translucent: true
    };
    return {
      calendarOutline,
      customAlertOptions,
      storefrontOutline,
      banOutline,
      chevronBack,
      chevronForward,
      stop,
      play,
      pause,
      arrowBack,
      colorWand,
      colorWandOutline,
      lockClosedOutline,
      lockOpenOutline,
      bagOutline,
      sunnyOutline,
      partlySunnyOutline,
      moonOutline,
      cloudyNightOutline,
      fitnessOutline,
      sparklesOutline,
      keyOutline,
      cartOutline,
      starSharp,
      addCircleOutline,
      removeCircleOutline,
      close,
    };
  },
});
