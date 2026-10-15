<template>
  <XpDashboardGrid :cols="2">
    <template v-if="vitals">
      <XpDashboardTile>
        <XpStatBox
          :value="vitals.avgHp"
          label="Avg HP/Users"
          iconName="fa-heartbeat"
          iconColor="danger"
          :progress="vitals.hpFill"
          direction="rtl"
          :isActive="isActive"
          :animationKey="animationKey"
        />
      </XpDashboardTile>

      <XpDashboardTile>
        <XpStatBox
          :value="vitals.avgMp"
          label="Avg MP/Users"
          iconName="fa-spa"
          iconColor="tertiary"
          :progress="vitals.mpFill"
          :isActive="isActive"
          :animationKey="animationKey"
        />
      </XpDashboardTile>

      <XpDashboardTile>
        <XpStatBox
          :value="vitals.avgLevel"
          label="Avg Level"
          iconName="fa-chevron-double-up"
          iconColor="success"
          :isActive="isActive"
          :animationKey="animationKey"
        />
      </XpDashboardTile>
      <XpDashboardTile>
        <XpStatBox
          :value="vitals.wounded"
          label="Wounded Heroes"
          iconName="fa-heart-rate"
          iconColor="warning"
          :isActive="isActive"
          :animationKey="animationKey"
        />
      </XpDashboardTile>
    </template>
  </XpDashboardGrid>
</template>

<script lang="ts">
  import Ionic from "@/lib/mixins/ionic";
  import { defineComponent, onMounted, ref } from "vue";
  import XpStatBox from "@/components/molecules/StatBox/XpStatBox.vue";
  import XpDashboardGrid from "@/components/molecules/StatGrid/XpDashboardGrid.vue";
  import XpDashboardTile from "@/components/molecules/StatGrid/XpDashboardTile.vue";
  import type { VitalsFigures } from "@/lib/services/stats/CompendiumStats";
  import { getEngineStatsService } from "@/lib/services/stats/EngineStatsService";
  import debug from "@/lib/utils/debug";

  export default defineComponent({
    name: "CharacterStatsDashboard",
    mixins: [Ionic],
    components: {
      XpStatBox,
      XpDashboardGrid,
      XpDashboardTile,
    },
    props: {
      isActive: {
        type: Boolean,
        default: false,
      },
      animationKey: {
        type: [Number, String],
        default: 0,
      },
    },
    setup() {
      // The figures come from the heroes' profiles; the boxes wait for them
      const vitals = ref<VitalsFigures | null>(null);
      onMounted(async () => {
        try {
          vitals.value = (await getEngineStatsService().getCompendiumStats()).vitals;
        } catch (error) {
          debug.error("Compendium vitals failed to load", error);
        }
      });

      return { vitals };
    },
  });
</script>

<style scoped>
  /* Add any specific styles for the CharacterStatsDashboard here */
  .icon-colors {
    padding: 10px;
  }
</style>
