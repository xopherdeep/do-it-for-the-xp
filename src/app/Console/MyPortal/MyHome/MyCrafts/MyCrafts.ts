import { defineComponent as dC, ref, computed } from "vue";
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonActionSheet,
  IonFab,
  IonFabButton,
  IonFooter,
} from "@ionic/vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/lib/store/stores/user";
import { appSheet, useAppSkin } from "@/components/organisms/XpApp/useAppSkin";
import XpComingSoonCard from "@/app/SideMenu/XpSettings/components/XpComingSoonCard.vue";
import type { ComingSoonItem } from "@/app/SideMenu/XpSettings/components/comingSoon";

import {
  archiveOutline,
  close,
  colorWandOutline,
  sparklesOutline,
  keyOutline,
  cubeOutline,
  appsOutline,
  bedOutline,
} from "ionicons/icons";
import XpAppBottomNav from "@/components/organisms/BottomNav/XpAppBottomNav.vue";
import type { AppNavTab } from "@/components/organisms/BottomNav/appBottomNav";

const WORKBENCH_TABS: AppNavTab[] = [
  { id: "all", label: "All", ionIcon: appsOutline },
  { id: "hp", label: "Furniture", ionIcon: bedOutline },
  { id: "mp", label: "Accessories", ionIcon: colorWandOutline },
  { id: "misc", label: "Weapons", ionIcon: sparklesOutline },
  { id: "key", label: "Key", ionIcon: keyOutline },
];

/** Crafting is not built yet (the bench read a WordPress feed that no longer answers): the room says so in its own words (GitHub issue 140) */
const WORKBENCH_COMING_SOON: ComingSoonItem[] = [
  { title: "Crafting", description: "Turn the materials in your bag into new gear" },
  { title: "Repairs", description: "Mend worn gear and make it stronger" },
];

export default dC({
  name: "my-crafts",
  props: ["userId"],
  components: {
    XpAppBottomNav,
    XpComingSoonCard,
    IonPage,
    IonContent,
    IonHeader,
    IonToolbar,
    IonActionSheet,
    IonFab,
    IonFabButton,
    IonFooter,
  },
  setup(props) {
    const router = useRouter();
    const userStore = useUserStore();
    const user = computed(() => userStore.getUserById(props.userId));
    const { rootClass, rootStyle } = useAppSkin("workbench");
    const sheetAttrs = appSheet("workbench");

    const actionSheetOpen = ref(false);
    const activeTab = ref("all");

    const handleInventoryClick = () => {
      router.push({
        name: 'my-inventory',
        params: {
          userId: props.userId
        }
      })
    };

    const handleStorageClick = () => {
      router.push({
        name: 'storage',
        params: {
          userId: props.userId
        }
      })
    };

    // Every option goes somewhere: the bag with the crafting materials, or the Storage app at home.
    const actionSheetButtons = [
      {
        text: 'Materials Inventory',
        icon: cubeOutline,
        handler: handleInventoryClick,
      },
      {
        text: 'Open Storage',
        icon: archiveOutline,
        handler: handleStorageClick,
      },
      {
        text: 'Cancel',
        icon: close,
        role: 'cancel',
      },
    ];

    return {
      // Skin
      rootClass,
      rootStyle,
      sheetAttrs,

      // Local State
      user,
      actionSheetOpen,
      actionSheetButtons,
      activeTab,
      workbenchTabs: WORKBENCH_TABS,
      handleInventoryClick,
      handleStorageClick,
      comingSoonItems: WORKBENCH_COMING_SOON,
    };
  },
});
