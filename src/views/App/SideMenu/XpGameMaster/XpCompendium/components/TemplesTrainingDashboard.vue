<template>
  <ion-grid class="icon-colors">
    <ion-row>
      <ion-col size="6">
        <XpStatBox :value="3" label="Total Temples" iconName="fa-church" iconColor="primary" />
      </ion-col>
      <ion-col size="6">
        <XpStatBox :value="15" label="Abilities Trained" iconName="fa-dumbbell" iconColor="success" />
      </ion-col>
      <ion-col size="6">
        <XpStatBox :value="5" label="Avg Training Sessions" iconName="fa-calendar-alt" iconColor="tertiary" />
      </ion-col>
      <ion-col size="6">
        <XpStatBox :value="8" label="Active Users in Temples" iconName="fa-users" iconColor="warning" />
      </ion-col>
    </ion-row>
  </ion-grid>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import XpStatBox from '@/components/XpStatBox/XpStatBox.vue';
import Ionic from '@/mixins/ionic';

export default defineComponent({
  name: 'TemplesTrainingDashboard',
  mixins: [Ionic],
  components: {
    XpStatBox
  }
});
</script>

<style scoped>
/* Add any specific styles for the TemplesTrainingDashboard here */
</style>
