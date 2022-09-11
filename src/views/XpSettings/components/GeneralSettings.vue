<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button :router-link="`/xp-settings/`" >
            <ion-icon :icon="arrowBack" slot="icon-only"/>
          </ion-button>
        </ion-buttons>
        <ion-title> 
          General Settings
        </ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content :fullscreen="true">
      <!-- Toggles in a List -->
      <ion-list>
        <ion-item>
          <ion-label>Pepperoni</ion-label>
          <ion-toggle
            value="pepperoni"
          >
          </ion-toggle>
        </ion-item>

        <ion-item>
          <ion-label>Sausage</ion-label>
          <ion-toggle
            @ionChange="toppings.value.push($event.target.value)"
            value="sausage"
          >
          </ion-toggle>
        </ion-item>

        <ion-item>
          <ion-label>Mushrooms</ion-label>
          <ion-toggle
            value="mushrooms"
          >
          </ion-toggle>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script lang="javascript">
  import { defineComponent } from 'vue'

  import ionic from "@/assets/js/mixins/ionic";

  import {
    arrowBack
  } from "ionicons/icons"

  export default defineComponent({
    mixins: [ionic],
    setup() {

      const toppings = [];
      // code
      return {
        toppings,
        arrowBack
      }
    },
  })
</script>
