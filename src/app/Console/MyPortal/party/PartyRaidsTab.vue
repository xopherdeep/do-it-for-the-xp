<template>
  <div data-cy="party-raids-empty">
    <xp-coming-soon-card title="Raids" :items="items" />
  </div>
</template>

<script setup lang="ts">
import XpComingSoonCard from "@/app/SideMenu/XpSettings/components/XpComingSoonCard.vue";
import type { ComingSoonItem } from "@/app/SideMenu/XpSettings/components/comingSoon";

/** The tab stays (the owner never hides a tab); raids need parties across families, which go through the switched-off family server */
const items: ComingSoonItem[] = [
  { title: "Party raids", description: "Face a great beast together, with every hero in the party" },
];
</script>
