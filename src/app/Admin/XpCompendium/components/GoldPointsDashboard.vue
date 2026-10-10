<template>
  <XpDashboardGrid :cols="2">
    <XpDashboardTile>
      <XpNavTile
        label="Stock Shops"
        iconName="fa-hand-holding-box"
        color="warning"
        @click="goToShops"
      />
    </XpDashboardTile>
    <template v-if="gold">
      <XpDashboardTile>
        <XpStatBox
          :value="gold.treasury"
          label="World Treasury"
          :ribbon="`Per hero: ${compact(gold.avgPerHero)}`"
          ribbonColor="success"
          iconName="fa-piggy-bank"
          iconColor="success"
          :isActive="isActive"
          :animationKey="animationKey"
        />
      </XpDashboardTile>
      <XpDashboardTile>
        <XpStatBox
          :value="gold.avgPerQuest"
          label="Avg GP/Quest"
          iconName="fa-coin"
          iconColor="warning"
          :isActive="isActive"
          :animationKey="animationKey"
        />
      </XpDashboardTile>
      <XpDashboardTile>
        <XpStatBox
          :value="gold.earned.week"
          label="Quest GP, 7 Days"
          :ribbon="`Month: ${compact(gold.earned.month)}`"
          ribbonColor="warning"
          iconName="fa-calendar-week"
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
  import { useRouter } from "vue-router";
  import XpStatBox from "@/components/molecules/StatBox/XpStatBox.vue";
  import XpNavTile from "@/components/molecules/StatGrid/XpNavTile.vue";
  import XpDashboardGrid from "@/components/molecules/StatGrid/XpDashboardGrid.vue";
  import XpDashboardTile from "@/components/molecules/StatGrid/XpDashboardTile.vue";
  import { compact, type GoldFigures } from "@/lib/services/stats/CompendiumStats";
  import { getEngineStatsService } from "@/lib/services/stats/EngineStatsService";
  import debug from "@/lib/utils/debug";

  export default defineComponent({
    name: "GoldPointsDashboard",
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
      const goToShops = () => {
        router.push({ name: "xp-economy-dashboard-root" });
      };

      // The figures come from the heroes' wallets and the quest log; the boxes wait for them
      const gold = ref<GoldFigures | null>(null);
      onMounted(async () => {
        try {
          gold.value = (await getEngineStatsService().getCompendiumStats()).gold;
        } catch (error) {
          debug.error("Compendium gold figures failed to load", error);
        }
      });

      return { goToShops, gold, compact };
    },
  });
</script>

<style scoped>
  /* Add any specific styles for the GoldPointsDashboard here */
  .icon-colors {
    padding: 10px;
  }
</style>
