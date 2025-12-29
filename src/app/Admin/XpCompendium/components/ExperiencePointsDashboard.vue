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
    <!-- Total XP Earned -->
    <XpDashboardTile>
      <XpStatBox
        :value="1234567"
        label="XP Sown"
        iconName="fa-tree-alt"
        iconColor="success"
        :isActive="isActive"
        :animationKey="animationKey"
      />
    </XpDashboardTile>
    <!-- Active Streak -->
    <XpDashboardTile>
      <XpStatBox
        :value="5678"
        label="Avg XP/Quest"
        iconName="fa-seedling"
        iconColor="success"
        :isActive="isActive"
        :animationKey="animationKey"
      />
    </XpDashboardTile>
    <XpDashboardTile>
      <XpStatBox
        :value="1250"
        label="Avg XP/User"
        iconName="fa-user-visor"
        iconColor="warning"
        :isActive="isActive"
        :animationKey="animationKey"
      />
    </XpDashboardTile>
  </XpDashboardGrid>
</template>

<script lang="ts">
  import { defineComponent } from "vue";
  import { useRouter } from "vue-router";
  import XpStatBox from "@/components/molecules/StatBox/XpStatBox.vue";
  import XpNavTile from "@/components/molecules/StatGrid/XpNavTile.vue";
  import XpDashboardGrid from "@/components/molecules/StatGrid/XpDashboardGrid.vue";
  import XpDashboardTile from "@/components/molecules/StatGrid/XpDashboardTile.vue";
  import Ionic from "@/lib/mixins/ionic";

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
      return { goToQuests };
    },
  });
</script>

<style scoped>
  /* Add any specific styles for the ExperiencePointsDashboard here */
</style>
