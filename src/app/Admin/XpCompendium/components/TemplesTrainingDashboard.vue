<template>
  <XpDashboardGrid :cols="2">
    <XpDashboardTile>
      <XpNavTile
        label="Layout Temples"
        iconName="fa-hand-holding-water"
        color="secondary"
        @click="goToTemples"
      />
    </XpDashboardTile>
    <template v-if="temples">
      <XpDashboardTile>
        <XpStatBox
          :value="temples.total"
          label="Total Temples"
          iconName="fa-place-of-worship"
          iconColor="primary"
          :isActive="isActive"
          :animationKey="animationKey"
        />
      </XpDashboardTile>
      <XpDashboardTile>
        <XpStatBox
          :value="temples.avgFoes"
          label="Avg. Foes/Temple"
          iconName="fa-skull"
          iconColor="danger"
          :isActive="isActive"
          :animationKey="animationKey"
        />
      </XpDashboardTile>
      <XpDashboardTile>
        <XpStatBox
          :value="temples.avgTreasure"
          label="Avg. Chests/Temple"
          iconName="fa-treasure-chest"
          iconColor="warning"
          :isActive="isActive"
          :animationKey="animationKey"
        />
      </XpDashboardTile>
    </template>
  </XpDashboardGrid>
</template>

<script lang="ts">
  import { defineComponent, onMounted, ref } from "vue";
  import { useRouter } from "vue-router";
  import XpStatBox from "@/components/molecules/StatBox/XpStatBox.vue";
  import XpNavTile from "@/components/molecules/StatGrid/XpNavTile.vue";
  import XpDashboardGrid from "@/components/molecules/StatGrid/XpDashboardGrid.vue";
  import XpDashboardTile from "@/components/molecules/StatGrid/XpDashboardTile.vue";
  import Ionic from "@/lib/mixins/ionic";
  import type { TempleFigures } from "@/lib/services/stats/CompendiumStats";
  import { getEngineStatsService } from "@/lib/services/stats/EngineStatsService";
  import debug from "@/lib/utils/debug";

  export default defineComponent({
    name: "TemplesTrainingDashboard",
    mixins: [Ionic],
    components: {
      XpStatBox,
      XpNavTile,
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
      const router = useRouter();
      const goToTemples = () => {
        router.push({ name: "xp-compendium-temples" });
      };

      // The figures come from the temples' mazes and rooms; the boxes wait for them
      const temples = ref<TempleFigures | null>(null);
      onMounted(async () => {
        try {
          temples.value = (await getEngineStatsService().getCompendiumStats()).temples;
        } catch (error) {
          debug.error("Compendium temple figures failed to load", error);
        }
      });

      return { goToTemples, temples };
    },
  });
</script>

<style scoped>
  /* Add any specific styles for the TemplesTrainingDashboard here */
</style>
