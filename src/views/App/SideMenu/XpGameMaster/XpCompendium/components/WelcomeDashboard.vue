<template>
  <XpDashboardGrid :cols="3">
    <!-- Row 1: Welcome, Bestiary, Vitals -->
    <XpDashboardTile>
      <XpNavTile
        label="Welcome"
        iconName="fa-question-square"
        color="medium"
        @click="$emit('reset')"
      />
    </XpDashboardTile>
    <XpDashboardTile>
      <XpNavTile
        label="Bestiary"
        iconName="fa-hand-holding-heart"
        color="danger"
        @click="$emit('navigate', 1)"
      />
    </XpDashboardTile>
    <XpDashboardTile>
      <XpNavTile
        label="Vitals"
        iconName="fa-heartbeat"
        color="primary"
        @click="$emit('navigate', 2)"
      />
    </XpDashboardTile>

    <!-- Row 2: Powers, Economy, Quests -->
    <XpDashboardTile>
      <XpNavTile
        label="Powers"
        iconName="fa-hand-holding-magic"
        color="tertiary"
        @click="$emit('navigate', 3)"
      />
    </XpDashboardTile>
    <XpDashboardTile>
      <XpNavTile
        label="Economy"
        iconName="fa-hand-holding-box"
        color="warning"
        @click="$emit('navigate', 5)"
      />
    </XpDashboardTile>
    <XpDashboardTile>
      <XpNavTile
        label="Quests"
        iconName="fa-hand-holding-seedling"
        color="success"
        @click="$emit('navigate', 6)"
      />
    </XpDashboardTile>

    <!-- Row 3: Doctor, Temples, Chat -->
    <XpDashboardTile>
      <XpNavTile
        label="Police Box"
        iconName="fa-police-box"
        color="tardis"
        @click="navigateTo('xp-do-this-not-that')"
      />
    </XpDashboardTile>
    <XpDashboardTile>
      <XpNavTile
        label="Temples"
        iconName="fa-hand-holding-water"
        color="secondary"
        @click="$emit('navigate', 4)"
      />
    </XpDashboardTile>
    <XpDashboardTile>
      <XpNavTile
        label="Chat"
        iconName="fa-comments-alt"
        color="tertiary"
        @click="navigateTo('xp-chat')"
      />
    </XpDashboardTile>

  </XpDashboardGrid>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useRouter } from 'vue-router';
import XpNavTile from '@/components/molecules/StatGrid/XpNavTile.vue';
import XpDashboardGrid from '@/components/molecules/StatGrid/XpDashboardGrid.vue';
import XpDashboardTile from '@/components/molecules/StatGrid/XpDashboardTile.vue';
import Ionic from '@/mixins/ionic';
// import { useDialogSystem } from "@/lib/engine/core/DialogSystem";

export default defineComponent({
  name: 'WelcomeDashboard',
  mixins: [Ionic],
  components: { 
    XpNavTile,
    XpDashboardGrid,
    XpDashboardTile
  },
  props: {
    // Stats prop can be removed or kept optional if parent still passes it
    stats: {
      type: Object,
      default: () => ({})
    },
    isActive: {
      type: Boolean,
      default: true
    },
    animationKey: {
      type: [Number, String],
      default: 0
    }
  },
  emits: ['navigate', 'reset'],
  setup() {
    const router = useRouter();

    const navigateTo = (routeName: string) => {
      router.push({ name: routeName });
    };

    return {
      navigateTo
    };
  }
});
</script>

<style scoped>
  /* Add any specific styles for the WelcomeDashboard here */
</style>