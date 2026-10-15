<template>
  <!-- Step 3, When?: start, end, due time, times of day and how often it repeats. The schedule reads and writes the
       quest through the injected form itself, and opens the date pickers that XpConfigAchievement holds. -->
  <div class="quest-schedule-tab" data-test="step-when">
    <AchievementScheduleTab />
  </div>
</template>

<script setup lang="ts">
import AchievementScheduleTab from "../AchievementScheduleTab.vue";
</script>
