<template>
  <!-- "Ask for a photo": an option on this chore alone. Turning it on turns approval on too (a photo is always reviewed). -->
  <xp-app-row
    :icon="modelValue ? 'camera-retro' : 'camera'"
    title="Photo proof"
    :subtitle="line"
    :chevron="false"
    :aria-pressed="modelValue ? 'true' : 'false'"
    data-test="photo-row"
    @click="emit('update:modelValue', !modelValue)"
  >
    <template #trailing>
      <xp-app-chip kind="tag" :value="modelValue ? 'ON' : 'OFF'" data-test="photo-state" />
    </template>
  </xp-app-row>
</template>

<script setup lang="ts">
import { computed } from "vue";
import XpAppChip from "@/components/organisms/XpApp/XpAppChip.vue";
import XpAppRow from "@/components/organisms/XpApp/XpAppRow.vue";

defineOptions({ name: "quest-photo-rule-item" });

/**
 * The per-chore "Ask for a photo" switch, next to the approval row. On: the hero shows a picture when they finish and the
 * Game Master always approves. The picture stays on this device.
 */
interface QuestPhotoRuleItemProps {
  modelValue: boolean;
}

const props = defineProps<QuestPhotoRuleItemProps>();
const emit = defineEmits<{ (e: "update:modelValue", value: boolean): void }>();

const line = computed(() =>
  props.modelValue
    ? "Ask for a photo: the Game Master always approves. The picture stays on this device."
    : "No photo needed (good for most chores). Tap to ask for one."
);
</script>
