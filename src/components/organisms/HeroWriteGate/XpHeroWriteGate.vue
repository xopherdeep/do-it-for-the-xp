<script setup lang="ts">
/**
 * The clerk for a Game Master's change to a hero under Family Sync (useHeroWrite), for a screen that has no room for one
 * more hook: placed once, it renders the reveal prompt, and the screen calls `writeHero` on its ref.
 */
import XpRevealPrompt from "@/components/organisms/RevealPrompt/XpRevealPrompt.vue";
import { useHeroWrite } from "@/hooks/useHeroWrite";

const { prompt, respond, writeHero } = useHeroWrite();
defineExpose({ writeHero });
</script>

<template>
  <xp-reveal-prompt :prompt="prompt" @respond="respond" />
</template>
