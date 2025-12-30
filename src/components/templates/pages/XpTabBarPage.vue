<template>
  <xp-page :hide-header="true">
    <ion-tabs class="icon-colors">
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        <slot />
      </ion-tab-bar>
    </ion-tabs>
  </xp-page>
</template>

<script lang="ts">
  import { defineComponent } from "vue";
  import XpPage from "./XpPage.vue";
  import { IonTabBar, IonTabs } from "@ionic/vue";

  export default defineComponent({
    name: "xp-bottom-tabs",
    components: {
      XpPage,
      IonTabs,
      IonTabBar,
    },
    props: {
        bgClass: {
            type: String,
            default: 'bg-slide bg-slide-dark'
        }
    },
  });
</script>
