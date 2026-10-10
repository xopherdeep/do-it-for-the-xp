<template>
  <XpDashboardGrid :cols="2">
    <XpDashboardTile>
      <XpNavTile
        label="Deploy Quests"
        iconName="fa-hand-holding-seedling"
        color="success"
        @click="goToQuests"
      />
    </XpDashboardTile>
    <template v-if="experience">
      <!-- Total XP the heroes have gathered -->
      <XpDashboardTile>
        <XpStatBox
          :value="experience.totalXp"
          label="XP Sown"
          :ribbon="`Per hero: ${compact(experience.avgPerHero)}`"
          ribbonColor="success"
          iconName="fa-tree-alt"
          iconColor="success"
          :isActive="isActive"
          :animationKey="animationKey"
        />
      </XpDashboardTile>
      <XpDashboardTile>
        <XpStatBox
          :value="experience.avgPerQuest"
          label="Avg XP/Quest"
          iconName="fa-seedling"
          iconColor="success"
          :isActive="isActive"
          :animationKey="animationKey"
        />
      </XpDashboardTile>
      <XpDashboardTile>
        <XpStatBox
          :value="experience.earned.week"
          label="Quest XP, 7 Days"
          :ribbon="`Month: ${compact(experience.earned.month)}`"
          ribbonColor="warning"
          iconName="fa-calendar-week"
          iconColor="success"
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
  import { compact, type ExperienceFigures } from "@/lib/services/stats/CompendiumStats";
  import { getEngineStatsService } from "@/lib/services/stats/EngineStatsService";
  import debug from "@/lib/utils/debug";

  export default defineComponent({
    name: "ExperiencePointsDashboard",

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
      const goToQuests = () => {
        router.push({ name: "xp-achievements" });
      };

      // The figures come from the heroes' XP and the quest log; the boxes wait for them
      const experience = ref<ExperienceFigures | null>(null);
      onMounted(async () => {
        try {
          experience.value = (await getEngineStatsService().getCompendiumStats()).experience;
        } catch (error) {
          debug.error("Compendium experience figures failed to load", error);
        }
      });

      return { goToQuests, experience, compact };
    },
  });
</script>

<style scoped>
  /* Add any specific styles for the ExperiencePointsDashboard here */
</style>
