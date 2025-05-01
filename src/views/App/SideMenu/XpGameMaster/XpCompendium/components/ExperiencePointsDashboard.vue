<template>
  <ion-grid class="icon-colors">
    <ion-row>
      <ion-col size="6">
        <XpStatBox :value="1234567" label="Total XP Given" iconName="fa-arrow-up" iconColor="primary" />
      </ion-col>
      <ion-col size="6">
        <XpStatBox :value="99" label="Highest Level" iconName="fa-trophy" iconColor="warning" />
      </ion-col>
      <ion-col size="6">
        <XpStatBox :value="5678" label="Avg XP per Day" iconName="fa-calendar-day" iconColor="success" />
      </ion-col>
      <ion-col size="6">
        <XpStatBox :value="42" label="Active Users" iconName="fa-users" iconColor="tertiary" />
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