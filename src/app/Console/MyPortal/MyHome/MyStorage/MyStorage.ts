import { computed, defineComponent, ref } from "vue";
import { useRouter } from "vue-router";
import { actionSheetController } from "@ionic/vue";
import type { ActionSheetButton } from "@ionic/vue";
import ionic from "@/lib/mixins/ionic";

import {
  addCircleOutline,
  bagOutline,
  cashOutline,
  close,
  colorWandOutline,
  cubeOutline,
  fitnessOutline,
  keyOutline,
  sparklesOutline,
} from "ionicons/icons";
import { play$fx } from "@/assets/fx";
import { useToast } from "@/hooks/useToast";
import { useUserStore } from "@/lib/store/stores/user";
import { bagUsage, nextStorageTier, storageTierOf, storageUsage, storedOf } from "@/lib/services/inventory/Storage";
import { storageOffer } from "@/lib/services/gp/bankTeller";
import type { InventoryEntry, InventoryKind } from "@/lib/services/inventory/Inventory";
import { appSheet, useAppSkin } from "@/components/organisms/XpApp/useAppSkin";
import { useCopy } from "@/hooks/useVoice";
import XpAppBottomNav from "@/components/organisms/BottomNav/XpAppBottomNav.vue";
import XpInventoryModal from "@/app/Console/MyPortal/UserHud/MyInventory/XpInventoryModal.vue";
import type { AppNavTab } from "@/components/organisms/BottomNav/appBottomNav";

const STORAGE_TABS: AppNavTab[] = [
  { id: "all", label: "All", ionIcon: bagOutline },
  { id: "hp", label: "HP", ionIcon: fitnessOutline },
  { id: "mp", label: "MP", ionIcon: colorWandOutline },
  { id: "misc", label: "Misc", ionIcon: sparklesOutline },
  { id: "key", label: "Key", ionIcon: keyOutline },
];

type Shelf = "hp" | "mp" | "misc" | "key";

const MP_WORDS = /\b(mp|mana|ether|magic|spell)\b/i;

/** The dock tab a stored stack sits under: potions and food are HP unless they speak of mana, keys are keys, the rest is misc. */
const shelfOf = (entry: InventoryEntry): Shelf => {
  if (entry.kind === "key") return "key";
  if (entry.kind !== "consumable") return "misc";
  return MP_WORDS.test(`${entry.name} ${entry.description ?? ""}`) ? "mp" : "hp";
};

/** The one-word kind under a stack's name when it has no blurb of its own (same words as the Goods app). */
const KIND_WORDS: Record<InventoryKind, string> = {
  consumable: "Potion",
  key: "Key",
  material: "Material",
  misc: "Tool",
};

export default defineComponent({
  props: ["userId"],
  name: "my-storage",
  components: {
    XpAppBottomNav,
    XpInventoryModal,
  },
  mixins: [ionic],
  setup(props) {
    const router = useRouter();
    const userStore = useUserStore();
    const { showToast } = useToast();
    const t = useCopy();
    const { rootClass, rootStyle } = useAppSkin("storage");

    const hero = computed(() => (props.userId ? userStore.getUserById(props.userId) : userStore.currentUser));
    const heroId = computed(() => String(hero.value?.id ?? props.userId ?? ""));

    const isLocked = computed(() => storageTierOf(hero.value) === 0);
    const usage = computed(() => storageUsage(hero.value));
    const bag = computed(() => bagUsage(hero.value));

    const activeShelf = ref("all");
    const search = ref("");
    const onShelfChange = (val: string) => {
      activeShelf.value = val;
    };

    const stored = computed(() => storedOf(hero.value));
    const listItems = computed(() => {
      const needle = search.value.trim().toLowerCase();
      return stored.value.filter((entry) => {
        const onShelf = activeShelf.value === "all" || shelfOf(entry) === activeShelf.value;
        return onShelf && (!needle || entry.name.toLowerCase().includes(needle));
      });
    });

    const metaText = computed(() => (isLocked.value ? "Locked" : `${usage.value.used}/${usage.value.max} slots`));
    const sectionLabel = computed(() => {
      const tab = STORAGE_TABS.find((shelf) => shelf.id === activeShelf.value);
      const shelf = !tab || tab.id === "all" ? "In storage" : `${tab.label} items`;
      return `${shelf} · Bag ${bag.value.used}/${bag.value.max}`;
    });
    const emptyText = computed(() => {
      if (isLocked.value) return t("storage.locked");
      if (activeShelf.value === "key") return t("storage.keyNote");
      if (search.value.trim()) return t("storage.empty.search");
      const tab = STORAGE_TABS.find((shelf) => shelf.id === activeShelf.value);
      if (tab && tab.id !== "all" && stored.value.length) return t("storage.empty.shelf", { shelf: tab.label });
      return t("storage.empty.none");
    });
    const emptyIcon = computed(() => (isLocked.value || activeShelf.value !== "key" ? "treasure-chest" : "key"));

    const subtitleOf = (entry: InventoryEntry) => entry.description || KIND_WORDS[entry.kind];

    /** Take the whole stack back into the bag; a bag with no room says so and keeps the stack in storage. */
    const take = async (entry: InventoryEntry) => {
      const taken = userStore.takeItem(heroId.value, entry.id);
      if (taken) {
        play$fx("select");
        return;
      }
      play$fx("no");
      await showToast(t("storage.bagFull"), 3000, "middle");
    };

    const goToBank = () => {
      router.push({ name: "bank", params: { userId: heroId.value } });
    };

    /** The Goods bag (Store buttons on every storable stack) in a modal over this page; the list updates as stacks move. */
    const goodsOpen = ref(false);

    /**
     * The header menu: every option does something. Locked storage only sends the hero to the bank; an unlocked one opens
     * the bag to store things and, until the biggest tier is bought, offers the next tier at the bank. Take is on each row.
     */
    const presentActionSheet = async () => {
      const next = nextStorageTier(hero.value);
      const buttons: ActionSheetButton[] = [];
      if (isLocked.value) {
        buttons.push({ text: "Visit the Gold Bank", icon: cashOutline, handler: goToBank });
      } else {
        buttons.push({
          text: "Add items from bag",
          icon: addCircleOutline,
          handler: () => {
            goodsOpen.value = true;
          },
        });
        if (next) buttons.push({ text: storageOffer(next), icon: cubeOutline, handler: goToBank });
      }
      buttons.push({ text: "Cancel", icon: close, role: "cancel" });

      const actionSheet = await actionSheetController.create({
        header: t("storage.menu.header"),
        ...appSheet("storage"),
        buttons,
      });
      await actionSheet.present();
      await actionSheet.onDidDismiss();
    };

    return {
      heroId,
      goodsOpen,
      presentActionSheet,
      rootClass,
      rootStyle,
      activeShelf,
      storageTabs: STORAGE_TABS,
      onShelfChange,
      search,
      isLocked,
      listItems,
      metaText,
      sectionLabel,
      emptyText,
      emptyIcon,
      subtitleOf,
      take,
      goToBank,
    };
  },
});
