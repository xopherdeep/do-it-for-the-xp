<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-button :router-link="`/xp-settings/`" >
            <ion-icon :icon="arrowBack" slot="icon-only"/>
          </ion-button>
        </ion-buttons>
        <ion-title> 
          Sound Settings
        </ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content :fullscreen="true">
      <!-- Toggles in a List -->
      <ion-grid>
        <ion-row>
          <ion-col>
            <ion-card>
              <InputSettings/>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-page>
</template>

<script lang="js">
  import { defineComponent } from 'vue'

  import ionic from "@/assets/js/mixins/ionic";
  import InputSettings from "./InputSettings.vue"

  import {
    arrowBack
  } from "ionicons/icons"

  export default defineComponent({
    components: {
      InputSettings,
    },
    mixins: [ionic],
    setup() {
      return {
        arrowBack
      }
    },
  })
</script>
