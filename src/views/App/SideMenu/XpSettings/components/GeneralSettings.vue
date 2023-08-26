<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/xp-settings/`"></ion-back-button>
        </ion-buttons>
        <ion-title> General Settings </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rpg-box">
      <ion-list>
        <ion-item>
          <ion-label>
            <h2>
              Set my landing page

            </h2>
            <p>This is the page you are taken to when signing in.</p>
          </ion-label>
          <ion-select placeholder="Select page...">
            <ion-select-option value="community"> Community </ion-select-option>
            <ion-select-option value="party"> Family Party </ion-select-option>
            <ion-select-option value="quests"> Quests Tab </ion-select-option>
            <ion-select-option value="merchant">
              Merchant Tab
            </ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item>
          <ion-label>
            <h2>
              Start My Week on Sunday
            </h2>
          </ion-label>
          <ion-toggle value="start_week_on_sunday"> </ion-toggle>
        </ion-item>

        <ion-item>
          <ion-label>
            <h2>
              Lock My Family Setup

            </h2>
            <p>Prevent making changes to the family</p>
          </ion-label>
          <ion-toggle value="family"> </ion-toggle>
        </ion-item>
        <ion-item>
          <ion-label>
            <h2>
              Enable "Overview" from Choose Profile

            </h2>
          </ion-label>
          <ion-toggle value="mushrooms"> </ion-toggle>
        </ion-item>
        <ion-item>
          <ion-label>
            <h2>

              Community
            </h2>
            <ion-badge color="warning" size="small">
              <i class="fa fa-crown" />
              Premium
            </ion-badge>
            <p>
              For premium users only, turn off community by disabling this
              switch.
            </p>
          </ion-label>
          <ion-toggle value="community" checked disabled> </ion-toggle>
        </ion-item>
      </ion-list>
      <!-- Toggles in a List -->
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent } from "vue";

  import ionic from "@/mixins/ionic";

  import { arrowBack } from "ionicons/icons";

  export default defineComponent({
    mixins: [ionic],
    setup() {
      const toppings = [];
      // code
      return {
        toppings,
        arrowBack,
      };
    },
  });
</script>
