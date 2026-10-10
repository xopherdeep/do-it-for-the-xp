<template>
  <XpDashboardGrid :cols="2">
    <XpDashboardTile>
      <XpNavTile
        label="Control Powers"
        iconName="fa-hand-holding-magic"
        color="tertiary"
        @click="goToAbilities"
      />
    </XpDashboardTile>
    <template v-if="abilities">
      <XpDashboardTile>
        <XpStatBox
          :value="abilities.totalAp"
          label="AP Unlocked"
          :ribbon="`Per hero: ${compact(abilities.avgPerHero)}`"
          ribbonColor="primary"
          iconName="fa-atom"
          iconColor="primary"
          :isActive="isActive"
          :animationKey="animationKey"
        />
      </XpDashboardTile>
      <XpDashboardTile>
        <XpStatBox
          :value="abilities.avgPerQuest"
          label="Avg AP/Quest"
          iconName="fa-atom-alt"
          iconColor="danger"
          :isActive="isActive"
          :animationKey="animationKey"
        />
      </XpDashboardTile>
      <XpDashboardTile>
        <XpStatBox
          :value="abilities.earned.week"
          label="AP Earned, 7 Days"
          :ribbon="`Month: ${compact(abilities.earned.month)}`"
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
  import { compact, type AbilityFigures } from "@/lib/services/stats/CompendiumStats";
  import { getEngineStatsService } from "@/lib/services/stats/EngineStatsService";
  import debug from "@/lib/utils/debug";

  export default defineComponent({
    name: "AbilityPointsDashboard",
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
      const goToAbilities = () => {
        router.push({ name: "xp-abilities" });
      };

      // The figures come from the heroes' AP and the AP history on their profiles; the boxes wait for them
      const abilities = ref<AbilityFigures | null>(null);
      onMounted(async () => {
        try {
          abilities.value = (await getEngineStatsService().getCompendiumStats()).abilities;
        } catch (error) {
          debug.error("Compendium ability figures failed to load", error);
        }
      });

      return { goToAbilities, abilities, compact };
    },
  });
</script>

<style scoped>
  /* Add any specific styles for the AbilityPointsDashboard here */
  .icon-colors {
    padding: 10px;
  }
</style>
