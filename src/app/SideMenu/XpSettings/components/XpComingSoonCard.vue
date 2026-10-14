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
        <i class="fad fa-hourglass-half xp-coming-soon__icon" slot="end" aria-hidden="true"></i>
      </ion-item>
    </ion-list>
  </ion-card>
</template>

<script setup lang="ts">
import { IonBadge, IonCard, IonItem, IonItemDivider, IonLabel, IonList } from "@ionic/vue";
import type { ComingSoonItem } from "./comingSoon";

/** Settings that are planned but not built: listed with an hourglass, not a switch, so nobody mistakes them for working ones */
withDefaults(defineProps<{ items: ComingSoonItem[]; title?: string }>(), { title: "Planned" });
</script>

<style scoped lang="scss">
// dimmed but still easy to read
.xp-coming-soon__item {
  opacity: 0.8;
}

.xp-coming-soon__icon {
  margin-left: 16px;
  font-size: 18px;
  opacity: 0.6;
}

.xp-coming-soon__badge {
  margin-right: 8px;
  font-size: 11px;
}
</style>
