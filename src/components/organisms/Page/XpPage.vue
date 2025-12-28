<template>
  <ion-page :class="['xp-page', bgClass]" :style="pageStyle">
    <ion-header v-if="!hideHeader" :class="[headerClass]" :style="headerStyle">
      <ion-toolbar :class="[headerClass]">
        <ion-buttons slot="start">
           <ion-back-button :default-href="backButtonHref" />
        </ion-buttons>
        
        <!-- Standard Title Logic -->
        <div v-if="!$slots['toolbar-content'] && (title || headerIcon)" class="flex items-center">
            <i v-if="headerIcon" :class="['fad fa-2x', headerIcon]" style="margin-right: 10px;" />
            <ion-title>{{ title }}</ion-title>
        </div>

        <slot name="toolbar-content" />

        <slot name="actions" slot="end" />
      </ion-toolbar>
    </ion-header>
    
    <XpLoading v-if="loading"/>
    
    <slot v-else /> 
  </ion-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle } from '@ionic/vue';
import XpLoading from '@/components/molecules/Loading/XpLoading.vue';


export default defineComponent({
  name: 'XpPage',
  components: {
    IonPage,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
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
    headerClass: {
      type: String,
      default: 'rpg-box icon-colors'
    },
    bgClass: {
      type: String,
      default: ''
    },
    hideHeader: {
      type: Boolean,
      default: false
    },
    loading: {
      type: Boolean,
      default: false
    },
    backButtonHref: {
      type: String,
      default: ''
    },
    pageStyle: {
        type: [String, Object],
        default: ''
    },
    headerStyle: {
        type: [String, Object],
        default: ''
    }
  }
});
</script>

<style lang="scss" scoped>
// Ensure flex compatibility for title slot
.flex {
    display: flex;
}
.items-center {
    align-items: center;
}
</style>
