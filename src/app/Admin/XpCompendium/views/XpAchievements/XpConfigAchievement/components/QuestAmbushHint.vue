<template>
  <!-- Under the due time: shown only while a hero this quest names would meet nothing but free fights (0 XP, AP only) -->
  <p v-if="line" class="ambush-hint" data-test="ambush-hint">{{ line }}</p>
</template>

<script setup lang="ts">
import { computed, inject } from "vue";
import { AchievementFormInjectionKey } from "../hooks/useAchievementForm";
import { freeFightHeroes, freeFightHint } from "@/lib/services/battle/questAmbush";

const { achievement, achievements, users } = inject(AchievementFormInjectionKey)!;

const heroName = (heroId: string): string => {
  const hero = users.value.find((user) => user.id === heroId);
  return hero?.name?.nick || hero?.name?.first || "";
};

// The quest as the form holds it right now, against every other quest the family has saved
const line = computed(() =>
  freeFightHint(freeFightHeroes(achievement.value, achievements.value).map(heroName).filter(Boolean))
);
</script>

<style lang="scss" scoped>
.ambush-hint {
  margin: 0 0 12px;
  font-size: 0.75rem;
  line-height: 1.3;
  color: var(--ion-color-medium);
}
</style>
