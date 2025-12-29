import { defineComponent as dC, ref, computed } from "vue";
import {
  IonPage,
  IonContent,
  IonButton,
  IonIcon,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonTitle,
  IonBackButton,
  IonSegment,
  IonSegmentButton,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonImg,
  IonCardContent,
  IonFab,
  IonFabButton,
  IonActionSheet,
  IonFooter,
  IonSearchbar

} from "@ionic/vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/lib/store/stores/user";
import { useItemFetcher } from "@/hooks/useItemFetcher";
import XpLoading from "@/components/molecules/Loading/XpLoading.vue";

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
  cubeOutline,
  bookOutline,
  videocamOutline,
  appsOutline,
  bedOutline
} from "ionicons/icons";

export default dC({
  name: "my-foods",
  props: ["userId"],
  components: {
    XpLoading,
    IonPage,
    IonContent,
    IonButton,
    IonIcon,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonTitle,
    IonBackButton,
    IonSegment,
    IonSegmentButton,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardHeader,
    IonCardSubtitle,
    IonImg,
    IonCardContent,
    IonFab,
    IonFabButton,
    IonActionSheet,
    IonFooter,
    IonSearchbar
  },
  setup(props) {
    const router = useRouter();
    const userStore = useUserStore();
    const user = computed(() => userStore.getUserById(props.userId));

    // Initialize Fetcher with default params from original data
    const fetcher = useItemFetcher("xp_accessory", {
      page: 1,
      search: "",
      per_page: 4,
    });

    const isLoading = fetcher.isLoading;
    const request = fetcher.request;
    const actionSheetOpen = ref(false);
    const shelves = ref(['affordable']);

    const segmentChanged = () => {
      // console.log("Segment changed", ev);
    };

    const handleInventoryClick = () => {
      router.push({
        name: 'my-inventory',
        params: {
          userId: props.userId
        }
      })
    };

    const customAlertOptions = {
      header: 'View Quests',
      subHeader: 'Select what quests to view',
      message: '',
      translucent: true
    };

    return {
      // Fetcher
      ...fetcher,
      isLoading,
      request,

      // Local State
      user,
      actionSheetOpen,
      shelves,
      segmentChanged,
      handleInventoryClick,
      customAlertOptions,

      // Icons
      calendarOutline,
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
      cubeOutline,
      bookOutline,
      videocamOutline,
      appsOutline,
      bedOutline
    };
  },
});
