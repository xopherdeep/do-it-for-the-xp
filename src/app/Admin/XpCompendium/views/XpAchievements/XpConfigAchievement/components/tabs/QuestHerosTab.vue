<template>
  <!-- Step 2, Who does it?: how it is shared and the heroes. The five ways to share are the segments at the bottom of the step. -->
  <div class="quest-heros-tab" data-test="step-who">
    <AchievementHerosTab
      v-model="achievement.assignee"
      :users="users"
      :active-party-type="activePartyType"
      :assignment-type="achievement.type"
    />
  </div>
</template>

<script setup lang="ts">
import { inject } from "vue";
import AchievementHerosTab from "../AchievementHerosTab.vue";
import { AchievementFormInjectionKey } from "../../hooks/useAchievementForm";

const { achievement, users, activePartyType } = inject(AchievementFormInjectionKey)!;
</script>
