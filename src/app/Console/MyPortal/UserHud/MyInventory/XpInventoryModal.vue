<template>
  <ion-modal
    ref="modal"
    :is-open="isOpen"
    class="user-profile-modal xp-inventory-modal"
    :breakpoints="[0, 1]"
    :initialBreakpoint="1"
    :handle="false"
    @didDismiss="close"
  >
    <ion-header>
      <ion-toolbar color="danger">
        <ion-buttons slot="start">
          <xp-icon icon="backpack" size="lg" class="header-icon" />
        </ion-buttons>
        <ion-title>My Goods</ion-title>
        <ion-buttons slot="end">
          <xp-close-button size="lg" color="light" @click="close" />
        </ion-buttons>
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
import {
  IonButtons,
  IonHeader,
  IonModal,
  IonTitle,
  IonToolbar,
} from "@ionic/vue";
import XpCloseButton from "@/components/atoms/CloseButton/XpCloseButton.vue";
import XpIcon from "@/components/atoms/Icon/XpIcon.vue";
import XpInventorySheet from "./XpInventorySheet.vue";
import type { BattleItemCard } from "@/lib/services/battle/BattleItems";

defineOptions({
  name: "xp-inventory-modal",
});

const props = withDefaults(
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
.header-icon {
  margin-left: 0.75rem;
  margin-right: 0.25rem;
}

ion-title {
  font-family: "StatusPlz", monospace;
  letter-spacing: 0.04em;
  font-size: 1.15rem;
}
</style>
