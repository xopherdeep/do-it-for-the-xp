<template>
  <ion-modal
    :is-open="isOpen"
    class="class-codex-modal"
    @didPresent="centerRail()"
    @didDismiss="onDismiss"
  >
    <div
      class="cs-screen"
      :class="[`is-${skin}`, { 'is-celebrating': celebrating }]"
      :style="crestStyle(shown?.name)"
      data-cy="class-select"
    >
      <!-- Title bar and the tier tabs: Base, Advanced, Crown -->
      <header class="cs-header">
        <div class="cs-titlebar">
          <h1 class="cs-title">Choose Your Class</h1>
          <xp-close-button
            size="lg"
            color="light"
            @click="close"
          />
        </div>
        <nav
          class="cs-tiers"
          role="tablist"
          aria-label="Class tiers"
        >
          <button
            v-for="tier in tiers"
            :key="tier.id"
            type="button"
            role="tab"
            class="cs-tier"
            :class="{ 'is-active': tier.id === activeTier }"
            :aria-selected="tier.id === activeTier"
            :data-cy="`class-tier-${tier.id}`"
            @click="pickTier(tier.id)"
          >
            <span class="cs-tier-label">{{ tier.label }}</span>
            <span class="cs-tier-count">{{ tier.open }}/{{ tier.total }}</span>
          </button>
        </nav>
      </header>

      <ion-content
        ref="content"
        class="cs-content"
        :scroll-y="true"
      >
        <div
          v-if="shown"
          class="cs-body"
        >
          <!-- The stage: the class emblem on its pedestal, swipe or use the arrows to browse -->
          <section
            class="cs-stage"
            aria-live="polite"
            @touchstart.passive="onTouchStart"
            @touchend.passive="onTouchEnd"
          >
            <button
              type="button"
              class="cs-arrow is-prev"
              aria-label="Previous class"
              data-cy="class-prev"
              @click="step(-1)"
            >
              <i class="fas fa-chevron-left"></i>
            </button>

            <div
              :key="shown.name"
              class="cs-showcase"
              :class="`enter-${direction}`"
            >
              <div
                class="cs-pedestal"
                :class="{ 'is-sealed': shown.sealed, 'is-shaking': shaking }"
              >
                <span class="cs-halo"></span>
                <span class="cs-runes"></span>
                <i :class="['fad', shown.icon, 'cs-emblem']"></i>
                <img
                  v-if="portrait && isCurrent"
                  class="cs-portrait"
                  :src="portrait"
                  alt=""
                />
                <span
                  v-if="shown.sealed"
                  class="cs-seal"
                ><i class="fad fa-lock"></i></span>
                <span class="cs-plinth"></span>
              </div>

              <h2 class="cs-name">{{ shown.name }}</h2>
              <p class="cs-creed">&ldquo;{{ shown.creed }}&rdquo;</p>
              <div class="cs-chips">
                <span class="cs-chip">{{ tierLabel(shown.tier) }}</span>
                <span
                  v-if="isCurrent"
                  class="cs-chip is-yours"
                ><i class="fad fa-check-circle"></i> Your class</span>
                <span
                  v-else-if="shown.sealed"
                  class="cs-chip is-sealed"
                ><i class="fad fa-lock"></i> Sealed</span>
                <span
                  v-if="shown.heroLevel > 0"
                  class="cs-chip"
                >Lv {{ shown.heroLevel }}</span>
              </div>
            </div>

            <button
              type="button"
              class="cs-arrow is-next"
              aria-label="Next class"
              data-cy="class-next"
              @click="step(1)"
            >
              <i class="fas fa-chevron-right"></i>
            </button>
          </section>

          <!-- Sealed: what it takes, with a bar per parent class -->
          <section
            v-if="shown.sealed"
            class="cs-panel cs-unlock"
           
            data-cy="class-unlock"
          >
            <h3 class="cs-heading"><i class="fad fa-lock"></i> To unlock</h3>
            <div
              v-for="part in shown.requirementProgress"
              :key="part.name"
              class="cs-need"
              :class="{ 'is-met': part.met }"
            >
              <span class="cs-need-name">{{ part.name }} Lv {{ part.needed }}</span>
              <span class="cs-meter">
                <span
                  class="cs-meter-fill"
                  :style="{ transform: `scaleX(${Math.min(1, part.level / part.needed)})` }"
                ></span>
              </span>
              <span class="cs-need-count">{{ Math.min(part.level, part.needed) }}/{{ part.needed }}</span>
            </div>
          </section>

          <!-- The five pillars as bars on one shared scale -->
          <section
            class="cs-panel"
           
          >
            <h3 class="cs-heading"><i class="fad fa-chart-bar"></i> Starting power</h3>
            <ul class="cs-bars">
              <li
                v-for="pillar in shown.power"
                :key="pillar.key"
                class="cs-bar"
                :class="{ 'is-trained': pillar.rank }"
                :style="{ '--pillar': `var(--ion-color-${pillar.color})` }"
              >
                <i :class="['fad', pillar.icon, 'cs-bar-icon']"></i>
                <span class="cs-bar-name">{{ pillar.name }}</span>
                <span class="cs-meter">
                  <span
                    class="cs-meter-fill"
                    :style="{ transform: `scaleX(${pillar.share})` }"
                  ></span>
                </span>
                <span class="cs-bar-value">{{ pillar.value }}</span>
                <span
                  class="cs-bar-rank"
                  :title="pillar.rank || ''"
                >{{ rankMark(pillar.rank) }}</span>
              </li>
            </ul>
            <p class="cs-start">
              <span class="is-hp">{{ shown.startingHp }} HP</span>
              <span class="is-mp">{{ shown.startingMp }} MP</span>
              <span class="cs-legend">&#9733; trains every level</span>
            </p>
          </section>

          <section
            class="cs-panel"
           
          >
            <p class="cs-passive">
              <i class="fad fa-sparkles"></i>
              <span>{{ shown.passive }}</span>
            </p>
            <p class="cs-description">{{ shown.description }}</p>

            <button
              type="button"
              class="cs-more"
              :aria-expanded="showMore"
              @click="toggleMore"
            >
              <i :class="['fas', showMore ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
              {{ showMore ? "Less" : "More about the " + shown.name }}
            </button>

            <div
              v-if="showMore"
              class="cs-more-body"
            >
              <h4 class="cs-subheading">In real life</h4>
              <ul class="cs-lines">
                <li
                  v-for="line in shown.realLife"
                  :key="line"
                >{{ line }}</li>
              </ul>
              <template v-if="shown.growsInto.length">
                <h4 class="cs-subheading">Grows into</h4>
                <ul class="cs-evolutions">
                  <li
                    v-for="evolution in shown.growsInto"
                    :key="evolution.name"
                    class="cs-evolution"
                    :style="crestStyle(evolution.name)"
                  >
                    <i :class="['fad', evolution.icon, 'cs-evolution-crest']"></i>
                    <span class="cs-evolution-name">{{ evolution.name }}</span>
                    <span class="cs-evolution-need">{{ evolution.requirement }}</span>
                    <i
                      v-if="evolution.met"
                      class="fad fa-check-circle cs-evolution-met"
                      title="Ready"
                    ></i>
                  </li>
                </ul>
              </template>
            </div>
          </section>
        </div>
      </ion-content>

      <!-- The roster of this tier and the one button, under the thumb -->
      <footer class="cs-dock">
        <div
          ref="rail"
          class="cs-rail"
          role="group"
          aria-label="Classes"
        >
          <button
            v-for="entry in tierEntries"
            :key="entry.name"
            type="button"
            class="cs-crest"
            :class="{
              'is-selected': entry.name === shown?.name,
              'is-sealed': entry.sealed,
              'is-yours': entry.name === currentName,
            }"
            :style="crestStyle(entry.name)"
            :data-class="entry.name"
            :aria-pressed="entry.name === shown?.name"
            :aria-label="entry.sealed ? `${entry.name}, sealed` : entry.name"
            @click="pick(entry)"
          >
            <span class="cs-crest-badge">
              <i :class="['fad', entry.icon]"></i>
              <i
                v-if="entry.sealed"
                class="fad fa-lock cs-crest-mark"
              ></i>
              <i
                v-else-if="entry.name === currentName"
                class="fad fa-check-circle cs-crest-mark is-yours"
              ></i>
            </span>
          </button>
        </div>

        <button
          type="button"
          class="cs-confirm"
          :class="{ 'is-sealed': shown?.sealed, 'is-current': isCurrent }"
          :disabled="isCurrent || !shown"
          data-cy="class-confirm"
          @click="askConfirm"
        >
          <i :class="['fad', confirmIcon]"></i>
          {{ confirmLabel }}
        </button>
      </footer>

      <!-- The confirm step: an RPG dialog over the dock -->
      <div
        v-if="confirming && shown"
        class="cs-dialog-backdrop"
        @click.self="cancelConfirm"
      >
        <div
          class="cs-dialog"
         
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="cs-dialog-title"
          data-cy="class-confirm-dialog"
        >
          <i :class="['fad', shown.icon, 'cs-dialog-crest']"></i>
          <p
            id="cs-dialog-title"
            class="cs-dialog-title"
          >Become a {{ shown.name }}?</p>
          <p class="cs-dialog-text">
            <template v-if="currentName">Your {{ currentName }} levels stay yours, so you can switch back any time.</template>
            <template v-else>You can switch classes any time.</template>
          </p>
          <div class="cs-dialog-actions">
            <button
              ref="yesButton"
              type="button"
              class="cs-choice is-yes"
              data-cy="class-confirm-yes"
              @click="confirm"
            >Yes</button>
            <button
              type="button"
              class="cs-choice"
              data-cy="class-confirm-no"
              @click="cancelConfirm"
            >Not yet</button>
          </div>
        </div>
      </div>

      <!-- The celebration: a flash, rays and the new emblem. Tap to skip. -->
      <div
        v-if="celebrating && celebrated"
        class="cs-celebration"
        data-cy="class-celebration"
        @click="finishCelebration"
      >
        <span class="cs-flash"></span>
        <span class="cs-rays"></span>
        <span
          v-for="n in 10"
          :key="n"
          class="cs-spark"
          :style="{ '--i': n }"
        ></span>
        <i :class="['fad', celebrated.icon, 'cs-celebration-emblem']"></i>
        <p class="cs-celebration-text">You are now a<br /><strong>{{ celebrated.name }}!</strong></p>
      </div>
    </div>
  </ion-modal>
</template>

<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
  import { IonModal, IonContent } from "@ionic/vue";
  import XpCloseButton from "@/components/atoms/CloseButton/XpCloseButton.vue";
  import { play$fx } from "@/assets/fx";
  import { useGameStore } from "@/lib/store/stores/game";
  import { classCodex, type ClassCodexEntry, type PillarRank } from "@/lib/services/stats/ClassCodex";
  import { canonicalClassName, classLevelsOf } from "@/lib/services/stats/ClassPassives";

  /**
   * Choose Your Class: a full-screen class select, opened from the hero sheet and from the class crest in the
   * equipment dock. Tier tabs on top, a stage with the emblem (swipe or the arrows to browse), the five pillars as
   * bars, and the roster and one button in the dock. Changing class asks once, then celebrates; the host saves the
   * pick on `chosen` and closes the screen on `close`. The rules come from the pure module ClassCodex.ts.
   */
  const props = defineProps<{
    isOpen: boolean;
    /** The hero: `jobClass` and `stats.classes` ({ [name]: { level } }). */
    user?: { jobClass?: string; stats?: { classes?: Record<string, { level?: number } | undefined> } } | null;
    /** The hero's picture, shown on the pedestal of their own class. */
    portrait?: string;
  }>();

  const emit = defineEmits<{
    (e: "close"): void;
    (e: "chosen", name: string): void;
  }>();

  const gameStore = useGameStore();
  const skin = computed(() => (gameStore.fabStyle === "retro" ? "retro" : "modern"));

  // One tint per class (all at least 4.5:1 on the dark purple)
  const CREST_RGB: Record<string, [number, number, number]> = {
    Warrior: [255, 82, 82],
    Mage: [64, 196, 255],
    Thief: [105, 240, 174],
    Monk: [255, 215, 64],
    Knight: [125, 165, 220],
    Berserker: [230, 45, 60],
    "White Mage": [250, 235, 190],
    "Black Mage": [160, 110, 255],
    Assassin: [150, 165, 188],
    Ranger: [85, 190, 95],
    "Martial Artist": [255, 176, 20],
    Mystic: [35, 200, 188],
    Paladin: [255, 160, 90],
    Ninja: [196, 140, 255],
    Sage: [130, 230, 215],
  };
  const crestStyle = (name?: string) => {
    const [r, g, b] = (name && CREST_RGB[name]) || [247, 232, 168];
    return { "--crest": `rgb(${r}, ${g}, ${b})`, "--crest-rgb": `${r}, ${g}, ${b}` };
  };

  const tierLabel = (tier: ClassCodexEntry["tier"]) => {
    const isCrown = tier === 3;
    if (isCrown) return "Crown class";
    const isAdvanced = tier === 2;
    if (isAdvanced) return "Advanced class";
    return "Base class";
  };

  const RANK_MARKS: Record<PillarRank, string> = { Primary: "★★★", Secondary: "★★", Tertiary: "★" };
  const rankMark = (rank: PillarRank | null) => (rank ? RANK_MARKS[rank] : "");

  const entries = computed<ClassCodexEntry[]>(() => classCodex(classLevelsOf(props.user?.stats?.classes)));
  const currentName = computed(() => {
    const name = canonicalClassName(props.user?.jobClass);
    return entries.value.some((entry) => entry.name === name) ? name : "";
  });

  const TIER_NAMES: Record<number, string> = { 1: "Base", 2: "Advanced", 3: "Crown" };
  const tiers = computed(() =>
    [1, 2, 3].map((id) => {
      const inTier = entries.value.filter((entry) => entry.tier === id);
      return { id, label: TIER_NAMES[id], total: inTier.length, open: inTier.filter((entry) => !entry.sealed).length };
    })
  );

  const activeTier = ref(1);
  const selectedName = ref("");
  const direction = ref<"left" | "right" | "none">("none");
  const tierEntries = computed(() => entries.value.filter((entry) => entry.tier === activeTier.value));
  const shown = computed<ClassCodexEntry | null>(
    () => tierEntries.value.find((entry) => entry.name === selectedName.value) ?? tierEntries.value[0] ?? null
  );
  const isCurrent = computed(() => !!shown.value && shown.value.name === currentName.value);

  const showMore = ref(false);
  const confirming = ref(false);
  const celebrating = ref(false);
  const celebrated = ref<ClassCodexEntry | null>(null);
  const shaking = ref(false);

  const rail = ref<HTMLElement | null>(null);
  const content = ref<{ $el?: { scrollToTop?: (duration?: number) => void } } | null>(null);
  const yesButton = ref<HTMLButtonElement | null>(null);

  const prefersReducedMotion = () =>
    typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  /** Scroll the rail so the shown crest sits in the middle. Done by hand: scrollIntoView would also move the page. */
  const centerRail = async (smooth = false) => {
    await nextTick();
    const strip = rail.value;
    const crest = strip?.querySelector<HTMLElement>(`[data-class="${shown.value?.name}"]`);
    const hasNothingToCenter = !strip || !crest || typeof strip.scrollTo !== "function";
    if (hasNothingToCenter) return;
    strip.scrollTo({
      left: crest.offsetLeft - (strip.clientWidth - crest.offsetWidth) / 2,
      behavior: smooth && !prefersReducedMotion() ? "smooth" : "auto",
    });
  };

  const show = (name: string, towards: "left" | "right" | "none") => {
    direction.value = towards;
    selectedName.value = name;
    showMore.value = false;
    content.value?.$el?.scrollToTop?.(0);
    void centerRail(true);
  };

  /** Browse within the tier, wrapping round at the ends. */
  const step = (by: number) => {
    const list = tierEntries.value;
    if (list.length < 2) return;
    const at = Math.max(0, list.findIndex((entry) => entry.name === shown.value?.name));
    const next = list[(at + by + list.length) % list.length];
    play$fx("cursor");
    show(next.name, by > 0 ? "right" : "left");
  };

  const pick = (entry: ClassCodexEntry) => {
    const isShown = entry.name === shown.value?.name;
    if (isShown) return;
    const list = tierEntries.value;
    const from = list.findIndex((candidate) => candidate.name === shown.value?.name);
    const to = list.findIndex((candidate) => candidate.name === entry.name);
    play$fx("cursor");
    show(entry.name, to > from ? "right" : "left");
  };

  const pickTier = (id: number) => {
    if (id === activeTier.value) return;
    play$fx("cursor");
    activeTier.value = id;
    const first = tierEntries.value[0];
    show(first?.name ?? "", "none");
  };

  const toggleMore = () => {
    play$fx(showMore.value ? "closeMenu" : "openMenu");
    showMore.value = !showMore.value;
  };

  // Swipe: a mostly-sideways drag of 48px or more pages the stage
  let touchStart: { x: number; y: number } | null = null;
  const onTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0];
    touchStart = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };
  const onTouchEnd = (event: TouchEvent) => {
    const touch = event.changedTouches[0];
    const start = touchStart;
    touchStart = null;
    if (!touch || !start) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const isSwipe = Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.5;
    if (isSwipe) step(dx < 0 ? 1 : -1);
  };

  const confirmLabel = computed(() => {
    const entry = shown.value;
    if (!entry) return "";
    if (entry.sealed) return `Sealed · ${entry.requirement}`;
    if (isCurrent.value) return "This is your class";
    return `Become a ${entry.name}`;
  });
  const confirmIcon = computed(() => {
    if (shown.value?.sealed) return "fa-lock";
    return isCurrent.value ? "fa-check-circle" : "fa-sparkles";
  });

  const shake = () => {
    shaking.value = false;
    void nextTick(() => {
      shaking.value = true;
      window.setTimeout(() => (shaking.value = false), 400);
    });
  };

  const askConfirm = async () => {
    const entry = shown.value;
    if (!entry || isCurrent.value) return;
    if (entry.sealed) {
      play$fx("no");
      shake();
      return;
    }
    play$fx("select");
    confirming.value = true;
    await nextTick();
    yesButton.value?.focus();
  };

  const cancelConfirm = () => {
    play$fx("closeMenu");
    confirming.value = false;
  };

  let celebrationTimer: number | undefined;
  const finishCelebration = () => {
    window.clearTimeout(celebrationTimer);
    celebrationTimer = undefined;
    const wasCelebrating = celebrating.value;
    if (wasCelebrating) emit("close");
  };

  const confirm = () => {
    const entry = shown.value;
    const isBlocked = !entry || entry.sealed || isCurrent.value;
    if (isBlocked) return;
    confirming.value = false;
    play$fx("levelUp");
    emit("chosen", entry.name);
    celebrated.value = entry;
    celebrating.value = true;
    celebrationTimer = window.setTimeout(finishCelebration, prefersReducedMotion() ? 1200 : 2200);
  };

  const close = () => {
    play$fx("closeMenu");
    emit("close");
  };

  const onDismiss = () => {
    window.clearTimeout(celebrationTimer);
    celebrationTimer = undefined;
    celebrating.value = false;
    confirming.value = false;
    emit("close");
  };

  // Arrow keys browse, Enter asks, Escape backs out of the confirm step
  const onKey = (event: KeyboardEvent) => {
    if (celebrating.value) return;
    if (confirming.value) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        cancelConfirm();
      }
      return;
    }
    if (event.key === "ArrowRight") step(1);
    else if (event.key === "ArrowLeft") step(-1);
  };

  // Each time the screen opens it starts on the hero's own class, in its tier
  watch(
    () => props.isOpen,
    (open) => {
      if (typeof document !== "undefined") {
        document.removeEventListener("keydown", onKey, true);
        if (open) document.addEventListener("keydown", onKey, true);
      }
      if (!open) return;
      const own = entries.value.find((entry) => entry.name === currentName.value);
      activeTier.value = own?.tier ?? 1;
      direction.value = "none";
      selectedName.value = own?.name ?? "";
      showMore.value = false;
      confirming.value = false;
      celebrating.value = false;
      celebrated.value = null;
      void centerRail();
    },
    { immediate: true }
  );

  onBeforeUnmount(() => {
    window.clearTimeout(celebrationTimer);
    if (typeof document !== "undefined") document.removeEventListener("keydown", onKey, true);
  });
</script>

<style lang="scss" scoped src="./_XpClassCodex.scss" />
