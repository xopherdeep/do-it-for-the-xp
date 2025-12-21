<template>
  <ion-grid class="icon-colors w-full">
    <ion-row>
      <ion-col>
        <XpStatBox
          :value="stats?.abilities || 0"
          label="Abilities"
          iconName="fa-hand-holding-magic"
        />
      </ion-col>
      <ion-col>
        <XpStatBox
          :value="stats?.achievements || 0"
          label="Quests"
          iconName="fa-hand-holding-seedling"
        />
      </ion-col>
      <ion-col>
        <XpStatBox
          :value="stats?.items || 0"
          label="Items"
          iconName="fa-hand-holding-usd"
        />
      </ion-col>
      <ion-col size="6">
        <XpStatBox
          :value="stats?.beasts || 0"
          label="Beasts"
          iconName="fa-hand-holding-heart"
        />
      </ion-col>
      <ion-col>
        <XpStatBox
          :value="stats?.temples || 0"
          label="Temples"
          iconName="fa-hand-holding-water"
        />
      </ion-col>
    </ion-row>
  </ion-grid>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import XpStatBox from '@/components/XpStatBox/XpStatBox.vue';
import Ionic from '@/mixins/ionic';

export default defineComponent({
  name: 'WelcomeDashboard',
  mixins: [Ionic],
  components: { XpStatBox },
  props: {
    stats: {
      type: Object as PropType<{
        abilities?: number;
        beasts?: number;
        achievements?: number;
        temples?: number;
        items?: number;
      }>,
      required: true,
      default: () => ({})
    }
  }
});
</script>

<style scoped>
/* Add any specific styles for the WelcomeDashboard here */
</style>