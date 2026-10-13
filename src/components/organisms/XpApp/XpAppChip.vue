<template>
  <span class="xp-app-chip" :class="`xp-app-chip--${kind}`"><span v-if="prefix" class="xp-app-chip__unit">{{ prefix }}</span><span class="xp-app-chip__value">{{ value }}</span><template v-if="suffix">{{ " " }}<span class="xp-app-chip__unit">{{ suffix }}</span></template></span>
</template>

<script setup lang="ts">
import { computed } from "vue";

export type AppChipKind = "xp" | "gp" | "ap" | "mp" | "hp" | "qty" | "tag";

/**
 * A small stat chip on a row: "12 XP", "5 GP", "3 AP", "25 MP", "40 HP", "x3" (qty) or a plain tag.
 */
const props = defineProps<{
  kind: AppChipKind;
  value: string | number;
}>();

const UNITS: Partial<Record<AppChipKind, string>> = { xp: "XP", gp: "GP", ap: "AP", mp: "MP", hp: "HP" };

const prefix = computed(() => (props.kind === "qty" ? "×" : ""));
const suffix = computed(() => UNITS[props.kind] ?? "");
</script>
