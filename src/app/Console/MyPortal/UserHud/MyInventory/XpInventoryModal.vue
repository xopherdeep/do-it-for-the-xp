<template>
  <ion-modal
    ref="modal"
    :is-open="isOpen"
    class="xp-inventory-modal"
    :class="rootClass"
    :style="rootStyle"
    :breakpoints="[0, 1]"
    :initialBreakpoint="1"
    :handle="false"
    @didDismiss="close"
  >
    <ion-header>
      <ion-toolbar>
        <xp-app-header title="My Goods" icon="backpack">
          <template #end>
            <xp-close-button size="lg" color="light" @click="close" />
          </template>
        </xp-app-header>
      </ion-toolbar>
    </ion-header>

    <xp-inventory-sheet
      :user="user"
      :user-id="userId"
      :equipment="equipment"
      :mode="mode"
      :battle-card="battleCard"
      :opens-directly="opensDirectly"
      @use-item="onUseItem"
      @select-item="onSelectItem"
    />
  </ion-modal>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { IonHeader, IonModal, IonToolbar } from "@ionic/vue";
import XpCloseButton from "@/components/atoms/CloseButton/XpCloseButton.vue";
import XpAppHeader from "@/components/organisms/XpApp/XpAppHeader.vue";
import { useAppSkin } from "@/components/organisms/XpApp/useAppSkin";
import XpInventorySheet from "./XpInventorySheet.vue";
import type { BattleItemCard } from "@/lib/services/battle/BattleItems";

defineOptions({
  name: "xp-inventory-modal",
});

withDefaults(
  defineProps<{
    isOpen: boolean;
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
  (e: "close"): void;
  (e: "use-item", item: any): void;
  (e: "select-item", item: any): void;
}>();

const modal = ref<any>(null);

// The Goods app skin (red accent) follows the Retro / Modern toggle; the kit CSS reads it from this root class.
const { rootClass, rootStyle } = useAppSkin("goods");

const close = () => {
  emit("close");
};

const onUseItem = (item: any) => {
  emit("use-item", item);
};

const onSelectItem = (item: any) => {
  emit("select-item", item);
};
</script>

<style lang="scss" scoped>
// The sheet is the Goods phone app: a plain app surface with one thin frame instead of the Earthbound window.
.xp-inventory-modal {
  // The modal host covers the whole screen: the kit's page background belongs on the sheet behind (::part below), not here.
  background: transparent;
  --background: var(--xp-app-bg);
  --box-shadow: none;
  --height: 99%;
  --width: 98%;
  --border-radius: 14px 14px 0 0;

  &::part(content) {
    max-width: 700px;
    margin: 0 auto;
    background: var(--xp-app-bg);
    border: var(--xp-app-section-border);
    border-bottom: 0;
  }
}
</style>
