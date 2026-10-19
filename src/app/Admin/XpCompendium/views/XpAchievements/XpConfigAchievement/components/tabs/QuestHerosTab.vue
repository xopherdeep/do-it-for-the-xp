<template>
  <!-- Step 2, Who does it?: how it is shared and the heroes. The five ways to share are the segments at the bottom of the step;
       the guide line above says what to do for the one chosen. The Game Master runs the game and is not listed with the heroes. -->
  <div class="quest-heros-tab" data-test="step-who">
    <AchievementHerosTab
      v-model="achievement.assignee"
      :users="heroes"
      :active-party-type="activePartyType"
      :assignment-type="achievement.type"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from "vue";
import AchievementHerosTab from "../AchievementHerosTab.vue";
import { AchievementFormInjectionKey } from "../../hooks/useAchievementForm";
import { pickableHeroes } from "@/lib/services/quests/questHeroes";

const { achievement, users, activePartyType } = inject(AchievementFormInjectionKey)!;

const heroes = computed(() => pickableHeroes(users.value, achievement.value.assignee ?? []));
</script>

