<template>
  <ion-page
    class="xp-portal-page"
    :class="pageClass"
  >
    <!-- Loading State -->
    <ion-content
      class="bg-transparent icon-colors"
      v-if="loading"
    >
      <div class="h-full w-full flex items-center justify-center">
        <ion-spinner name="crescent"></ion-spinner>
      </div>
    </ion-content>

    <!-- Main Portal Content -->
    <ion-content
      class="bg-transparent icon-colors"
      v-else
    >
      <!-- HUD Overlay (stats, avatar) -->
      <slot name="hud" />

      <!-- FABs (quick draw, page menu, shortcuts) -->
      <slot name="fabs" />

      <!-- Tabs with router outlet -->
      <slot name="tabs" />
    </ion-content>

    <!-- Modals (outside content for proper stacking) -->
    <slot name="modals" />
  </ion-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { IonPage, IonContent, IonSpinner } from '@ionic/vue';

export default defineComponent({
  name: 'XpPortalPage',
  components: {
    IonPage,
    IonContent,
    IonSpinner
  },
  props: {
    loading: {
      type: Boolean,
      default: false
    },
    pageClass: {
      type: String,
      default: ''
    }
  }
});
</script>

<style lang="scss" scoped>
  .xp-portal-page {
    // Inherit portal styling - let parent define specifics
  }
</style>
