<template>
  <ion-content class="my-goods">
    <ion-list
      v-if="shownEntries.length"
      class="goods-list"
      lines="none"
    >
      <ion-item
        v-for="entry in shownEntries"
        :key="entry.id"
        class="goods-row"
        :class="{ 'is-disabled': isItemDisabled(entry), 'is-clickable': true }"
        :data-kind="entry.kind"
        :data-entry-id="entry.id"
        @click="handleEntryClick(entry)"
      >
        <xp-icon
          slot="start"
          :icon="entry.faIcon || 'box'"
          size="lg"
          class="goods-icon icon-colors"
        />

        <ion-label>
          <ion-text class="goods-name-wrapper">
            <ion-label class="goods-name">{{ entry.name }}</ion-label>
          </ion-text>
          <ion-text v-if="getBattleEffectText(entry)" class="goods-blurb-wrapper">
            <ion-label class="goods-blurb">{{ getBattleEffectText(entry) }}</ion-label>
          </ion-text>
          <ion-text v-else-if="entry.description" class="goods-blurb-wrapper">
            <ion-label class="goods-blurb">{{ entry.description }}</ion-label>
          </ion-text>
          <ion-text v-if="getDisabledReasonText(entry)" class="goods-reason-wrapper">
            <ion-label class="goods-reason">{{ getDisabledReasonText(entry) }}</ion-label>
          </ion-text>
        </ion-label>

        <ion-badge
          v-if="getMpCostText(entry)"
          slot="end"
          color="tertiary"
          class="goods-mp"
        >{{ getMpCostText(entry) }}</ion-badge>

        <ion-badge
          slot="end"
          class="goods-qty"
          color="dark"
        >&times;{{ entry.qty }}</ion-badge>

        <ion-button
          v-if="mode === 'battle'"
          slot="end"
          size="small"
          color="danger"
          class="goods-use-btn"
          :disabled="isItemDisabled(entry)"
          @click.stop="handleEntryClick(entry)"
        >Use</ion-button>
      </ion-item>
    </ion-list>

    <ion-card
      v-else
      class="goods-empty"
    >
      <ion-card-content class="ion-text-center">
        <xp-icon icon="backpack" size="3x" class="empty-icon" />
        <ion-text class="empty-text-wrapper">
          <ion-label class="empty-message">{{ emptyMessage }}</ion-label>
        </ion-text>
      </ion-card-content>
    </ion-card>
  </ion-content>

  <ion-footer class="inventory-footer">
    <xp-app-bottom-nav
      :tabs="navTabs"
      v-model="activeTab"
      aria-label="Goods Navigation"
    />
  </ion-footer>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonFooter,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonText,
} from "@ionic/vue";
import {
  bagOutline,
  flaskOutline,
  hammerOutline,
  keyOutline,
  sparklesOutline,
} from "ionicons/icons";
import XpIcon from "@/components/atoms/Icon/XpIcon.vue";
import XpAppBottomNav from "@/components/organisms/BottomNav/XpAppBottomNav.vue";
import type { AppNavTab } from "@/components/organisms/BottomNav/appBottomNav";
import { useUserStore } from "@/lib/store/stores/user";
import {
  groupInventory,
  inventoryOf,
  INVENTORY_KINDS,
  kindOf,
  type InventoryEntry,
  type InventoryKind,
} from "@/lib/services/inventory/Inventory";
import type { BattleItemCard } from "@/lib/services/battle/BattleItems";

type Tab = "all" | InventoryKind;

const TABS: { value: Tab; label: string; color: string }[] = [
  { value: "all", label: "All", color: "primary" },
  { value: "consumable", label: "Potions", color: "danger" },
  { value: "key", label: "Keys", color: "gold" },
  { value: "material", label: "Materials", color: "success" },
  { value: "misc", label: "Tools", color: "tertiary" },
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
  misc: "No special tools in your pack. The world is full of oddities.",
};

interface InventoryItemWithRaw extends InventoryEntry {
  rawItem?: any;
}

const props = withDefaults(
  defineProps<{
    user?: any;
    userId?: string;
    equipment?: any[];
    mode?: "view" | "battle";
    battleCard?: ((item: any) => BattleItemCard | null) | null;
    opensDirectly?: ((item: any) => boolean) | null;
  }>(),
  {
    mode: "view",
    battleCard: null,
    opensDirectly: null,
    user: null,
    userId: "",
    equipment: () => [],
  }
);

const emit = defineEmits<{
  (e: "use-item", item: any): void;
  (e: "select-item", item: any): void;
}>();

const userStore = useUserStore();
const activeTab = ref<Tab>("all");
const tabs = TABS;
const tabIcons = TAB_ICONS;

const targetUser = computed(() => {
  if (props.user) return props.user;
  if (props.userId) return userStore.getUserById(props.userId);
  return userStore.currentUser;
});

const allEntries = computed<InventoryItemWithRaw[]>(() => {
  const fromInventory: InventoryItemWithRaw[] = inventoryOf(targetUser.value).map((entry) => ({
    ...entry,
    rawItem: entry,
  }));

  const fromEquipment: InventoryItemWithRaw[] = (props.equipment || []).map((item, index) => {
    const rawName = typeof item?.name === "string" ? item.name : "Tool";
    const faIcon = typeof item?.faIcon === "string" ? item.faIcon.replace(/^fa-/, "") : "cube";
    const kind = kindOf(item);
    return {
      id: item?.id || `equip-${rawName.toLowerCase().replace(/\s+/g, "-")}-${index}`,
      name: rawName,
      qty: item?.qty || item?.quantity || 1,
      kind,
      faIcon,
      description: item?.desc || item?.description,
      rawItem: item,
    };
  });

  const merged = new Map<string, InventoryItemWithRaw>();
  for (const entry of fromInventory) {
    merged.set(entry.name.toLowerCase(), entry);
  }
  for (const entry of fromEquipment) {
    const key = entry.name.toLowerCase();
    const existing = merged.get(key);
    if (existing) {
      existing.rawItem = entry.rawItem;
      if (!existing.faIcon && entry.faIcon) existing.faIcon = entry.faIcon;
      if (!existing.description && entry.description) existing.description = entry.description;
    } else {
      merged.set(key, entry);
    }
  }

  return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name));
});

const shownEntries = computed<InventoryItemWithRaw[]>(() => {
  if (activeTab.value === "all") return allEntries.value;
  return allEntries.value.filter((entry) => entry.kind === activeTab.value);
});

const counts = computed<Record<Tab, number>>(() => {
  const groups = groupInventory(allEntries.value);
  const result = { all: allEntries.value.length } as Record<Tab, number>;
  for (const kind of INVENTORY_KINDS) {
    result[kind] = groups[kind].length;
  }
  return result;
});

const navTabs = computed<AppNavTab[]>(() =>
  TABS.map((t) => ({
    id: t.value,
    label: t.label,
    ionIcon: TAB_ICONS[t.value],
    badge: counts.value[t.value] || 0,
    badgeColor: t.value === "consumable" ? "danger" : t.value === "key" ? "warning" : "primary",
  }))
);

const emptyMessage = computed(() => EMPTY_LINES[activeTab.value]);

const resolveBattleCard = (entry: InventoryItemWithRaw): BattleItemCard | null => {
  if (props.mode !== "battle" || !props.battleCard) return null;
  const itemToEvaluate = entry.rawItem || entry;
  return props.battleCard(itemToEvaluate);
};

const getBattleEffectText = (entry: InventoryItemWithRaw): string => {
  const card = resolveBattleCard(entry);
  if (!card) return "";
  return card.effect || "";
};

const getDisabledReasonText = (entry: InventoryItemWithRaw): string => {
  const card = resolveBattleCard(entry);
  if (!card) return "";
  return card.reason || "";
};

const getMpCostText = (entry: InventoryItemWithRaw): string => {
  const card = resolveBattleCard(entry);
  if (!card || !card.mp) return "";
  return `${card.mp} MP`;
};

const isItemDisabled = (entry: InventoryItemWithRaw): boolean => {
  if (props.mode !== "battle") return false;
  const card = resolveBattleCard(entry);
  if (!card) return false;
  return Boolean(card.reason);
};

const handleEntryClick = (entry: InventoryItemWithRaw) => {
  const itemToPass = entry.rawItem || entry;
  if (props.mode === "battle") {
    if (isItemDisabled(entry)) return;
    emit("use-item", itemToPass);
  } else {
    emit("select-item", itemToPass);
  }
};
</script>

<style lang="scss" scoped>
:root {
  --color-light: var(--ion-color-danger-tint);
  --color-medium: var(--ion-color-danger-shade);
  --color-dark: var(--ion-color-danger);
  --color-darkest: var(--ion-color-danger-shade);
}

.inventory-footer {
  background: transparent;
}

.my-goods {
  --padding-top: 0.5rem;
  --padding-bottom: 0.5rem;

  .goods-list {
    background: transparent;
    padding: 0 0.5rem;
  }

  .goods-row {
    --background: rgba(var(--ion-color-rpg-contrast-rgb, 26, 26, 36), 0.85);
    --color: var(--ion-color-rpg, #d9a877);
    --padding-start: 0.75rem;
    --inner-padding-end: 0.75rem;
    --min-height: 3.5rem;
    margin-bottom: 0.5rem;
    border: 3px solid var(--ion-color-rpg, #d9a877);
    border-radius: 0;
    box-shadow: inset 0 0 0 2px var(--ion-color-rpg-contrast, #1a1a24), 4px 4px 0 rgba(0, 0, 0, 0.5);

    &.is-clickable {
      cursor: pointer;
    }

    &.is-disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .goods-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.5rem;
      height: 2.5rem;
      margin-right: 0.75rem;
      border: 2px solid var(--ion-color-rpg, #d9a877);
      background: rgba(var(--ion-color-rpg-rgb, 217, 168, 119), 0.08);
    }

    .goods-name-wrapper {
      display: block;
    }

    .goods-name {
      font-family: "StatusPlz", monospace;
      font-size: 1.05rem;
      letter-spacing: 0.02em;
      text-transform: capitalize;
      margin: 0;
    }

    .goods-blurb-wrapper {
      display: block;
      margin-top: 0.15rem;
    }

    .goods-blurb {
      font-family: "StatusPlz", monospace;
      font-size: 0.85rem;
      opacity: 0.85;
      white-space: normal;
    }

    .goods-reason-wrapper {
      display: block;
      margin-top: 0.15rem;
    }

    .goods-reason {
      font-size: 0.85rem;
      color: var(--ion-color-danger, #e53935);
      font-family: "StatusPlz", monospace;
    }

    .goods-mp {
      font-family: "StatusPlz", monospace;
      font-size: 0.85rem;
      margin-right: 0.4rem;
    }

    .goods-qty {
      font-family: "StatusPlz", monospace;
      font-size: 0.95rem;
      padding: 0.3rem 0.5rem;
      border-radius: 0;
      border: 2px solid var(--ion-color-rpg, #d9a877);
      margin-right: 0.4rem;
    }

    .goods-use-btn {
      font-family: "StatusPlz", monospace;
      font-size: 0.95rem;
      --border-radius: 0;
      font-weight: bold;
    }

    &[data-kind="consumable"] .goods-icon { color: var(--ion-color-danger); }
    &[data-kind="key"] .goods-icon { color: var(--ion-color-gold, var(--ion-color-warning)); }
    &[data-kind="material"] .goods-icon { color: var(--ion-color-success); }
    &[data-kind="misc"] .goods-icon { color: var(--ion-color-tertiary); }
  }

  .goods-empty {
    margin: 3rem 1.5rem;
    padding: 1.5rem 1rem;
    text-align: center;
    border: 3px solid var(--ion-color-rpg, #d9a877);
    background: rgba(var(--ion-color-rpg-contrast-rgb, 26, 26, 36), 0.85);
    color: var(--ion-color-rpg, #d9a877);
    box-shadow: inset 0 0 0 2px var(--ion-color-rpg-contrast, #1a1a24), 4px 4px 0 rgba(0, 0, 0, 0.5);

    .empty-icon {
      opacity: 0.6;
      margin-bottom: 1rem;
    }

    .empty-text-wrapper {
      display: block;
    }

    .empty-message {
      font-family: "Apple Kid", "StatusPlz", sans-serif;
      font-size: 1.15rem;
      line-height: 1.5;
    }
  }
}
</style>
