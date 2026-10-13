<template>
  <ion-modal
    ref="modal"
    :is-open="isOpen"
    class="hero-builder"
    :can-dismiss="canDismiss"
    @didDismiss="emit('close')"
  >
    <xp-hero-builder
      ref="builder"
      :look="look"
      :equipment="equipment"
      :allow-portrait="allowPortrait"
      @save="onSave"
      @close-request="dismiss"
      @portrait="onPortrait"
    />
  </ion-modal>
</template>

<script setup lang="ts">
  import { ref } from "vue";
  import { IonModal } from "@ionic/vue";
  import XpHeroBuilder from "./XpHeroBuilder.vue";
  import type { HandSlots } from "./lookEditor";
  import type { HeroLook } from "@/lib/hero-look/types";

  /**
   * The full-screen shell around the hero builder. The builder is rendered only while the modal is open, so every
   * open starts from the profile's look. X, the Android back button and a swipe all go through `canDismiss`, which
   * asks the builder whether the player may leave; a finished Done or the hand-off to the portrait picker does not ask.
   */
  defineProps<{
    isOpen: boolean;
    /** The profile's look so far; none yet opens on the starter lineup */
    look?: HeroLook | null;
    /** Lends the hero its hands, when the profile already holds items */
    equipment?: HandSlots | null;
    /** Offer "Use a 2D portrait instead" */
    allowPortrait?: boolean;
  }>();

  const emit = defineEmits<{
    (e: "save", look: HeroLook, image?: string): void;
    (e: "close"): void;
    (e: "portrait"): void;
  }>();

  const modal = ref<{ $el: { dismiss: (data?: unknown, role?: string) => Promise<boolean> } } | null>(null);
  const builder = ref<{ confirmLeave: () => Promise<boolean> } | null>(null);

  const canDismiss = async (): Promise<boolean> => (await builder.value?.confirmLeave()) ?? true;

  const dismiss = () => {
    modal.value?.$el.dismiss();
  };

  const onSave = (look: HeroLook, image?: string) => {
    emit("save", look, image);
    dismiss();
  };

  const onPortrait = () => {
    emit("portrait");
    dismiss();
  };
</script>

<style lang="scss" scoped>
  @use "@/styles/themes/earthbound.scss" as *;

  .hero-builder {
    --width: 100%;
    --height: 100%;
    --max-width: 100%;
    --max-height: 100%;
    --border-radius: 0;
    --background: #{$eb-color-dark-purple};
    --box-shadow: none;
  }
</style>
