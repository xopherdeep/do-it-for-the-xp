<template>
  <ion-modal
    :is-open="isOpen"
    class="class-codex-modal"
    @didPresent="centerRail()"
    @didDismiss="onDismiss"
  >
    <div
      class="cs-screen"
      :class="`is-${skin}`"
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

          <xp-class-details
            :key="shown.name"
            :entry="shown"
            :skin="skin"
          />
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

      <xp-class-confirm
        v-if="overlayEntry"
        :mode="overlay"
        :entry="overlayEntry"
        :current-name="currentName"
        :skin="skin"
        @confirm="confirm"
        @cancel="cancelConfirm"
        @done="finishCelebration"
      />
    </div>
  </ion-modal>
</template>

<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
  import { IonModal, IonContent } from "@ionic/vue";
  import XpCloseButton from "@/components/atoms/CloseButton/XpCloseButton.vue";
  import { play$fx } from "@/assets/fx";
  import { useGameStore } from "@/lib/store/stores/game";
  import { classCodex, type ClassCodexEntry } from "@/lib/services/stats/ClassCodex";
  import { canonicalClassName, classLevelsOf } from "@/lib/services/stats/ClassPassives";
  import XpClassDetails from "./XpClassDetails.vue";
  import XpClassConfirm from "./XpClassConfirm.vue";
  import { crestStyle } from "./classCrest";

  /**
   * Choose Your Class: a full-screen class select, opened from the hero sheet and from the class crest in the
   * equipment dock. Tier tabs on top, a stage with the emblem (swipe, the arrows or the arrow keys to browse), the
   * pillars and Codex lines (XpClassDetails), and the roster and one button in the dock. Changing class asks once,
   * then celebrates (XpClassConfirm); the host saves the pick on `chosen` and closes the screen on `close`.
   * The rules come from the pure module ClassCodex.ts.
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

  type Direction = "left" | "right" | "none";
  type Overlay = "ask" | "celebrate" | "none";

  const gameStore = useGameStore();
  const skin = computed(() => (gameStore.fabStyle === "retro" ? "retro" : "modern"));

  const TIER_NAMES: Record<number, string> = { 1: "Base", 2: "Advanced", 3: "Crown" };
  const TIER_LABELS: Record<ClassCodexEntry["tier"], string> = { 1: "Base class", 2: "Advanced class", 3: "Crown class" };
  const tierLabel = (tier: ClassCodexEntry["tier"]) => TIER_LABELS[tier];
  const SWIPE_MIN_PX = 48;

  const entries = computed<ClassCodexEntry[]>(() => classCodex(classLevelsOf(props.user?.stats?.classes)));
  const currentName = computed(() => {
    const name = canonicalClassName(props.user?.jobClass);
    const isKnownClass = entries.value.some((entry) => entry.name === name);
    return isKnownClass ? name : "";
  });

  const tiers = computed(() =>
    [1, 2, 3].map((id) => {
      const inTier = entries.value.filter((entry) => entry.tier === id);
      return { id, label: TIER_NAMES[id], total: inTier.length, open: inTier.filter((entry) => !entry.sealed).length };
    })
  );

  const activeTier = ref(1);
  const selectedName = ref("");
  const direction = ref<Direction>("none");
  const tierEntries = computed(() => entries.value.filter((entry) => entry.tier === activeTier.value));
  const shown = computed<ClassCodexEntry | null>(
    () => tierEntries.value.find((entry) => entry.name === selectedName.value) ?? tierEntries.value[0] ?? null
  );
  const isCurrent = computed(() => !!shown.value && shown.value.name === currentName.value);

  const overlay = ref<Overlay>("none");
  const celebrated = ref<ClassCodexEntry | null>(null);
  const overlayEntry = computed(() => (overlay.value === "celebrate" ? celebrated.value : shown.value));
  const shaking = ref(false);

  const rail = ref<HTMLElement | null>(null);
  const content = ref<{ $el?: { scrollToTop?: (duration?: number) => void } } | null>(null);

  const prefersReducedMotion = () =>
    typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  /** Scroll the rail so the shown crest sits in the middle. Done by hand: scrollIntoView would also move the page. */
  const centerRail = async (smooth = false) => {
    await nextTick();
    const strip = rail.value;
    const crest = strip?.querySelector<HTMLElement>(`[data-class="${shown.value?.name}"]`);
    const cannotScroll = !strip || !crest || typeof strip.scrollTo !== "function";
    if (cannotScroll) return;
    const animate = smooth && !prefersReducedMotion();
    strip.scrollTo({ left: crest.offsetLeft - (strip.clientWidth - crest.offsetWidth) / 2, behavior: animate ? "smooth" : "auto" });
  };

  const show = (name: string, towards: Direction) => {
    direction.value = towards;
    selectedName.value = name;
    content.value?.$el?.scrollToTop?.(0);
    void centerRail(true);
  };

  const indexIn = (list: ClassCodexEntry[], name?: string) => list.findIndex((entry) => entry.name === name);

  /** Browse within the tier, wrapping round at the ends. */
  const step = (by: number) => {
    const list = tierEntries.value;
    const hasNowhereToGo = list.length < 2;
    if (hasNowhereToGo) return;
    const at = Math.max(0, indexIn(list, shown.value?.name));
    const next = list[(at + by + list.length) % list.length];
    play$fx("cursor");
    show(next.name, by > 0 ? "right" : "left");
  };

  const pick = (entry: ClassCodexEntry) => {
    const isShown = entry.name === shown.value?.name;
    if (isShown) return;
    const list = tierEntries.value;
    const goesRight = indexIn(list, entry.name) > indexIn(list, shown.value?.name);
    play$fx("cursor");
    show(entry.name, goesRight ? "right" : "left");
  };

  const pickTier = (id: number) => {
    const isActive = id === activeTier.value;
    if (isActive) return;
    play$fx("cursor");
    activeTier.value = id;
    show(tierEntries.value[0]?.name ?? "", "none");
  };

  // Swipe: a mostly-sideways drag of SWIPE_MIN_PX or more pages the stage
  let touchStart: { x: number; y: number } | null = null;
  const onTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0];
    touchStart = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };
  const onTouchEnd = (event: TouchEvent) => {
    const touch = event.changedTouches[0];
    const start = touchStart;
    touchStart = null;
    const hasNoDrag = !touch || !start;
    if (hasNoDrag) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const isSwipe = Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * 1.5;
    if (isSwipe) step(dx < 0 ? 1 : -1);
  };

  /** What the dock button says and shows: sealed, already yours, or ready. */
  const stateOf = (entry: ClassCodexEntry | null, current: boolean): string => {
    if (!entry) return "none";
    const isSealed = entry.sealed;
    if (isSealed) return "sealed";
    return current ? "current" : "ready";
  };
  const buttonState = computed(() => ({ state: stateOf(shown.value, isCurrent.value), entry: shown.value }));
  const confirmLabel = computed(() => {
    const { state, entry } = buttonState.value;
    const labels: Record<string, string> = {
      none: "",
      sealed: `Sealed · ${entry?.requirement ?? ""}`,
      current: "This is your class",
      ready: `Become a ${entry?.name ?? ""}`,
    };
    return labels[state];
  });
  const CONFIRM_ICONS: Record<string, string> = { none: "", sealed: "fa-lock", current: "fa-check-circle", ready: "fa-sparkles" };
  const confirmIcon = computed(() => CONFIRM_ICONS[buttonState.value.state]);

  const shake = () => {
    shaking.value = false;
    void nextTick(() => {
      shaking.value = true;
      window.setTimeout(() => (shaking.value = false), 400);
    });
  };

  /** The dock button: a sealed class buzzes and shakes, a ready one opens the confirm step. */
  const askConfirm = () => {
    const { state } = buttonState.value;
    const isSealed = state === "sealed";
    if (isSealed) {
      play$fx("no");
      shake();
    }
    const isReady = state === "ready";
    if (!isReady) return;
    play$fx("select");
    overlay.value = "ask";
  };

  const cancelConfirm = () => {
    play$fx("closeMenu");
    overlay.value = "none";
  };

  const confirm = () => {
    const entry = shown.value;
    const isReady = buttonState.value.state === "ready";
    const isBlocked = !entry || !isReady;
    if (isBlocked) return;
    play$fx("levelUp");
    emit("chosen", entry.name);
    celebrated.value = entry;
    overlay.value = "celebrate";
  };

  const finishCelebration = () => {
    const wasCelebrating = overlay.value === "celebrate";
    overlay.value = "none";
    if (wasCelebrating) emit("close");
  };

  const close = () => {
    play$fx("closeMenu");
    emit("close");
  };

  const onDismiss = () => {
    overlay.value = "none";
    emit("close");
  };

  // Arrow keys browse; Escape backs out of the confirm step
  const KEY_STEPS: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };
  const onKey = (event: KeyboardEvent) => {
    const isAsking = overlay.value === "ask";
    const isBackingOut = isAsking && event.key === "Escape";
    if (isBackingOut) {
      event.preventDefault();
      event.stopPropagation();
      cancelConfirm();
    }
    const by = KEY_STEPS[event.key];
    const isBrowsing = overlay.value === "none" && !!by;
    if (isBrowsing) step(by);
  };

  const listenToKeys = (on: boolean) => {
    const hasNoDocument = typeof document === "undefined";
    if (hasNoDocument) return;
    document.removeEventListener("keydown", onKey, true);
    if (on) document.addEventListener("keydown", onKey, true);
  };

  // Each time the screen opens it starts on the hero's own class, in its tier
  watch(
    () => props.isOpen,
    (open) => {
      listenToKeys(open);
      if (!open) return;
      const own = entries.value.find((entry) => entry.name === currentName.value);
      activeTier.value = own?.tier ?? 1;
      direction.value = "none";
      selectedName.value = own?.name ?? "";
      overlay.value = "none";
      celebrated.value = null;
      void centerRail();
    },
    { immediate: true }
  );

  onBeforeUnmount(() => listenToKeys(false));
</script>

<style lang="scss" scoped src="./_XpClassCodex.scss" />
