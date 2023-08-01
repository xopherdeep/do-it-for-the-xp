import { computed, defineComponent } from "vue";
import {
  IonBackButton,
  IonPage,
  IonHeader,
  IonToolbar,
  IonGrid,
  IonRow,
  IonCol,
  IonButtons,
  IonButton,
  IonIcon,
  IonTitle,
  IonContent,
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonRouterOutlet,
  IonSegment,
  IonSegmentButton,
  IonFooter,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonSelect,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonChip,
  IonSelectOption,
} from "@ionic/vue";

import {
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
  serverOutline,
  bagOutline,
  cartOutline
} from "ionicons/icons";
import { mapGetters } from "vuex";

export default defineComponent({
  props: ["userId"],
  name: "my-gold-points",
  data(){
    return {
      date: 'Today'
    }
  },
  components: {
    IonBackButton,
    IonGrid,
    IonRow,
    IonCol,
    IonTabBar,
    IonTabButton,
    IonTabs,
    IonRouterOutlet,
    IonSegment,
    IonSegmentButton,
    IonHeader,
    IonFooter,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonTitle,
    IonContent,
    IonPage,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonSelect,
    IonSelectOption,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonChip,
  },
  computed: {
    ...mapGetters(["getUserById"]),
    user() {
      return this.getUserById(this.userId);
    },
  },
  methods: {
    segmentChanged(ev) {
      console.log("Segment changed", ev);
    },
    changeDate(event){
      const date = event.detail.value;
      console.log("date" + date);
      this.date = date;
      // localStorage.setItem("date", date);
    }
  },
  setup() {
 const customAlertOptions =  {
      header: 'Choose Date Range',
      subHeader: 'Calculate GP',
      message: 'Options unlock with time',
      translucent: true
    };

    const customPopoverOptions = {
      header: 'Hair Color',
      subHeader: 'Select your hair color',
      message: 'Only select your dominant hair color'
    };

    const customActionSheetOptions = {
      header: 'Colors',
      subHeader: 'Select your favorite color'
    };
    
    return {
      // date: computed(() => localStorage.getItem("date")),
      customAlertOptions,
      customPopoverOptions,
      customActionSheetOptions,
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
      serverOutline,
  cartOutline
    };
  },
});
