import { defineComponent } from "vue";
import ionic from "@/lib/mixins/ionic"

import {
  arrowBack,
  chevronBack,
  chevronForward,
  bagOutline,
  flaskOutline,
  keyOutline,
  hammerOutline,
  sparklesOutline,
} from "ionicons/icons";
import { useUserStore } from "@/lib/store/stores/user";
import {
  groupInventory,
  inventoryOf,
  INVENTORY_KINDS,
  type InventoryEntry,
  type InventoryKind,
} from "@/lib/services/inventory/Inventory";

type Tab = "all" | InventoryKind;

/** The tabs in order, with the label and ionicon each wears. */
const TABS: { value: Tab; label: string; color: string }[] = [
  { value: "all", label: "All", color: "primary" },
  { value: "consumable", label: "Potions", color: "danger" },
  { value: "key", label: "Keys", color: "gold" },
  { value: "material", label: "Materials", color: "success" },
  { value: "misc", label: "Misc", color: "tertiary" },
];

const TAB_ICONS: Record<Tab, string> = {
  all: bagOutline,
  consumable: flaskOutline,
  key: keyOutline,
  material: hammerOutline,
  misc: sparklesOutline,
};

const EMPTY_LINES: Record<Tab, string> = {
  all: "Your pack is empty. Shops and chests fill it.",
  consumable: "No potions in your pack. Temple shops brew them.",
  key: "No keys in your pack. Look under the chests.",
  material: "No materials in your pack. Crafting starts with a find.",
  misc: "Nothing odd in your pack yet. The world is full of oddities.",
};

export default defineComponent({
  props: ["userId"],
  name: "my-inventory",
  mixins: [ionic],
  data() {
    return {
      tab: "all" as Tab,
      tabs: TABS,
      tabIcons: TAB_ICONS,
    };
  },
  computed: {
    userStore() { return useUserStore() },
    user() {
      return (this as any).userStore.getUserById(this.userId);
    },
    /** Every item in the bag, merged and sorted. */
    entries(): InventoryEntry[] {
      return inventoryOf((this as any).user);
    },
    /** What the open tab shows. */
    shown(): InventoryEntry[] {
      const tab = (this as any).tab as Tab;
      const entries = (this as any).entries as InventoryEntry[];
      if (tab === "all") return entries;
      return groupInventory(entries)[tab];
    },
    /** How many of each kind, for the badges on the tabs. */
    counts(): Record<Tab, number> {
      const entries = (this as any).entries as InventoryEntry[];
      const groups = groupInventory(entries);
      const counts = { all: entries.length } as Record<Tab, number>;
      for (const kind of INVENTORY_KINDS) counts[kind] = groups[kind].length;
      return counts;
    },
    emptyLine(): string {
      return EMPTY_LINES[(this as any).tab as Tab];
    },
  },
  methods: {
    segmentChanged(ev: CustomEvent<{ value?: string | number | null }>) {
      const value = String(ev.detail?.value ?? "all");
      this.tab = (TABS.some((t) => t.value === value) ? value : "all") as Tab;
    },
    iconClass(entry: InventoryEntry): string {
      return `fad fa-${entry.faIcon || "box"} fa-lg`;
    },
  },
  setup() {
    return {
      arrowBack,
      chevronBack,
      chevronForward,
    };
  },
});
