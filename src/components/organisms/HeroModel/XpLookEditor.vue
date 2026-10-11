<template>
  <div
    class="look-editor"
    :class="{ 'is-flat': flat }"
  >
    <!-- The hero. Anything slotted as `stage` (a tag, a hint) floats over it. -->
    <section class="look-stage">
      <XpHeroModel
        ref="model"
        class="look-model"
        :look="shownLook"
        :animation="preview"
        interactive
      />
      <slot name="stage"></slot>
    </section>

    <!-- Whatever the page wants between the hero and the pickers (the animation chips, say) -->
    <slot></slot>

    <!-- The options, with the tab strip at the bottom where a thumb reaches it -->
    <section class="look-panel">
      <div
        class="tab-body"
        role="tabpanel"
        :aria-label="tab.label"
      >
        <div
          v-if="tab.styles"
          class="picker"
        >
          <h4 class="picker-title">Style</h4>
          <div class="style-grid">
            <button
              v-for="style in tab.styles.options"
              :key="style"
              type="button"
              class="style-button"
              :class="{ active: modelValue[tab.styles.key] === style }"
              :aria-pressed="modelValue[tab.styles.key] === style"
              @click="pick(tab.styles.key, style)"
            >
              {{ styleLabel(style) }}
            </button>
          </div>
        </div>

        <div
          v-for="group in tab.colors"
          :key="group.key"
          class="picker"
        >
          <h4 class="picker-title">{{ group.label }}</h4>
          <div class="color-grid">
            <button
              v-for="swatch in group.swatches"
              :key="swatch.value"
              type="button"
              class="swatch"
              :class="{ active: modelValue[group.key] === swatch.value }"
              :style="{ backgroundColor: swatch.color }"
              :aria-label="swatch.name"
              :aria-pressed="modelValue[group.key] === swatch.value"
              @click="pick(group.key, swatch.value)"
            ></button>
          </div>
        </div>
      </div>

      <div
        class="tab-strip"
        role="tablist"
        aria-label="What to change"
      >
        <button
          v-for="t in TABS"
          :key="t.id"
          type="button"
          role="tab"
          class="tab"
          :class="{ active: tabId === t.id }"
          :aria-selected="tabId === t.id"
          @click="tabId = t.id"
        >
          <i
            v-if="flat"
            :class="['fad', t.icon, 'tab-icon']"
          ></i>
          <span class="tab-label">{{ t.label }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from "vue";
  import XpHeroModel from "./XpHeroModel.vue";
  import { TABS, styleLabel, withHands, type HandSlots } from "./lookEditor";
  import type { HeroAnimation, HeroLook } from "@/lib/hero-look/types";

  /**
   * The voxel hero and the pickers that build it: the hero on top, the options for one category below, the
   * category tabs at the very bottom (under the thumb). It only edits: the page around it owns the draft
   * (v-model), Save, Reset and the animation chips (default slot). Plain HTML, no Ionic, so it mounts anywhere.
   *
   * `equipment` lends the hero its hands (the items it holds are drawn, never stored in the look).
   * `flat` is the light, full-screen look (no boxes) for the modals; the default is the boxed Earthbound page.
   */
  const props = withDefaults(
    defineProps<{
      modelValue: HeroLook;
      equipment?: HandSlots | null;
      preview?: HeroAnimation;
      flat?: boolean;
    }>(),
    { equipment: null, preview: "idle", flat: false }
  );

  const emit = defineEmits<{
    (e: "update:modelValue", look: HeroLook): void;
  }>();

  const tabId = ref<string>(TABS[0].id);
  const tab = computed(() => TABS.find((t) => t.id === tabId.value) || TABS[0]);

  /** The look as it is drawn: the draft plus whatever the hero holds in its hands */
  const shownLook = computed<HeroLook>(() => withHands(props.modelValue, props.equipment));

  const pick = (key: keyof HeroLook, value: string) => {
    emit("update:modelValue", { ...props.modelValue, [key]: value });
  };

  const model = ref<{ snapshot: (size?: number) => string | Promise<string> } | null>(null);

  /** A picture of the hero (PNG data URL). May throw (no WebGL, say): callers decide what a failure costs. */
  const snapshot = (size = 256): string | Promise<string> | undefined => model.value?.snapshot(size);

  defineExpose({ snapshot });
</script>

<style lang="scss" src="./_XpLookEditor.scss" scoped />
