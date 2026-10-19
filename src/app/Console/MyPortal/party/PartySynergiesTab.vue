<template>
  <div data-cy="party-synergies-empty">
    <xp-coming-soon-card title="Synergies" :items="items" />
  </div>
</template>

<script setup lang="ts">
import XpComingSoonCard from "@/app/SideMenu/XpSettings/components/XpComingSoonCard.vue";
import type { ComingSoonItem } from "@/app/SideMenu/XpSettings/components/comingSoon";

/** The tab stays (the owner never hides a tab); synergies need parties across families, which go through the switched-off family server */
const items: ComingSoonItem[] = [
  { title: "Party synergies", description: "Earn party bonuses when heroes finish their chores side by side" },
];
</script>
