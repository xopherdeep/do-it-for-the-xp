<template>
  <ion-content class="my-goods">
    <template v-if="shownEntries.length">
      <xp-app-section
        v-for="section in sections"
        :key="section.kind"
        :label="section.label"
        class="goods-section"
      >
        <xp-app-row
          v-for="entry in section.entries"
          :key="entry.id"
          class="goods-row"
          :title="entry.name"
          :subtitle="subtitleOf(entry)"
          :chevron="mode !== 'battle' && !canStore(entry)"
          :disabled="isItemDisabled(entry)"
          :data-kind="entry.kind"
          :data-entry-id="entry.id"
          @click="handleEntryClick(entry)"
        >
          <template #leading>
            <xp-icon :icon="entry.faIcon || 'box'" class="goods-icon" />
          </template>

          <template v-if="getMpCost(entry) || getDisabledReasonText(entry)" #chips>
            <xp-app-chip v-if="getMpCost(entry)" kind="mp" :value="getMpCost(entry)" />
            <xp-app-chip
              v-if="getDisabledReasonText(entry)"
              class="goods-reason"
              kind="tag"
              :value="getDisabledReasonText(entry)"
            />
          </template>

          <template #trailing>
            <span class="goods-qty">&times;{{ entry.qty }}</span>
            <button
              v-if="mode === 'battle'"
              type="button"
              class="xp-app-btn goods-use-btn"
              :disabled="isItemDisabled(entry)"
              @click="handleEntryClick(entry)"
            >Use</button>
            <button
              v-if="canStore(entry)"
              type="button"
              class="xp-app-btn xp-app-btn--ghost goods-store-btn"
              @click="storeEntry(entry)"
            >Store</button>
          </template>
        </xp-app-row>
      </xp-app-section>
    </template>

    <xp-app-empty v-else icon="backpack" :text="emptyMessage" />
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
import { IonContent, IonFooter, toastController } from "@ionic/vue";
import {
  bagOutline,
  flaskOutline,
  hammerOutline,
  keyOutline,
  sparklesOutline,
} from "ionicons/icons";
import XpIcon from "@/components/atoms/Icon/XpIcon.vue";
import XpAppBottomNav from "@/components/organisms/BottomNav/XpAppBottomNav.vue";
import XpAppChip from "@/components/organisms/XpApp/XpAppChip.vue";
import XpAppEmpty from "@/components/organisms/XpApp/XpAppEmpty.vue";
import XpAppRow from "@/components/organisms/XpApp/XpAppRow.vue";
import XpAppSection from "@/components/organisms/XpApp/XpAppSection.vue";
import type { AppNavTab } from "@/components/organisms/BottomNav/appBottomNav";
import { play$fx } from "@/assets/fx";
import { useCopy } from "@/hooks/useVoice";
import { useUserStore } from "@/lib/store/stores/user";
import {
  groupInventory,
  inventoryOf,
  INVENTORY_KINDS,
  kindOf,
  type InventoryEntry,
  type InventoryKind,
} from "@/lib/services/inventory/Inventory";
import { storageTierOf } from "@/lib/services/inventory/Storage";
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

/** The section header on the All tab and the row subtitle when an item has nothing more to say. */
const KIND_LABELS: Record<InventoryKind, { section: string; one: string }> = {
  consumable: { section: "Potions", one: "Potion" },
  key: { section: "Keys", one: "Key" },
  material: { section: "Materials", one: "Material" },
  misc: { section: "Tools", one: "Tool" },
};

const EMPTY_KEYS: Record<Tab, string> = {
  all: "goods.empty.all",
  consumable: "goods.empty.consumable",
  key: "goods.empty.key",
  material: "goods.empty.material",
  misc: "goods.empty.misc",
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
const t = useCopy();
const activeTab = ref<Tab>("all");

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

/** The All tab reads as sections by kind (Potions, Keys, ...); a single-kind tab is one list under its own tab name. */
const sections = computed(() => {
  const isAll = activeTab.value === "all";
  const kinds: readonly InventoryKind[] = isAll ? INVENTORY_KINDS : [activeTab.value as InventoryKind];
  return kinds
    .map((kind) => ({
      kind,
      label: isAll ? KIND_LABELS[kind].section : "",
      entries: shownEntries.value.filter((entry) => entry.kind === kind),
    }))
    .filter((section) => section.entries.length > 0);
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

const emptyMessage = computed(() => t(EMPTY_KEYS[activeTab.value]));

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

const getMpCost = (entry: InventoryItemWithRaw): number => {
  const card = resolveBattleCard(entry);
  return card?.mp || 0;
};

/** One line under the name: what the item does in a fight, else its blurb, else what kind of thing it is. */
const subtitleOf = (entry: InventoryItemWithRaw): string =>
  getBattleEffectText(entry) || entry.description || KIND_LABELS[entry.kind].one;

const isItemDisabled = (entry: InventoryItemWithRaw): boolean => {
  if (props.mode !== "battle") return false;
  const card = resolveBattleCard(entry);
  if (!card) return false;
  return Boolean(card.reason);
};

// ---- Store: move a whole stack from the bag to the storage bought at the Gold Bank (Goods, not in a fight) ----

const isStorageUnlocked = computed(() => storageTierOf(targetUser.value) > 0);

/** The stacks the hero's bag really holds: an entry that only came in as equipment has nothing to move. */
const bagIds = computed(() => new Set(inventoryOf(targetUser.value).map((entry) => entry.id)));

/** Keys stay on the hero, a locked storage takes nothing and a fight has its Use button only. */
const canStore = (entry: InventoryItemWithRaw): boolean =>
  props.mode === "view" && isStorageUnlocked.value && entry.kind !== "key" && bagIds.value.has(entry.id);

const showToast = async (message: string) => {
  const toast = await toastController.create({
    message,
    cssClass: "rpg-toast",
    position: "middle",
    duration: 2500,
    buttons: [{ text: "OK", role: "cancel" }],
  });
  await toast.present();
};

const storeEntry = (entry: InventoryItemWithRaw) => {
  const heroId = targetUser.value?.id;
  const isStored = Boolean(heroId) && userStore.storeItem(heroId, entry.id);
  if (isStored) {
    play$fx("select");
    return;
  }
  play$fx("no");
  showToast(t("goods.toast.storageFull"));
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
.inventory-footer {
  background: transparent;
}

// The rows, sections, chips and empty state come from the XpApp kit (_xp-app.scss); only the item bits live here.
.goods-row {
  .goods-store-btn {
    min-height: 28px;
    padding: 0 10px;
  }

  .goods-qty {
    color: var(--xp-app-text);
    font-family: var(--xp-app-font-title);
    font-size: 0.95rem;
  }

  // Why the item cannot be used right now: a red tag that may wrap, so a long hint is never cut off.
  .goods-reason {
    --chip-rgb: 255, 107, 94;
    max-width: 100%;
    text-align: left;
    white-space: normal;
  }
}
</style>
