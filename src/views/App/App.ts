import { defineComponent, ref } from "vue"
import { useRoute } from "vue-router";
import {
  IonApp,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenu,
  IonMenuToggle,
  IonNote,
  IonRouterOutlet,
  IonSplitPane,
} from "@ionic/vue";

import {
  archiveOutline,
  archiveSharp,
  bookmarkOutline,
  bookmarkSharp,
  heartOutline,
  heartSharp,
  mailOutline,
  mailSharp,
  paperPlaneOutline,
  paperPlaneSharp,
  trashOutline,
  trashSharp,
  warningOutline,
  warningSharp,
  settingsOutline,
  settingsSharp,
  helpBuoySharp,
  helpBuoyOutline,
  informationCircleOutline,
  informationCircleSharp,
  logOutOutline,
  logOutSharp,
  diamondOutline,
  diamondSharp,
  peopleOutline,
  peopleSharp,
  shareOutline,
  shareSharp,
  peopleCircleOutline,
  peopleCircleSharp
} from "ionicons/icons";


export default defineComponent({
  name: "App",
  components: {
    IonApp,
    IonContent,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonMenu,
    IonMenuToggle,
    IonNote,
    IonRouterOutlet,
    IonSplitPane,
  },
  setup() {
    const selectedIndex = ref(0);
    const menus = { 
      app: {

      },
      user: {

      },
      support: {

      }
    } 
    const userMenu = []
    const appPages = [
      {
        title: "Switch Profile",
        url: "/",
        iosIcon: peopleCircleOutline,
        mdIcon: peopleCircleSharp,
      },
      {
        title: "XP Membership",
        url: "/xp-membership",
        iosIcon: diamondOutline,
        mdIcon: diamondSharp,
      },
      {
        title: "XP Settings",
        url: "/xp-settings",
        iosIcon: settingsOutline,
        mdIcon: settingsSharp,
      },
      {
        title: "XP Support",
        url: "/xp-support",
        iosIcon: helpBuoyOutline,
        mdIcon: helpBuoySharp,
      },
      {
        title: "About XP",
        url: "/about-xp",
        iosIcon: informationCircleOutline,
        mdIcon: informationCircleSharp,
      },
      {
        title: "Referral Bonuses",
        url: "/referral-bonuses",
        iosIcon: shareOutline,
        mdIcon: shareSharp,
      },
      {
        title: "Log Out",
        url: "/log-out",
        iosIcon: logOutOutline,
        mdIcon: logOutSharp,
      },
    ];
    const labels = [
      "Family",
      "Friends",
      "Notes",
      "Work",
      "Travel",
      "Reminders",
    ];

    const path = window.location.pathname.split("folder/")[1];
    if (path !== undefined) {
      selectedIndex.value = appPages.findIndex(
        (page) => page.title.toLowerCase() === path.toLowerCase()
      );
    }

    const route = useRoute();

    return {
      selectedIndex,
      appPages,
      labels,
      archiveOutline,
      archiveSharp,
      bookmarkOutline,
      bookmarkSharp,
      heartOutline,
      heartSharp,
      mailOutline,
      mailSharp,
      paperPlaneOutline,
      paperPlaneSharp,
      trashOutline,
      trashSharp,
      warningOutline,
      warningSharp,
      isSelected: (url: string) => (url === route.path ? "selected" : ""),
    };
  },
});
