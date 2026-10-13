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
import { useItemFetcher } from "@/hooks/useItemFetcher";
import XpLoading from "@/components/molecules/Loading/XpLoading.vue";
import { sanitizeHtml } from "@/lib/utils/sanitizeHtml";
import { appSheet, useAppSkin } from "@/components/organisms/XpApp/useAppSkin";
import { useCopy } from "@/hooks/useVoice";

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

/** The rendered HTML the server sends as plain text (entities decoded, tags dropped) for a row title or subtitle. */
const plainText = (html?: string | null): string => {
  const clean = sanitizeHtml(html);
  if (!clean) return "";
  const doc = new DOMParser().parseFromString(clean, "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
};

export default dC({
  name: "my-crafts",
  props: ["userId"],
  components: {
    XpLoading,
    XpAppBottomNav,
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
    const t = useCopy();
    const { rootClass, rootStyle } = useAppSkin("workbench");
    const sheetAttrs = appSheet("workbench");

    // Initialize Fetcher with default params from original data
    const fetcher = useItemFetcher("xp_accessory", {
      page: 1,
      search: "",
      per_page: 4,
    });

    const isLoading = fetcher.isLoading;
    const request = fetcher.request;
    const actionSheetOpen = ref(false);
    const activeTab = ref("all");

    const onTabChange = (val: string) => {
      activeTab.value = val;
      request.params.filter = val === "all" ? "" : val;
      request.params.page = 1;
    };

    const onSearch = () => {
      request.params.page = 1;
    };

    const loadMore = () => {
      request.params.page++;
    };

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

    // The list scrolls: every page loaded so far, one after the other.
    const listItems = computed<any[]>(() => {
      const pages = Math.max(1, Number(request.params.page) || 1);
      const rows: any[] = [];
      for (let page = 1; page <= pages; page++) {
        rows.push(...fetcher.getSlideItems(page));
      }
      return rows;
    });

    const itemTitle = (item: any) => plainText(item?.title?.rendered) || "Unnamed item";
    const itemSubtitle = (item: any) => plainText(item?.excerpt?.rendered);
    const itemImage = (item: any) => fetcher.getImgObj(item?.featured_media)?.src || "";

    const hasSearch = computed(() => Boolean(String(request.params.search || "").trim()));
    const sectionLabel = computed(() => {
      const tab = WORKBENCH_TABS.find((entry) => entry.id === activeTab.value);
      return !tab || tab.id === "all" ? "On the bench" : tab.label;
    });
    const metaText = computed(() => {
      const total = fetcher.nTotalItems.value || listItems.value.length;
      return total ? `${total} ${total === 1 ? "item" : "items"}` : "";
    });
    const emptyText = computed(() => t(hasSearch.value ? "workbench.empty.search" : "workbench.empty.bare"));

    return {
      // Fetcher
      ...fetcher,
      isLoading,
      request,

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
      onTabChange,
      onSearch,
      loadMore,
      handleInventoryClick,
      handleStorageClick,

      // List
      listItems,
      itemTitle,
      itemSubtitle,
      itemImage,
      sectionLabel,
      metaText,
      emptyText,
    };
  },
});
