<template>
  <!-- display: contents: the header, body and footer stay the direct children of the page or modal that holds the shell -->
  <div ref="root" class="xp-wizard" :class="rootClass" :style="rootStyle">
    <ion-header>
      <ion-toolbar>
        <xp-app-header :title="headerTitle" :icon="icon" :meta="`${progress.n} / ${progress.total}`">
          <template #end>
            <!-- An edit of a saved record can be deleted from its own header -->
            <button
              v-if="deletable"
              type="button"
              class="xp-wiz-delete"
              :aria-label="deleteLabel"
              :title="deleteLabel"
              data-test="wizard-delete"
              @click="emit('delete')"
            >
              <i class="fad fa-trash-alt" aria-hidden="true"></i>
            </button>
            <xp-close-button size="lg" color="light" aria-label="Close" data-test="wizard-close" @click="emit('close')" />
          </template>
        </xp-app-header>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="content" :scroll-y="true">
      <!-- Where we are: one dot per step that is asked; a dot is a way back (or on) only for a step that is valid -->
      <ol class="xp-wiz-dots" :aria-label="`Step ${progress.n} of ${progress.total}`">
        <li v-for="dot in dots" :key="dot.id">
          <button
            type="button"
            class="xp-wiz-dot"
            :class="{ 'is-done': dot.isDone, 'is-here': dot.isHere, 'is-tappable': jumpable && dot.canJump }"
            :disabled="!jumpable || !dot.canJump"
            :aria-label="dot.title"
            :aria-current="dot.isHere ? 'step' : undefined"
            :data-test="`dot-${dot.id}`"
            @click="onDot(dot.index)"
          ></button>
        </li>
      </ol>

      <template v-if="step">
        <!-- The guide asks one question per screen -->
        <p class="xp-wiz-guide" data-test="guide">
          <i :class="['fad', `fa-${step.icon ?? icon}`]" aria-hidden="true"></i>
          <span>{{ step.guide }}</span>
          <xp-speak-button :text="step.guide" />
        </p>

        <!-- The step's own content: the slot named by its id, or the default slot when the form has one body -->
        <slot :name="step.id" :step="step" :index="place">
          <slot :step="step" :index="place" />
        </slot>
      </template>
    </ion-content>

    <!-- The field of the step and Back / Next sit at the bottom, in thumb reach -->
    <ion-footer class="xp-wiz-footer">
      <div class="xp-wiz-bar">
        <slot v-if="step" name="above-nav" :step="step" :index="place" />

        <p v-if="blockedBy" class="xp-wiz-why" role="status" data-test="why">
          <i class="fad fa-exclamation-circle" aria-hidden="true"></i>
          <span>{{ blockedBy }}</span>
        </p>

        <div class="xp-wiz-nav">
          <button type="button" class="xp-app-btn xp-app-btn--ghost xp-wiz-btn xp-wiz-btn--back" data-test="back" @click="onBack">
            <i :class="['fad', isFirst ? 'fa-door-open' : 'fa-arrow-left']" aria-hidden="true"></i>
            {{ isFirst ? "Close" : "Back" }}
          </button>
          <button
            v-if="!isLast"
            type="button"
            class="xp-app-btn xp-wiz-btn xp-wiz-btn--next"
            :disabled="!canNext"
            data-test="next"
            @click="onNext"
          >
            Next
            <i class="fad fa-arrow-right" aria-hidden="true"></i>
          </button>
          <button
            v-else
            type="button"
            class="xp-app-btn xp-wiz-btn xp-wiz-btn--next xp-wiz-btn--verb"
            :disabled="busy || !canNext"
            data-test="submit"
            @click="onNext"
          >
            <i :class="['fad', `fa-${verbIcon}`]" aria-hidden="true"></i>
            {{ verb }}
          </button>
        </div>
      </div>
    </ion-footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { IonContent, IonFooter, IonHeader, IonToolbar } from "@ionic/vue";
import { play$fx } from "@/assets/fx";
import XpCloseButton from "@/components/atoms/CloseButton/XpCloseButton.vue";
import XpSpeakButton from "@/components/atoms/SpeakButton/XpSpeakButton.vue";
import XpAppHeader from "@/components/organisms/XpApp/XpAppHeader.vue";
import { useAppSkin } from "@/components/organisms/XpApp/useAppSkin";
import { useWizardSteps } from "@/hooks/useWizardSteps";
import type { WizardStep } from "@/lib/services/wizard/wizardSteps";

interface WizardShellProps {
  /** The form's steps in order (WizardStep<YourDraft>[] fits) */
  steps: readonly WizardStep<object>[];
  /** The form's draft: every step's validator and skip rule reads it */
  draft: object;
  /** The step being asked; bind it with v-model:index to open an edit on its summary. Unbound, the shell keeps its own. */
  index?: number;
  /** The header's title; the step's own title when left out ("New Quest" stays the same on every step) */
  title?: string;
  /** The header's icon, and the guide's on a step with no icon of its own (Font Awesome duotone, no prefix) */
  icon?: string;
  /** An app name (`goods`) or CSS colour: the shell then wears that app's skin itself. Left out, it inherits the holder's. */
  accent?: string;
  /** The last step's button: Summon, Save, Open */
  verb?: string;
  verbIcon?: string;
  /** The form is saving: the verb is shut so a second tap cannot save twice */
  busy?: boolean;
  /** False where the dots are a progress mark only (the Quest Wizard asks its questions in order) */
  jumpable?: boolean;
  /** Show a Delete button beside Close (an edit of a saved record); it emits `delete` and the form asks to confirm */
  deletable?: boolean;
  /** The Delete button's label for screen readers: "Delete Power" */
  deleteLabel?: string;
}

/**
 * The shell every wizard stands in (docs: compendium-wizards-design, section 1): the header with the step and "n / N",
 * progress dots, the guide's line with the speak button, the step's content in a scrolling body, and Back / Next in the
 * footer where a thumb reaches. The last step's button is the form's verb (Summon, Save) and emits `submit`; Back on
 * the first step reads Close and emits `close`. The shell never knows the fields: the form gives it its steps (the
 * rules live in wizardSteps.ts) and its draft, and fills one slot per step id.
 *
 * It renders the header, the body and the footer as direct children of whatever holds it (an `ion-modal` or an
 * `ion-page`), so that holder keeps the layout. Pass `accent` where the holder does not already wear the app's skin.
 * The bottom nav is never touched: the stepper lives inside the page.
 */
const props = withDefaults(
  defineProps<WizardShellProps>(),
  { index: undefined, title: undefined, icon: "scroll", accent: undefined, verb: "Save", verbIcon: "check", busy: false, jumpable: true, deletable: false, deleteLabel: "Delete" }
);

/** Close (Back on the first step), the verb, Delete, and the step moving */
interface WizardShellEmits {
  close: [];
  submit: [];
  delete: [];
  "update:index": [index: number];
}

const emit = defineEmits<WizardShellEmits>();

// The place: the form's when it binds `index`, the shell's own otherwise
const own = ref(props.index ?? 0);
const place = computed({
  get: () => props.index ?? own.value,
  set: (value: number) => {
    own.value = value;
    emit("update:index", value);
  },
});

// The skin is chosen once: an app's accent does not change under an open form
const skin = props.accent ? useAppSkin(props.accent) : undefined;
const rootClass = computed(() => skin?.rootClass.value ?? []);
const rootStyle = computed(() => skin?.rootStyle.value);

const { step, progress, isFirst, isLast, canNext, blockedBy, dots, next, prev, selectStep } = useWizardSteps(
  () => props.steps,
  () => props.draft,
  place
);

const headerTitle = computed(() => props.title ?? step.value?.title ?? "");

const root = ref<HTMLElement | null>(null);
const content = ref<{ $el?: { scrollToTop?: (ms?: number) => Promise<void> } } | null>(null);

// Every step opens at the top of its body; a form may also bring the top into view itself (after a pick)
const scrollToTop = (ms = 0) => {
  void content.value?.$el?.scrollToTop?.(ms);
};
watch(place, () => scrollToTop(0));
defineExpose({ scrollToTop });

// Close the phone's keyboard when a step is left, so the next step opens on a clear screen
const dropKeyboard = () => {
  const active = document.activeElement;
  const isInsideShell = active instanceof HTMLElement && root.value?.contains(active);
  if (isInsideShell) active.blur();
};

const onBack = () => {
  play$fx("cursor");
  const didStepBack = prev();
  if (!didStepBack) emit("close");
};

const onNext = () => {
  if (!canNext.value) {
    play$fx("no");
    return;
  }
  if (isLast.value) {
    // The form plays its own fanfare, or its own "no" when the save fails
    const isBusy = props.busy;
    if (!isBusy) emit("submit");
    return;
  }
  play$fx("select");
  dropKeyboard();
  next();
};

const onDot = (target: number) => {
  const canJump = props.jumpable;
  if (!canJump) return;
  play$fx("cursor");
  dropKeyboard();
  selectStep(target);
};
</script>

<style lang="scss" scoped>
// No box of its own: the holder (an ion-modal or an ion-page) lays out the header, body and footer, as it did before the shell
.xp-wizard {
  display: contents;
}

// Delete sits left of Close, the same size, in the danger red; it never spins like Close does
.xp-wiz-delete {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  padding: 0 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 2rem;
  color: var(--ion-color-danger);
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));

  &:active {
    transform: scale(0.92);
  }
}

// ---- Progress dots and the guide -----------------------------------------------------------------------------------

.xp-wiz-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}

.xp-wiz-dot {
  position: relative;
  display: block;
  width: 12px;
  height: 12px;
  margin: 0;
  padding: 0;
  border: 2px solid var(--xp-app-accent);
  border-radius: var(--xp-app-radius-chip);
  background: transparent;
  appearance: none;
  cursor: default;
  transition: background 0.15s, transform 0.15s;
  -webkit-tap-highlight-color: transparent;

  &.is-done {
    background: var(--xp-app-accent);
    opacity: 0.6;
  }

  &.is-here {
    background: var(--xp-app-accent);
    transform: scale(1.3);
  }

  // A step to go back (or on) to: the tap area is wider than the dot, up to the next dot
  &.is-tappable {
    cursor: pointer;

    &::after {
      position: absolute;
      inset: -4px;
      content: "";
    }
  }
}

.xp-wiz-guide {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 12px 14px 8px;
  color: var(--xp-app-text);
  font-family: var(--xp-app-font-title);
  font-size: 1.15rem;
  line-height: 1.2;
  text-align: center;
  text-transform: var(--xp-app-title-transform);

  i {
    color: var(--xp-app-accent);
    font-size: 1.5rem;
  }
}

// ---- Bottom: the step's field, the reason, Back and Next -----------------------------------------------------------

.xp-wiz-footer::before {
  display: none;
}

.xp-wiz-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 12px calc(10px + var(--ion-safe-area-bottom, 0px));
  background: var(--xp-app-bar-bg);
  border-top: 1px solid var(--xp-app-line);

  // A step's search or text field is taller here, where the thumb types
  :slotted(.xp-app-search) {
    height: 46px;
  }
}

// Why Next is shut: one small line, in the cream of the app
.xp-wiz-why {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 0;
  color: var(--xp-app-text);
  font-family: var(--xp-app-font-title);
  font-size: 0.85rem;
  line-height: 1.2;
  text-align: center;
  text-transform: var(--xp-app-title-transform);

  i {
    color: var(--xp-app-accent);
  }
}

.xp-wiz-nav {
  display: flex;
  gap: 10px;
}

.xp-wiz-btn {
  min-height: 56px;
  font-size: 1.05rem;

  i {
    font-size: 1.2rem;
  }

  &--back {
    flex: 1 1 0;
  }

  &--next {
    flex: 1.7 1 0;
  }

  &--verb {
    font-size: 1.2rem;
  }
}
</style>
