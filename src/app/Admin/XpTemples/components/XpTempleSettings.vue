<template>
  <ion-page :class="$options.name" class="rpg-box bg-slide bg-slide-dark">
    <ion-tabs>
      <ion-router-outlet ref="outlet"></ion-router-outlet>
      <ion-tab-bar slot="bottom" class="icon-colors">

        <ion-tab-button tab="attributes" :href="`/game-master/compendium/setup/temples/${templeId}/attributes/general`"
          :selected="route.path.includes('/attributes')">
          <i class="fad fa-sliders-h fa-2x" />
          Config
        </ion-tab-button>

        <ion-tab-button tab="beasts" :href="`/game-master/compendium/setup/temples/${templeId}/beasts`"
          :selected="route.path.includes('/beasts')">
          <i class="fad fa-paw-claws fa-2x" />
          Beasts
        </ion-tab-button>
        <ion-tab-button tab="dashboard" :href="`/game-master/compendium/setup/temples/${templeId}/dashboard`"
          :selected="route.path.includes('/dashboard')">
          <i :class="['fad', templeIcon, 'fa-2x']" />
          Temple
        </ion-tab-button>
        <ion-tab-button tab="layout" :href="`/game-master/compendium/setup/temples/${templeId}/layout`"
          :selected="route.path.includes('/layout')">
          <i class="fad fa-dungeon fa-2x" />
          Layout
        </ion-tab-button>
        <ion-tab-button tab="rooms" :href="`/game-master/compendium/setup/temples/${templeId}/rooms`"
          :selected="route.path.includes('/rooms')">
          <i class="fad fa-door-open fa-2x" />
          Rooms
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  IonPage,
  IonTabs,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton
} from "@ionic/vue";
import { useTempleData, TempleDataInjectionKey } from "../hooks/useTempleData";
import { provide } from "vue";

export default defineComponent({
  name: "xp-temple-settings",
  props: ["templeId"],
  components: {
    IonPage,
    IonTabs,
    IonRouterOutlet,
    IonTabBar,
    IonTabButton
  },
  setup(props) {
    const route = useRoute();
    const router = useRouter();
    const templeData = useTempleData(props.templeId);
    provide(TempleDataInjectionKey, templeData);

    const templeIcon = computed(() => {
      const icons: Record<string, string> = {
        "wind-temple": "fa-wind",
        "earth-temple": "fa-leaf",
        "water-temple": "fa-water",
        "fire-temple": "fa-flame",
        "ice-temple": "fa-snowflake",
        "light-temple": "fa-sun",
        "lightning-temple": "fa-bolt",
        "shadow-temple": "fa-moon",
      };
      return icons[props.templeId] || "fa-place-of-worship";
    });

    return {
      route,
      router,
      templeIcon,
      ...templeData
    };
  }
});
</script>

<style lang="scss" scoped>
.xp-temple-settings {
  // :deep(ion-tab-bar) {
  //   --background: var(--ion-color-dark);
  //   background: var(--ion-color-dark);
  // }

  // ion-tab-bar {
  //   --background: var(--ion-color-dark);
  //   background: var(--ion-color-dark);
  // }
}
</style>
