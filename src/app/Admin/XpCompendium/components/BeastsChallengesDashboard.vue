<template>
  <XpDashboardGrid :cols="2">
    <XpDashboardTile>
      <XpNavTile
        label="View Bestiary"
        iconName="fa-hand-holding-heart"
        color="primary"
        @click="goToBestiary"
      />
    </XpDashboardTile>
    <template v-if="figures">
      <XpDashboardTile>
        <XpStatBox
          :value="figures.beasts"
          label="Total Beasts"
          :ribbon="`Avg tasks: ${figures.avgChecklist}`"
          ribbonColor="primary"
          iconName="fa-dragon"
          iconColor="primary"
          :isActive="isActive"
          :animationKey="animationKey"
        />
      </XpDashboardTile>
      <XpDashboardTile>
        <XpStatBox
          :value="figures.linkedQuests"
          label="Linked Quests"
          :ribbon="`Per beast: ${figures.questsPerBeast}`"
          ribbonColor="primary"
          iconName="fa-link"
          iconColor="primary"
          :isActive="isActive"
          :animationKey="animationKey"
        />
      </XpDashboardTile>
      <XpDashboardTile>
        <XpStatBox
          :value="figures.tamed.week"
          label="Tamed, 7 Days"
          :ribbon="`Month: ${figures.tamed.month}`"
          ribbonColor="danger"
          iconName="fa-claw-marks"
          iconColor="danger"
          :isActive="isActive"
          :animationKey="animationKey"
        />
      </XpDashboardTile>
    </template>
  </XpDashboardGrid>
</template>

<script lang="ts">
  import Ionic from "@/lib/mixins/ionic";
  import { defineComponent, ref, onMounted } from "vue";
  import { useRouter } from "vue-router";
  import XpStatBox from "@/components/molecules/StatBox/XpStatBox.vue";
  import XpNavTile from "@/components/molecules/StatGrid/XpNavTile.vue";
  import XpDashboardGrid from "@/components/molecules/StatGrid/XpDashboardGrid.vue";
  import XpDashboardTile from "@/components/molecules/StatGrid/XpDashboardTile.vue";
  import type { BeastFigures } from "@/lib/services/stats/CompendiumStats";
  import { getEngineStatsService } from "@/lib/services/stats/EngineStatsService";
  import debug from "@/lib/utils/debug";

  export default defineComponent({
    name: "BeastsChallengesDashboard",
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

      // The bestiary, the quests tied to it and the quest log give the figures; the boxes wait for them
      const figures = ref<BeastFigures | null>(null);
      onMounted(async () => {
        try {
          figures.value = (await getEngineStatsService().getCompendiumStats()).beasts;
        } catch (error) {
          debug.error("Compendium beast figures failed to load", error);
        }
      });

      const goToBestiary = () => {
        router.push({ name: "xp-bestiary" });
      };

      return { figures, goToBestiary };
    },
  });
</script>

<style scoped>
  /* Add any specific styles for the BeastsChallengesDashboard here */
  .icon-colors {
    padding: 10px;
  }
</style>
