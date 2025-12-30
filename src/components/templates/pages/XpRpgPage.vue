<template>
  <ion-page :class="['xp-rpg-page', bgClass]" :style="pageStyle">
    <!-- Header -->
    <ion-header :class="[headerClass]" :translucent="true">
      <!-- Primary Toolbar -->
      <ion-toolbar :class="['icon-colors', headerClass]">
        <ion-buttons slot="start">
          <ion-back-button v-if="backButtonHref" :default-href="backButtonHref" />
          <slot name="icon" />
          <slot name="start-actions" />
        </ion-buttons>
        <i v-if="headerIcon" slot="start" :class="['fad fa-2x', headerIcon]" />

        <ion-title>{{ title }}</ion-title>


        <ion-buttons slot="end">
          <slot name="actions" />
        </ion-buttons>
      </ion-toolbar>

      <!-- Secondary Toolbar Slot (Consumer provides ion-toolbar) -->
      <slot name="secondary-toolbar" />
    </ion-header>

    <!-- Content -->
    <ion-content :class="['icon-colors', contentClass]">
      <!-- Pull to Refresh (only if onRefresh is provided) -->
      <ion-refresher v-if="onRefresh !== null" slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <!-- Loading State -->
      <XpLoading v-if="loading" />

      <!-- Page Content -->
      <slot v-else />
    </ion-content>
    <slot name="footer" />
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonRefresher, IonRefresherContent } from '@ionic/vue';
import XpLoading from '@/components/molecules/Loading/XpLoading.vue';

export default defineComponent({
  name: 'XpRpgPage',
  components: {
    IonPage,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    XpLoading
  },
  props: {
    title: {
      type: String,
      default: ''
    },
    headerIcon: {
      type: String,
      default: ''
    },
    loading: {
      type: Boolean,
      default: false
    },
    backButtonHref: {
      type: String,
      default: ''
    },
    // Pull to refresh handler
    onRefresh: {
      type: Function as PropType<(complete: () => void) => void>,
      default: null,
      required: false
    },
    // Styling Overrides
    bgClass: {
      type: String,
      default: 'rpg-bg'
    },
    headerClass: {
      type: String,
      default: 'rpg-box icon-colors'
    },
    contentClass: {
      type: String,
      default: 'bg-transparent'
    },
    pageStyle: {
      type: [String, Object],
      default: ''
    }
  },
  methods: {
    handleRefresh(event: CustomEvent) {
      if (this.onRefresh) {
        this.onRefresh(() => {
          (event.target as any).complete();
        });
      }
    }
  }
});
</script>

<style lang="scss" scoped>
ion-content {
  --background: transparent;
}
</style>
