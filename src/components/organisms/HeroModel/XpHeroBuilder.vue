<template>
  <div class="builder-screen ion-page">
    <ion-header class="ion-no-border">
      <ion-toolbar class="rpg-box builder-toolbar">
        <ion-buttons slot="start">
          <xp-close-button
            size="lg"
            color="light"
            :play-sound="false"
            @click="emit('close-request')"
          />
        </ion-buttons>

        <ion-title>
          <span
            class="builder-title"
            data-cy="builder-title"
          >
            <i class="fad fa-hat-wizard mr-2"></i>{{ heading }}
          </span>
        </ion-title>

        <!-- The 2D way out sits up here once the editor is open; the lineup carries its own link at its foot -->
        <ion-buttons
          v-if="allowPortrait && phase === 'editor'"
          slot="end"
        >
          <button
            type="button"
            class="portrait-link"
            data-cy="look-use-portrait"
            aria-label="Use a 2D portrait instead"
            @click="usePortrait"
          >
            2D
          </button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <!-- The page never scrolls: the lineup and the tray scroll inside themselves -->
    <ion-content
      class="builder-content"
      :scroll-y="false"
    >
      <xp-starter-lineup
        v-if="phase === 'lineup'"
        :thumbnails="thumbnails"
        :allow-portrait="allowPortrait"
        @pick="pickStarter"
        @portrait="usePortrait"
        @roll="rollLineup"
      />

      <div
        v-else
        class="editor"
      >
        <div class="editor-stage">
          <xp-builder-stage
            ref="stage"
            :look="shownLook"
            :focus="tab.focus"
            :animation="animation"
            :can-undo="history.length > 0"
            @undo="undo"
            @random="random"
            @pose="nextPose"
          />
        </div>

        <div
          ref="trayHost"
          class="editor-tray"
        >
          <xp-builder-tray
            :model-value="draft"
            :tab="tab"
            :mode="mode"
            :thumbnails="thumbnails"
            @update:model-value="changeDraft"
            @update:mode="changeMode"
          />
        </div>
      </div>
    </ion-content>

    <ion-footer
      v-if="phase === 'editor'"
      class="ion-no-border builder-footer"
    >
      <xp-builder-nav
        :model-value="tabId"
        @update:model-value="changeTab"
        @done="done"
      />
    </ion-footer>
  </div>
</template>

<script setup lang="ts">
  import { computed, nextTick, ref, shallowRef } from "vue";
  import { IonButtons, IonContent, IonFooter, IonHeader, IonTitle, IonToolbar, alertController } from "@ionic/vue";
  import XpCloseButton from "@/components/atoms/CloseButton/XpCloseButton.vue";
  import XpBuilderNav from "./builder/XpBuilderNav.vue";
  import XpBuilderStage from "./builder/XpBuilderStage.vue";
  import XpBuilderTray from "./builder/XpBuilderTray.vue";
  import XpStarterLineup from "./builder/XpStarterLineup.vue";
  import {
    popHistory,
    pushHistory,
    randomLook,
    sameLook,
    stageLook,
    tabById,
    withHands,
    withoutHands,
    type HandSlots,
    type LookTabId,
  } from "./lookEditor";
  import { useLookThumbnails } from "./useLookThumbnails";
  import { play$fx } from "@/assets/fx";
  import { useTimers } from "@/hooks/useTimers";
  import { DEFAULT_LOOK, isHeroLook, type HeroAnimation, type HeroLook } from "@/lib/hero-look/types";

  /**
   * The hero builder screen: a starter lineup for a hero with no look, then the editor (the stage on top, the tray of
   * options under it, the tabs and Done in the footer). It owns the draft, the undo history, the phases, every sound
   * and the Done sequence; the four parts only draw and emit. It is mounted only while the modal around it is open,
   * so each open starts fresh. A look put in the history is never touched again: every change makes a new object.
   */
  const props = withDefaults(
    defineProps<{
      /** The hero's look so far; none (or a hero that has never had one) opens on the starter lineup */
      look?: HeroLook | null;
      /** Lends the hero its hands while it is drawn; never saved */
      equipment?: HandSlots | null;
      /** Offer a way out to a 2D portrait */
      allowPortrait?: boolean;
    }>(),
    { look: null, equipment: null, allowPortrait: false },
  );

  const emit = defineEmits<{
    (e: "save", look: HeroLook, image?: string): void;
    (e: "close-request"): void;
    (e: "portrait"): void;
  }>();

  const POSES: HeroAnimation[] = ["idle", "wave", "dance", "victory"];
  /** How long the hero hops after a pick (ms) */
  const HOP_MS = 450;
  /** How long the hero cheers before the look is handed back (ms) */
  const VICTORY_MS = 800;
  /** The size of the picture saved with the look (pixels) */
  const SNAPSHOT_SIZE = 256;

  const timers = useTimers();
  const thumbnails = useLookThumbnails();

  // Hands come from the equipment at render time and are never part of the draft; an old save may lack newer fields
  const startLook: HeroLook = isHeroLook(props.look)
    ? withoutHands({ ...DEFAULT_LOOK, ...props.look })
    : { ...DEFAULT_LOOK };

  const phase = ref<"lineup" | "editor">(isHeroLook(props.look) ? "editor" : "lineup");
  const draft = shallowRef<HeroLook>(startLook);
  const history = shallowRef<HeroLook[]>([]);
  const tabId = ref<LookTabId>("body");
  const mode = ref<"style" | "colour">("style");
  const pose = ref<HeroAnimation>("idle");
  const hopping = ref(false);
  /** A starter was picked from the lineup: that is a change even if the draft ends up as it began */
  const picked = ref(false);
  /** Done was pressed: the screen takes no more input while the hero cheers */
  const saving = ref(false);
  /** The look was handed back (saved, or off to the portrait picker): leaving needs no question */
  const left = ref(false);

  const stage = ref<InstanceType<typeof XpBuilderStage> | null>(null);
  const trayHost = ref<HTMLElement | null>(null);

  const tab = computed(() => tabById(tabId.value));
  const heading = computed(() => (phase.value === "lineup" ? "Pick a starting hero" : "Build your hero"));
  const animation = computed<HeroAnimation>(() => (hopping.value ? "hop" : pose.value));

  /**
   * What the stage draws: bare-headed on Hair so the hair shows, wearing the real hat again for the cheer and the picture.
   * It keeps its identity while nothing about the hero changes (a tab switch that leaves the head as it was): the live
   * hero rebuilds whenever it gets a different look object, and a rebuild would cut the camera's ease short.
   */
  const shownLook = computed<HeroLook>((previous) => {
    const next = withHands(saving.value ? draft.value : stageLook(draft.value, tab.value), props.equipment);
    const unchanged =
      !!previous &&
      sameLook(previous, next) &&
      previous.leftHand === next.leftHand &&
      previous.rightHand === next.rightHand;
    return unchanged ? previous : next;
  });

  const dirty = computed(() => picked.value || !sameLook(draft.value, startLook));

  let hopTimer = 0;
  const hop = () => {
    timers.cancel(hopTimer);
    hopping.value = true;
    hopTimer = timers.startTimeout(HOP_MS, () => {
      hopping.value = false;
    });
  };

  const focusTray = async () => {
    await nextTick();
    trayHost.value?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
  };

  const pickStarter = (look: HeroLook) => {
    draft.value = look;
    picked.value = true;
    tabId.value = "body";
    phase.value = "editor";
    hop();
    play$fx("select");
  };

  /** A changed build is thrown away by the portrait, so that asks first; a clean one goes at once */
  const usePortrait = async () => {
    if (saving.value || left.value) return;
    if (dirty.value) {
      const leaving = await askToLeave();
      // Done, or another way out, may have won while the question was open
      if (!leaving || saving.value || left.value) return;
    }
    play$fx("select");
    left.value = true;
    emit("portrait");
  };

  const rollLineup = () => {
    play$fx("cursor");
  };

  const changeTab = (id: LookTabId) => {
    if (saving.value) return;
    tabId.value = id;
    play$fx("cursor");
    focusTray();
  };

  const changeMode = (next: "style" | "colour") => {
    if (saving.value) return;
    mode.value = next;
    play$fx("cursor");
  };

  const changeDraft = (next: HeroLook) => {
    // A tap on the tile that is already chosen hands back the same look: nothing to remember, nothing to hear
    if (saving.value || sameLook(next, draft.value)) return;
    history.value = pushHistory(history.value, draft.value);
    draft.value = next;
    hop();
    play$fx("select");
  };

  const random = () => {
    if (saving.value) return;
    history.value = pushHistory(history.value, draft.value);
    draft.value = randomLook();
    stage.value?.flick();
    play$fx("select");
  };

  const undo = () => {
    if (saving.value) return;
    const previous = popHistory(history.value);
    if (!previous.look) {
      play$fx("no");
      return;
    }
    history.value = previous.history;
    draft.value = previous.look;
    hop();
    play$fx("cursor");
  };

  const nextPose = () => {
    if (saving.value) return;
    pose.value = POSES[(POSES.indexOf(pose.value) + 1) % POSES.length];
    play$fx("cursor");
  };

  /** The hero cheers, then the look goes back with a picture of it; a picture that cannot be taken must not lose the look */
  const done = () => {
    if (saving.value) return;
    saving.value = true;
    timers.cancel(hopTimer);
    hopping.value = false;
    play$fx("yes");
    pose.value = "victory";
    timers.startTimeout(VICTORY_MS, () => {
      let image: string | undefined;
      try {
        image = stage.value?.snapshot(SNAPSHOT_SIZE) || undefined;
      } catch {
        image = undefined;
      }
      left.value = true;
      emit("save", withoutHands(draft.value), image);
    });
  };

  /** The open "Leave without saving?" question, if any: asked twice (X and Android back, two quick taps), it is still one alert */
  let pending: Promise<boolean> | null = null;

  /** Asks whether to throw the changes away; true for "Leave". Makes no sound: each way out has its own */
  const askToLeave = (): Promise<boolean> => {
    if (pending) return pending;
    const question = (async (): Promise<boolean> => {
      const alert = await alertController.create({
        header: "Leave without saving?",
        buttons: [
          { text: "Keep building", role: "cancel" },
          { text: "Leave", role: "destructive" },
        ],
      });
      await alert.present();
      const { role } = await alert.onDidDismiss();
      return role === "destructive";
    })();
    pending = question;
    const settled = (): void => {
      if (pending === question) pending = null;
    };
    question.then(settled, settled);
    return question;
  };

  /** Whether the screen may close: at once when nothing would be lost, else after the player says so */
  const confirmLeave = async (): Promise<boolean> => {
    if (left.value) return true;
    // The hero is cheering and the look is on its way back: nothing may interrupt that
    if (saving.value) return false;
    if (!dirty.value) {
      play$fx("closeMenu");
      return true;
    }
    const alreadyAsking = pending !== null;
    const leaving = await askToLeave();
    if (!leaving) return false;
    // The sound belongs to the question: whoever asked first plays it, a second asker rides on the same answer
    if (!alreadyAsking) play$fx("closeMenu");
    return true;
  };

  defineExpose({ confirmLeave });
</script>

<style lang="scss" scoped>
  @use "@/styles/themes/earthbound.scss" as *;

  /* ---- Header: the RPG box carries X, the title and (in the editor) the 2D way out ---- */
  .builder-toolbar {
    --color: #{$eb-color-cream};
    --min-height: 56px;

    ion-title {
      text-align: left;
      padding-inline-start: 8px;
    }
  }

  .builder-title {
    font-family: $eb-font-title;
    color: $eb-color-pale-yellow;
    font-size: 1.25rem;
    letter-spacing: 1px;
  }

  .portrait-link {
    min-width: 44px;
    min-height: 44px;
    margin-inline-end: 8px;
    padding: 0 12px;
    font-family: $eb-font-status;
    font-size: 1rem;
    letter-spacing: 1px;
    color: $eb-color-pale-yellow;
    background: $eb-color-medium-purple;
    border: none;
    border-radius: 1px;
    box-shadow: 0 0 0 3px $eb-color-slate;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    &:active {
      transform: translateY(2px);
    }

    &:focus-visible {
      outline: 3px solid $eb-color-white;
      outline-offset: 2px;
    }
  }

  /* ---- Page: the stage takes 46% of the space under the header, the tray the rest ---- */
  .builder-content {
    --background: #{$eb-color-dark-purple};
    --padding-top: 0;
    --padding-bottom: 0;
    --padding-start: 0;
    --padding-end: 0;
    color: $eb-color-cream;
  }

  .editor {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .editor-stage {
    position: relative;
    flex: 0 0 46%;
    min-height: 0;
    overflow: hidden;
  }

  .editor-tray {
    flex: 1 1 auto;
    min-height: 0;
    border-top: 3px solid $eb-color-pale-yellow;
  }

  /* ---- Footer: the tabs and Done, clear of the home bar ---- */
  .builder-footer {
    padding-bottom: var(--ion-safe-area-bottom, 0px);
    background: $eb-color-dark-purple;
  }
</style>
