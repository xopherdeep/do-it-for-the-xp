<template>
  <xp-page class="xp-portal-page" :class="pageClass" :hide-header="true">
    <!-- Loading State -->
    <!-- <ion-content class="bg-transparent icon-colors" v-if="loading">
      <div class="h-full w-full flex items-center justify-center">
        <ion-spinner name="crescent"></ion-spinner>
      </div>
    </ion-content> -->

    <!-- Main Portal Content -->
    <!-- <ion-content class="bg-transparent icon-colors" v-else>
    </ion-content> -->

    <!-- Tabs with router outlet -->
    <slot name="tabs" />

    <!-- HUD Overlay (stats, avatar) -->
    <slot name="hud" />

    <!-- FABs (quick draw, page menu, shortcuts) -->
    <slot name="fabs" />

    <!-- Modals (outside content for proper stacking) -->
    <slot name="modals" />
    <slot />
  </xp-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import XpPage from './XpPage.vue';

export default defineComponent({
  name: 'XpPortalPage',
  components: {
    XpPage
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
