<template>
  <ion-modal
    :is-open="isOpen"
    class="class-codex-modal"
    @didPresent="centerRail()"
    @didDismiss="emit('close')"
  >
    <ion-header class="ion-no-border">
      <ion-toolbar class="codex-toolbar">
        <ion-title>
          <span class="codex-title"><i class="fad fa-scroll-old mr-2"></i>Class Codex</span>
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

    <!-- Content only reads. Everything you tap lives in the footer, under the thumb. -->
    <ion-content ref="content" class="codex-content">
      <div
        v-if="shown"
        :key="shown.name"
        class="codex-page"
        :style="crestStyle(shown.name)"
      >
        <section class="codex-hero eb-panel">
          <div class="codex-crest">
            <i :class="['fad', shown.icon, 'fa-4x']"></i>
          </div>
          <h2 class="codex-name">{{ shown.name }}</h2>
          <p class="codex-creed">&ldquo;{{ shown.creed }}&rdquo;</p>
          <div class="codex-chips">
            <span class="codex-chip">{{ shown.tier === 2 ? "Advanced class" : "Base class" }}</span>
            <span
              v-if="isCurrent"
              class="codex-chip is-yours"
            ><i class="fad fa-check-circle"></i> Your class</span>
            <span
              v-else-if="shown.sealed"
              class="codex-chip is-sealed"
            ><i class="fad fa-lock"></i> Sealed</span>
            <span
              v-if="shown.heroLevel > 0"
              class="codex-chip"
            >You: Lv {{ shown.heroLevel }}</span>
          </div>
          <p class="codex-description">{{ shown.description }}</p>
        </section>

        <section class="codex-box eb-panel">
          <h3 class="codex-heading"><i class="fad fa-dungeon"></i> In the game</h3>
          <p class="codex-passive">
            <i class="fad fa-sparkles"></i>
            <span>{{ shown.passive }}</span>
          </p>
          <p class="codex-start">
            Starts with <strong class="is-hp">{{ shown.startingHp }} HP</strong> &middot;
            <strong class="is-mp">{{ shown.startingMp }} MP</strong>
          </p>
          <ul class="codex-pillars">
            <li
              v-for="pillar in shown.pillars"
              :key="pillar.key"
              class="codex-pillar"
              :style="{ '--pillar': `var(--ion-color-${pillar.color})` }"
            >
              <i :class="['fad', pillar.icon, 'fa-lg']"></i>
              <span class="pillar-text">
                <span class="pillar-rank">{{ pillar.rank }}</span>
                <span class="pillar-name">{{ pillar.name }} <small>({{ pillar.currency }})</small></span>
                <span class="pillar-stats">{{ pillar.stats.join(" · ") }}</span>
              </span>
            </li>
          </ul>
        </section>

        <section class="codex-box eb-panel">
          <h3 class="codex-heading"><i class="fad fa-clipboard-check"></i> In real life</h3>
          <ul class="codex-lines">
            <li
              v-for="line in shown.realLife"
              :key="line"
            >{{ line }}</li>
          </ul>
        </section>

        <section
          v-if="shown.tier === 1 && shown.growsInto.length"
          class="codex-box eb-panel"
        >
          <h3 class="codex-heading"><i class="fad fa-crown"></i> Grows into</h3>
          <ul class="codex-evolutions">
            <li
              v-for="evolution in shown.growsInto"
              :key="evolution.name"
              class="codex-evolution"
              :style="crestStyle(evolution.name)"
            >
              <span class="evolution-crest"><i :class="['fad', evolution.icon, 'fa-2x']"></i></span>
              <span class="evolution-text">
                <span class="evolution-name">{{ evolution.name }}</span>
                <span class="evolution-with">with {{ evolution.with }}</span>
                <span class="evolution-need">{{ evolution.requirement }}</span>
              </span>
              <i
                v-if="evolution.met"
                class="fad fa-check-circle evolution-met"
                title="Ready"
              ></i>
            </li>
          </ul>
        </section>

        <section
          v-if="shown.tier === 2"
          class="codex-box eb-panel"
        >
          <h3 class="codex-heading"><i class="fad fa-lock"></i> Unlocks when</h3>
          <p class="codex-need">{{ shown.requirement }}</p>
          <p class="codex-progress">
            <template
              v-for="(part, index) in shown.requirementProgress"
              :key="part.name"
            >
              <span v-if="index > 0"> &middot; </span>
              <span :class="{ 'is-met': part.met }">{{ part.name }} {{ part.level }} of {{ part.needed }}</span>
            </template>
          </p>
        </section>
      </div>
    </ion-content>

    <ion-footer class="ion-no-border codex-footer">
      <div class="codex-dock">
        <div
          ref="rail"
          class="codex-rail"
          role="group"
          aria-label="Classes"
        >
          <button
            v-for="entry in entries"
            :key="entry.name"
            type="button"
            class="rail-crest"
            :class="{
              'is-selected': shown && entry.name === shown.name,
              'is-sealed': entry.sealed,
              'is-yours': entry.name === currentName,
            }"
            :style="crestStyle(entry.name)"
            :data-class="entry.name"
            :aria-pressed="!!shown && entry.name === shown.name"
            :aria-label="entry.sealed ? `${entry.name}, sealed` : entry.name"
            @click="pick(entry)"
          >
            <span class="rail-badge">
              <i :class="['fad', entry.icon, 'fa-2x']"></i>
              <i
                v-if="entry.sealed"
                class="fad fa-lock rail-lock"
              ></i>
              <i
                v-else-if="entry.name === currentName"
                class="fad fa-check-circle rail-check"
              ></i>
            </span>
            <span class="rail-name">{{ entry.name }}</span>
          </button>
        </div>

        <button
          type="button"
          class="codex-confirm"
          :disabled="confirmDisabled"
          @click="confirm"
        >
          <i :class="['fad', confirmIcon]"></i>
          {{ confirmLabel }}
        </button>
      </div>
    </ion-footer>
  </ion-modal>
</template>

<script setup lang="ts">
  import { computed, nextTick, ref, watch } from "vue";
  import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonContent, IonFooter } from "@ionic/vue";
  import XpCloseButton from "@/components/atoms/CloseButton/XpCloseButton.vue";
  import { play$fx } from "@/assets/fx";
  import { classCodex, type ClassCodexEntry } from "@/lib/services/stats/ClassCodex";
  import { canonicalClassName, classLevelsOf } from "@/lib/services/stats/ClassPassives";

  /**
   * The Class Codex: a full-screen, read-only guide to every class, opened from the class crest in the
   * equipment dock. The page above only reads; the crest rail and the one button sit in the footer so a
   * thumb reaches everything. The rules come from the pure module ClassCodex.ts.
   */
  const props = defineProps<{
    isOpen: boolean;
    /** The hero: `jobClass` and `stats.classes` ({ [name]: { level } }). */
    user?: { jobClass?: string; stats?: { classes?: Record<string, { level?: number } | undefined> } } | null;
  }>();

  const emit = defineEmits<{
    (e: "close"): void;
    (e: "chosen", name: string): void;
  }>();

  // The class colours of the old picker (JobClassSelector) for the four base classes, blended for the advanced ones
  const CREST_RGB: Record<string, [number, number, number]> = {
    Warrior: [255, 82, 82],
    Mage: [64, 196, 255],
    Thief: [105, 240, 174],
    Monk: [255, 215, 64],
    Paladin: [255, 160, 90],
    Ninja: [196, 140, 255],
    Sage: [130, 230, 215],
  };
  const crestStyle = (name: string) => {
    const [r, g, b] = CREST_RGB[name] ?? [247, 232, 168];
    return { "--crest": `rgb(${r}, ${g}, ${b})`, "--crest-rgb": `${r}, ${g}, ${b}` };
  };

  const entries = computed<ClassCodexEntry[]>(() => classCodex(classLevelsOf(props.user?.stats?.classes)));
  const currentName = computed(() => canonicalClassName(props.user?.jobClass));

  // The crest on show. Each time the Codex opens it starts on the hero's own class.
  const selectedName = ref("");
  const shown = computed<ClassCodexEntry | null>(
    () => entries.value.find((entry) => entry.name === selectedName.value) ?? entries.value[0] ?? null
  );
  const isCurrent = computed(() => !!shown.value && shown.value.name === currentName.value);

  const rail = ref<HTMLElement | null>(null);
  const content = ref<{ $el?: { scrollToTop?: (duration?: number) => void } } | null>(null);

  /** Scroll the rail so the shown crest sits in the middle. Done by hand: scrollIntoView would also move the page. */
  const centerRail = async (smooth = false) => {
    await nextTick();
    const strip = rail.value;
    const crest = strip?.querySelector<HTMLElement>(`[data-class="${shown.value?.name}"]`);
    if (!strip || !crest) return;
    strip.scrollTo({ left: crest.offsetLeft - (strip.clientWidth - crest.offsetWidth) / 2, behavior: smooth ? "smooth" : "auto" });
  };

  watch(
    () => props.isOpen,
    (open) => {
      if (!open) return;
      selectedName.value = entries.value.some((entry) => entry.name === currentName.value) ? currentName.value : "";
      void centerRail();
    },
    { immediate: true }
  );

  const pick = (entry: ClassCodexEntry) => {
    if (entry.sealed) play$fx("no");
    else if (entry.name !== shown.value?.name) play$fx("cursor");
    if (entry.name === shown.value?.name) return;
    selectedName.value = entry.name;
    content.value?.$el?.scrollToTop?.(0);
    void centerRail(true);
  };

  const confirmDisabled = computed(() => !shown.value || shown.value.sealed || isCurrent.value);
  const confirmLabel = computed(() => {
    if (!shown.value) return "";
    if (shown.value.sealed) return `Sealed · ${shown.value.requirement}`;
    if (isCurrent.value) return "This is your class";
    return `Become a ${shown.value.name}`;
  });
  const confirmIcon = computed(() => {
    if (shown.value?.sealed) return "fa-lock";
    return isCurrent.value ? "fa-check-circle" : "fa-sparkles";
  });

  const confirm = () => {
    if (confirmDisabled.value || !shown.value) return;
    play$fx("select");
    emit("chosen", shown.value.name);
    emit("close");
  };
</script>

<style lang="scss" scoped>
  @use "@/styles/themes/earthbound.scss" as *;

  $rail-crest: 64px;

  .class-codex-modal {
    --width: 100%;
    --height: 100%;
    --max-width: 100%;
    --max-height: 100%;
    --border-radius: 0;
    --background: #{$eb-color-dark-purple};
    --box-shadow: none;
  }

  .codex-toolbar {
    --background: #{$eb-color-dark-purple};
    --color: #{$eb-color-cream};
    --border-width: 0 0 2px 0;
    --border-color: #{$eb-color-medium-purple};
  }

  .codex-title {
    font-family: $eb-font-title;
    color: $eb-color-pale-yellow;
    font-size: 1.25rem;
    letter-spacing: 1px;
  }

  .codex-content {
    --background: #{$eb-color-slate};
    --padding-top: 24px;
    --padding-bottom: 28px;
    --padding-start: 4px;
    --padding-end: 4px;
    color: $eb-color-cream;
  }

  /* The ring shadows of an Earthbound box reach 16px outside it: keep a 20px margin inside the scroller. */
  .codex-page {
    margin: 0 20px;
    display: flex;
    flex-direction: column;
    gap: 28px;
    animation: codex-in 160ms steps(4) both;
  }

  .eb-panel {
    @include eb-box();
    padding: 16px 14px;
  }

  .codex-hero {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .codex-crest {
    width: 112px;
    height: 112px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: rgba(var(--crest-rgb), 0.18);
    border: 3px solid var(--crest);
    box-shadow: 0 0 24px rgba(var(--crest-rgb), 0.45), inset 0 0 18px rgba(var(--crest-rgb), 0.25);

    i {
      --fa-primary-color: var(--crest);
      --fa-secondary-color: var(--crest);
      --fa-secondary-opacity: 0.55;
      color: var(--crest);
    }
  }

  .codex-name {
    margin: 4px 0 0;
    font-family: $eb-font-status;
    font-size: 1.9rem;
    font-weight: normal;
    color: var(--crest);
    text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.6);
  }

  .codex-creed {
    margin: 0;
    font-family: $eb-font-status;
    font-size: 1.15rem;
    font-style: italic;
    color: $eb-color-pale-yellow;
  }

  .codex-chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
  }

  .codex-chip {
    font-family: $eb-font-status;
    font-size: 0.8rem;
    padding: 2px 9px;
    border-radius: 2px;
    background: $eb-color-medium-purple;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: $eb-color-cream;

    &.is-yours {
      color: $eb-color-mint-green;
      border-color: $eb-color-mint-green;
    }

    &.is-sealed {
      color: #ffb4a8;
      border-color: #ffb4a8;
    }
  }

  .codex-description {
    margin: 4px 0 0;
    font-size: 1.05rem;
    line-height: 1.45;
    text-align: left;
  }

  .codex-heading {
    margin: 0 0 10px;
    font-family: $eb-font-status;
    font-weight: normal;
    font-size: 1.25rem;
    color: $eb-color-pale-yellow;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .codex-passive {
    margin: 0 0 10px;
    display: flex;
    gap: 10px;
    align-items: flex-start;
    font-size: 1.05rem;
    line-height: 1.4;

    i {
      color: $eb-color-pale-yellow;
      margin-top: 3px;
    }
  }

  .codex-start {
    margin: 0 0 14px;
    font-family: $eb-font-status;
    font-size: 1.1rem;

    // The HUD's HP red and MP purple, lightened so they read on the dark panel
    .is-hp {
      color: #ff8a80;
      font-weight: normal;
    }

    .is-mp {
      color: #d1b3ff;
      font-weight: normal;
    }
  }

  .codex-pillars,
  .codex-lines,
  .codex-evolutions {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .codex-pillars {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .codex-pillar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 10px;
    background: rgba(0, 0, 0, 0.25);
    border-left: 4px solid var(--pillar);

    > i {
      --fa-primary-color: var(--pillar);
      --fa-secondary-color: var(--pillar);
      --fa-secondary-opacity: 0.55;
      color: var(--pillar);
      flex: 0 0 28px;
      text-align: center;
    }
  }

  .pillar-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .pillar-rank {
    font-size: 0.75rem;
    letter-spacing: 1px;
    text-transform: uppercase;
    opacity: 0.7;
  }

  .pillar-name {
    font-family: $eb-font-status;
    font-size: 1.1rem;
    color: #fff;

    small {
      color: var(--pillar);
      font-size: 0.85rem;
    }
  }

  .pillar-stats {
    font-size: 0.95rem;
    line-height: 1.3;
    opacity: 0.9;
  }

  .codex-lines {
    display: flex;
    flex-direction: column;
    gap: 10px;

    li {
      position: relative;
      padding-left: 20px;
      font-size: 1.05rem;
      line-height: 1.4;

      &::before {
        content: "";
        position: absolute;
        left: 2px;
        top: 0.5em;
        width: 8px;
        height: 8px;
        background: $eb-color-pale-yellow;
        box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.5);
      }
    }
  }

  .codex-evolutions {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .codex-evolution {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 10px;
    background: rgba(0, 0, 0, 0.25);
    border-left: 4px solid var(--crest);
  }

  .evolution-crest {
    flex: 0 0 48px;
    height: 48px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: rgba(var(--crest-rgb), 0.18);

    i {
      --fa-primary-color: var(--crest);
      --fa-secondary-color: var(--crest);
      --fa-secondary-opacity: 0.55;
      color: var(--crest);
    }
  }

  .evolution-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .evolution-name {
    font-family: $eb-font-status;
    font-size: 1.2rem;
    color: var(--crest);
  }

  .evolution-with {
    font-size: 0.95rem;
  }

  .evolution-need {
    font-size: 0.9rem;
    opacity: 0.75;
  }

  .evolution-met {
    color: $eb-color-mint-green;
    font-size: 1.5rem;
  }

  .codex-need {
    margin: 0 0 6px;
    font-family: $eb-font-status;
    font-size: 1.25rem;
    color: var(--crest);
  }

  .codex-progress {
    margin: 0;
    font-size: 1.05rem;

    .is-met {
      color: $eb-color-mint-green;
    }
  }

  /* ---- Footer: the crest rail and the one button, under the thumb ---- */
  .codex-footer {
    background: $eb-color-dark-purple;
    border-top: 3px solid $eb-color-pale-yellow;
  }

  .codex-dock {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 6px 0 calc(12px + var(--ion-safe-area-bottom, 0px));
    background: $eb-color-dark-purple;
  }

  .codex-rail {
    position: relative;
    display: flex;
    gap: 8px;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 14px 16px 6px;
    scroll-snap-type: x proximity;
    -webkit-overflow-scrolling: touch;
    // The theme's `ion-app#earthbound *` scrollbar outranks a class: say it twice, loudly
    scrollbar-width: none !important;

    &::-webkit-scrollbar {
      display: none !important;
    }
  }

  .rail-crest {
    flex: 0 0 72px;
    min-height: 48px;
    scroll-snap-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 0;
    background: none;
    border: none;
    color: $eb-color-cream;
    font-family: $eb-font-status;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: transform 120ms steps(3);

    &:focus-visible .rail-badge {
      outline: 2px solid $eb-color-pale-yellow;
      outline-offset: 2px;
    }
  }

  .rail-badge {
    position: relative;
    width: $rail-crest;
    height: $rail-crest;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: rgba(var(--crest-rgb), 0.2);
    border: 3px solid rgba(var(--crest-rgb), 0.55);

    > i:first-child {
      --fa-primary-color: var(--crest);
      --fa-secondary-color: var(--crest);
      --fa-secondary-opacity: 0.55;
      color: var(--crest);
    }
  }

  .rail-name {
    font-size: 0.85rem;
    opacity: 0.8;
  }

  .rail-lock,
  .rail-check {
    position: absolute;
    right: -4px;
    bottom: -4px;
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    font-size: 0.7rem;
    background: $eb-color-dark-purple;
    border: 2px solid currentColor;
    --fa-primary-color: currentColor;
    --fa-secondary-color: currentColor;
  }

  .rail-lock {
    color: #ffb4a8;
  }

  .rail-check {
    color: $eb-color-mint-green;
  }

  .rail-crest.is-selected {
    transform: translateY(-6px);

    .rail-badge {
      border-color: $eb-color-pale-yellow;
      background: rgba(var(--crest-rgb), 0.35);
      box-shadow: 0 0 0 2px $eb-color-dark-purple, 0 0 16px 3px rgba(var(--crest-rgb), 0.7);
    }

    .rail-name {
      opacity: 1;
      color: $eb-color-pale-yellow;
    }
  }

  .rail-crest.is-sealed:not(.is-selected) {
    .rail-badge > i:first-child,
    .rail-name {
      opacity: 0.45;
    }

    .rail-badge {
      filter: grayscale(0.7);
    }
  }

  .rail-crest.is-sealed.is-selected .rail-badge > i:first-child {
    opacity: 0.65;
  }

  .codex-confirm {
    margin: 0 16px;
    min-height: 52px;
    padding: 8px 14px;
    font-family: $eb-font-status;
    font-size: 1.2rem;
    letter-spacing: 0.5px;
    color: $eb-color-dark-purple;
    background: $eb-color-pale-yellow;
    border: none;
    border-radius: 1px;
    box-shadow: 0 0 0 3px $eb-color-medium-purple, 0 0 0 5px $eb-color-minty-blue, 0 4px 0 5px rgba(0, 0, 0, 0.5);
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

    &:disabled {
      cursor: not-allowed;
      color: rgba(231, 230, 179, 0.75);
      background: $eb-color-medium-purple;
      box-shadow: 0 0 0 3px $eb-color-slate, 0 0 0 5px rgba(104, 208, 184, 0.35);
    }
  }

  @keyframes codex-in {
    from {
      transform: translateY(6px);
    }

    to {
      transform: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .codex-page {
      animation: none;
    }

    .rail-crest {
      transition: none;
    }
  }
</style>
