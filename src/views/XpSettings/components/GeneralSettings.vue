<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button 
            :default-href="`/xp-settings/`" 
          ></ion-back-button>
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
          <ion-label>
            Set my landing page
            <p>
              This is the page you are taken to when signing in.
            </p>
          </ion-label>
          <ion-select placeholder="Select page...">
            <ion-select-option value="community">
              Community
            </ion-select-option>
            <ion-select-option value="party">
              Family Party
            </ion-select-option>
            <ion-select-option value="quests">
              Quests Tab
            </ion-select-option>
            <ion-select-option value="merchant">
              Merchant Tab
            </ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item>
          <ion-label>Start My Week on Sunday</ion-label>
          <ion-toggle
            value="start_week_on_sunday"
          >
          </ion-toggle>
        </ion-item>

        <ion-item>
          <ion-label>
            Lock My Family Setup
            <p>
              Prevent making changes to the family
            </p>
          </ion-label>
          <ion-toggle
            value="family"
          >
          </ion-toggle>
        </ion-item>
        <ion-item>
          <ion-label>
            Enable "Overview" from Choose Profile
          </ion-label>
          <ion-toggle
            value="mushrooms"
          >
          </ion-toggle>
        </ion-item>
        <ion-item>
          <ion-label>
            Community
              <ion-badge color="warning" size="small">
                <i class="fa fa-crown"/>
                Premium
              </ion-badge>
            <p>
              For premium users only, turn off community by disabling this switch.
            </p>
          </ion-label>
          <ion-toggle
            value="community"
            checked
            disabled
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
