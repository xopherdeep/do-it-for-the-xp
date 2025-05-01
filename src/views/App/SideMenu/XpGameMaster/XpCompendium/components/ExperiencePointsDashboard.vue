<template>
  <ion-grid class="icon-colors">
    <ion-row>
      <!-- Total XP Earned -->
      <ion-col size="6">
        <XpStatBox :value="1234567" label="XP Sown" iconName="fa-tree-alt" iconColor="success" />
      </ion-col>
      <!-- Active Streak -->
      <ion-col size="6">
        <XpStatBox :value="5678" label="Avg XP per Quest" iconName="fa-hand-holding-seedling"  />
      </ion-col>
      <!-- Tasks Completed Today -->
      <ion-col >
        <XpStatBox :value="75" label="XP Today" iconName="fa-calendar-day" iconColor="primary" />
      </ion-col>
      <ion-col >
        <XpStatBox :value="123" label="XP This Week" iconName="fa-calendar-week" iconColor="warning" />
      </ion-col>
      <ion-col >
        <XpStatBox :value="456" label="XP This Month" iconName="fa-calendar-alt" iconColor="tertiary" />
      </ion-col>
    </ion-row>
  </ion-grid>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import XpStatBox from '@/components/XpStatBox/XpStatBox.vue';
import Ionic from '@/mixins/ionic';

export default defineComponent({
  name: 'ExperiencePointsDashboard',

  mixins: [Ionic],
  components: {
    XpStatBox
  }
});
</script>

<style scoped>
/* Add any specific styles for the ExperiencePointsDashboard here */
</style>