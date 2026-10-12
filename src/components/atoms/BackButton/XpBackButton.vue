<template>
  <ion-back-button :default-href="href"><slot /></ion-back-button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { IonBackButton } from "@ionic/vue";
import { useBack } from "@/hooks/useBack";

// The back button every page uses (registered globally as <xp-back-button>): Ionic follows the history, and with
// no history behind the page it goes to the place the page belongs to (src/router/parentOf.ts). Everything else
// (icon, color, slot, @click) falls through to the Ionic button.
const props = defineProps<{ defaultHref?: string }>();

const { backHref } = useBack();
// A page that knows better (a shop standing in a world the Game Master chose) passes its own
const href = computed(() => props.defaultHref || backHref.value);
</script>
