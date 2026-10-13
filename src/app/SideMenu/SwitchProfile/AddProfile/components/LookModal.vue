<template>
  <ion-modal
    :is-open="isOpen"
    class="look-modal"
    @didDismiss="emit('close')"
  >
    <!-- The RPG box lives on the app bar only; the page below stays light -->
    <ion-header class="ion-no-border">
      <ion-toolbar class="rpg-box look-toolbar">
        <ion-title>
          <span class="look-title"><i class="fad fa-hat-wizard mr-2"></i>Build your hero</span>
        </ion-title>
        <ion-buttons slot="end">
          <xp-close-button
            size="lg"
            color="light"
            @click="emit('close')"
          />
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <!-- The hero stands on the sliding checker; the options and the tab strip sit at the bottom of the page -->
    <ion-content class="bg-slide bg-slide-equipment look-content">
      <div class="look-page">
        <xp-look-editor
          ref="editor"
          v-model="draft"
          :equipment="equipment"
          flat
        >
          <template #stage>
            <p class="look-hint">Drag to turn your hero</p>
          </template>
        </xp-look-editor>
      </div>
    </ion-content>

    <!-- Everything you tap is under the thumb: the two small ways out on top, the one big button last -->
    <ion-footer class="ion-no-border look-footer">
      <div class="look-dock">
        <div class="look-dock__row">
          <button
            type="button"
            class="look-reset"
            @click="reset"
          >
            <i class="fad fa-undo"></i>
            Reset
          </button>
          <!-- The 2D way in: the profile keeps its portrait instead of a built hero -->
          <button
            type="button"
            class="look-portrait"
            data-cy="look-use-portrait"
            @click="usePortrait"
          >
            <i class="fad fa-user-circle"></i>
            Use a 2D portrait instead
          </button>
        </div>
        <button
          type="button"
          class="look-done"
          :disabled="saving"
          @click="done"
        >
          <i class="fad fa-check-circle"></i>
          Looks good!
        </button>
      </div>
    </ion-footer>
  </ion-modal>
</template>

<script setup lang="ts">
  import { ref, watch } from "vue";
  import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonContent, IonFooter } from "@ionic/vue";
  import XpCloseButton from "@/components/atoms/CloseButton/XpCloseButton.vue";
  import XpLookEditor from "@/components/organisms/HeroModel/XpLookEditor.vue";
  import { withoutHands, type HandSlots } from "@/components/organisms/HeroModel/lookEditor";
  import { play$fx } from "@/assets/fx";
  import { DEFAULT_LOOK, isHeroLook, type HeroLook } from "@/lib/hero-look/types";

  /**
   * The full-screen look builder for a profile that may not exist yet (the Add Profile flow). The page above is
   * the voxel hero and the options; the tab strip and the two buttons sit in the footer area, under the thumb.
   * It owns only a draft: "Looks good!" hands it back (`save`) with a picture of the hero, X throws it away.
   * "Use a 2D portrait instead" (`portrait`) throws the draft away too and asks the page for the portrait picker.
   */
  const props = defineProps<{
    isOpen: boolean;
    /** The profile's look so far; none yet starts from the default hero. */
    look?: HeroLook;
    /** Lends the hero its hands, when the profile already holds items. */
    equipment?: HandSlots | null;
  }>();

  const emit = defineEmits<{
    (e: "close"): void;
    (e: "save", look: HeroLook, image?: string): void;
    (e: "portrait"): void;
  }>();

  const startLook = (): HeroLook => withoutHands(isHeroLook(props.look) ? { ...DEFAULT_LOOK, ...props.look } : { ...DEFAULT_LOOK });

  // Each time the builder opens it starts from the profile's look
  const draft = ref<HeroLook>(startLook());
  const saving = ref(false);
  const editor = ref<{ snapshot: (size?: number) => string | Promise<string> | undefined } | null>(null);

  watch(
    () => props.isOpen,
    (open) => {
      if (open) draft.value = startLook();
    }
  );

  const reset = () => {
    play$fx("cursor");
    draft.value = { ...DEFAULT_LOOK };
  };

  const usePortrait = () => {
    play$fx("select");
    emit("portrait");
  };

  const done = async () => {
    if (saving.value) return;
    saving.value = true;
    try {
      // A snapshot that fails (no WebGL, say) must not lose the look: it is saved without a picture
      let image: string | undefined;
      try {
        image = (await editor.value?.snapshot(256)) || undefined;
      } catch {
        image = undefined;
      }
      play$fx("yes");
      emit("save", draft.value, image);
      emit("close");
    } finally {
      saving.value = false;
    }
  };
</script>

<style lang="scss" scoped>
  @use "@/styles/themes/earthbound.scss" as *;

  .look-modal {
    --width: 100%;
    --height: 100%;
    --max-width: 100%;
    --max-height: 100%;
    --border-radius: 0;
    --background: #{$eb-color-dark-purple};
    --box-shadow: none;
  }

  // The app bar carries the RPG box (the global `ion-toolbar.rpg-box`); the title sits at the start, Material style
  .look-toolbar {
    --color: #{$eb-color-cream};

    ion-title {
      text-align: left;
      padding-inline-start: 8px;
    }
  }

  .look-title {
    font-family: $eb-font-title;
    color: $eb-color-pale-yellow;
    font-size: 1.25rem;
    letter-spacing: 1px;
  }

  // The animated sliding background comes from `bg-slide bg-slide-equipment`; nothing solid here
  .look-content {
    --padding-top: 0;
    --padding-bottom: 12px;
    color: $eb-color-cream;
  }

  // The page is as tall as the screen: the hero takes what the options leave
  .look-page {
    height: 100%;
    display: flex;
    flex-direction: column;

    > .look-editor {
      flex: 1 1 auto;
    }
  }

  .look-hint {
    position: absolute;
    top: 8px;
    left: 0;
    right: 0;
    margin: 0;
    text-align: center;
    font-family: $eb-font-status;
    font-size: 0.9rem;
    letter-spacing: 1px;
    color: $eb-color-cream;
    text-shadow: 0 2px 0 rgba(0, 0, 0, 0.6);
    pointer-events: none;
  }

  /* ---- Footer: Reset and the one big button, under the thumb ---- */
  .look-footer {
    background: $eb-color-dark-purple;
    border-top: 3px solid $eb-color-pale-yellow;
  }

  .look-dock {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px 16px calc(12px + var(--ion-safe-area-bottom, 0px));
    background: $eb-color-dark-purple;
  }

  .look-dock__row {
    display: flex;
    align-items: stretch;
    gap: 10px;
  }

  .look-reset,
  .look-portrait,
  .look-done {
    min-height: 52px;
    padding: 8px 14px;
    font-family: $eb-font-status;
    letter-spacing: 0.5px;
    border: none;
    border-radius: 1px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    i {
      --fa-primary-color: currentColor;
      --fa-secondary-color: currentColor;
    }

    &:active:not(:disabled) {
      transform: translateY(2px);
    }

    &:focus-visible {
      outline: 3px solid $eb-color-white;
      outline-offset: 2px;
    }
  }

  .look-reset,
  .look-portrait {
    color: $eb-color-cream;
    background: $eb-color-medium-purple;
    box-shadow: 0 0 0 3px $eb-color-slate;
  }

  .look-reset {
    flex: 0 0 auto;
    min-width: 104px;
    font-size: 1.05rem;
  }

  // The secondary way out: a plain box beside Reset, so the gold button below stays the one to press
  .look-portrait {
    flex: 1;
    min-width: 0;
    font-size: 0.95rem;
    line-height: 1.1;
    text-align: center;
  }

  .look-done {
    flex: 1;
    font-size: 1.3rem;
    color: $eb-color-dark-purple;
    background: $eb-color-pale-yellow;
    box-shadow: 0 0 0 3px $eb-color-medium-purple, 0 0 0 5px $eb-color-minty-blue, 0 4px 0 5px rgba(0, 0, 0, 0.5);

    &:disabled {
      cursor: default;
      opacity: 0.7;
    }
  }
</style>
