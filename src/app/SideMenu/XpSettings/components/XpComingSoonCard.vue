<template>
  <ion-card class="max-w-2xl xp-coming-soon" data-cy="coming-soon">
    <ion-list>
      <ion-item-divider>
        <ion-label>{{ title }}</ion-label>
        <ion-badge slot="end" color="medium" class="xp-coming-soon__badge">Coming soon</ion-badge>
      </ion-item-divider>
      <ion-item
        v-for="(item, index) in items"
        :key="item.title"
        :lines="index === items.length - 1 ? 'none' : undefined"
        class="xp-coming-soon__item"
      >
        <ion-label>
          <h2>{{ item.title }}</h2>
          <p>{{ item.description }}</p>
        </ion-label>
        <ion-toggle disabled></ion-toggle>
      </ion-item>
    </ion-list>
  </ion-card>
</template>

<script setup lang="ts">
import { IonBadge, IonCard, IonItem, IonItemDivider, IonLabel, IonList, IonToggle } from "@ionic/vue";
import type { ComingSoonItem } from "./comingSoon";

/** Settings that are planned but not built: shown greyed out so nobody mistakes them for working switches */
withDefaults(defineProps<{ items: ComingSoonItem[]; title?: string }>(), { title: "Planned" });
</script>

<style scoped lang="scss">
.xp-coming-soon__item {
  opacity: 0.7;
}

.xp-coming-soon__badge {
  margin-right: 8px;
  font-size: 11px;
}
</style>
