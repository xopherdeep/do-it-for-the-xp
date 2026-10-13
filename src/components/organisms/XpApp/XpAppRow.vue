<template>
  <div
    class="xp-app-row icon-colors"
    :class="{ 'xp-app-row--tile': hasLeading, 'is-active': active, 'is-disabled': disabled }"
    role="button"
    :tabindex="disabled ? -1 : 0"
    :aria-disabled="disabled ? 'true' : undefined"
    :aria-current="active ? 'true' : undefined"
    @click="activate"
    @keydown.enter.self.prevent="activate"
    @keydown.space.self.prevent="activate"
  >
    <span v-if="skin === 'retro'" class="xp-app-row__cursor" aria-hidden="true">▶</span>
    <div v-if="hasLeading" class="xp-app-row__tile">
      <slot name="leading">
        <img v-if="image" class="xp-app-row__image" :src="image" alt="" loading="lazy" draggable="false" />
        <i v-else :class="['fad', iconClass]"></i>
      </slot>
    </div>
    <div class="xp-app-row__body">
      <div class="xp-app-row__title">{{ title }}</div>
      <div v-if="subtitle" class="xp-app-row__subtitle">{{ subtitle }}</div>
      <div v-if="$slots.chips" class="xp-app-row__chips"><slot name="chips" /></div>
    </div>
    <div v-if="$slots.trailing || chevron" class="xp-app-row__trailing">
      <slot name="trailing" />
      <i v-if="chevron" class="fad fa-chevron-right xp-app-row__chevron" aria-hidden="true"></i>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useSlots } from "vue";
import { play$fx } from "@/assets/fx";
import { appIconClass, useAppSkin } from "./useAppSkin";

/**
 * One list row of a phone app: a 40px leading tile (slot `leading`, else `image`, else `icon`), the title, a one-line
 * subtitle, a chips row (slot `chips`, use XpAppChip) and a trailing value or button (slot `trailing`) before the chevron.
 * A tap or Enter / Space plays the cursor sound and emits `click`; a disabled row does neither. A button or link inside
 * the row (a trailing Cast / Use / Equip) answers on its own and does not fire the row.
 */
const props = withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    /** Font Awesome duotone icon for the leading tile: `scroll`, `fa-scroll` or `fad fa-scroll`. */
    icon?: string;
    /** Image for the leading tile (sprite, portrait). Wins over `icon`. */
    image?: string;
    chevron?: boolean;
    disabled?: boolean;
    active?: boolean;
  }>(),
  { subtitle: "", icon: "", image: "", chevron: true, disabled: false, active: false }
);

const emit = defineEmits<{
  (e: "click", ev: MouseEvent | KeyboardEvent): void;
}>();

const slots = useSlots();
const { skin } = useAppSkin();

const iconClass = computed(() => appIconClass(props.icon));
const hasLeading = computed(() => Boolean(slots.leading || props.image || props.icon));

const INNER_CONTROLS = "button, a, input, select, textarea, ion-button, [data-xp-app-action]";

const activate = (ev: MouseEvent | KeyboardEvent) => {
  if (props.disabled) return;
  const row = ev.currentTarget as HTMLElement | null;
  const inner = (ev.target as HTMLElement | null)?.closest?.(INNER_CONTROLS);
  if (row && inner && inner !== row && row.contains(inner)) return;
  play$fx("cursor");
  emit("click", ev);
};
</script>
