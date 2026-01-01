<template>
  <ion-page class="xp-temple-config">
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom" class="icon-colors">
        <ion-tab-button
          tab="general"
          :href="`/game-master/compendium/temples/${templeId}/attributes/general`"
          :selected="route.path.includes('/general')"
        >
          <i class="fad fa-cog fa-2x" />
          General
        </ion-tab-button>
        <ion-tab-button
          tab="audit"
          :href="`/game-master/compendium/temples/${templeId}/attributes/audit`"
          :selected="route.path.includes('/audit')"
        >
          <i class="fad fa-clipboard-list fa-2x" />
          Audit
        </ion-tab-button>
        <ion-tab-button
          tab="navigator"
          :href="`/game-master/compendium/temples/${templeId}/attributes/navigator`"
          :selected="route.path.includes('/navigator')"
        >
          <i class="fad fa-map-marked-alt fa-2x" />
          Navigator
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useRoute } from "vue-router";
import { IonPage, IonTabs, IonRouterOutlet, IonTabBar, IonTabButton } from "@ionic/vue";

export default defineComponent({
  name: "xp-temple-config",
  props: ["templeId"],
  components: {
    IonPage,
    IonTabs,
    IonRouterOutlet,
    IonTabBar,
    IonTabButton
  },
  setup() {
    const route = useRoute();
    return { route };
  }
});
</script>

<style lang="scss" scoped>
.xp-temple-config {
  --background: transparent;
}

.nested-tabs {
  --background: rgba(15, 17, 30, 0.8);
  backdrop-filter: blur(8px);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 0; // Stacked
  
  ion-tab-button {
    --color: rgba(255, 255, 255, 0.4);
    --color-selected: var(--ion-color-primary);
    
    i {
      margin-bottom: 4px;
      transition: all 0.2s ease;
    }
    
    &.tab-selected {
      i {
        transform: scale(1.1);
        filter: drop-shadow(0 0 8px var(--ion-color-primary));
      }
    }
  }
}
</style>
