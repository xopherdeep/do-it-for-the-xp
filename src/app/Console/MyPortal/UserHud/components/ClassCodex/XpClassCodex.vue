<template>
  <ion-modal
    :is-open="isOpen"
    class="class-codex-modal"
    @didPresent="centerRail()"
    @didDismiss="emit('close')"
  >
    <!-- The RPG box lives on the app bar only; the page below stays light -->
    <ion-header class="ion-no-border">
      <ion-toolbar class="rpg-box codex-toolbar">
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
    <ion-content ref="content" class="bg-slide bg-slide-equipment codex-content">
      <div
        v-if="shown"
        :key="shown.name"
        class="codex-page"
        :style="crestStyle(shown.name)"
      >
        <section class="codex-hero">
          <div class="codex-crest">
            <i :class="['fad', shown.icon, 'fa-4x']"></i>
          </div>
          <h2 class="codex-name">{{ shown.name }}</h2>
          <p class="codex-creed">&ldquo;{{ shown.creed }}&rdquo;</p>
          <div class="codex-chips">
            <span class="codex-chip">{{ tierLabel(shown.tier) }}</span>
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

        <section class="codex-section">
          <h3 class="codex-heading"><i class="fad fa-dungeon"></i> In the game</h3>
          <div class="codex-body">
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
          </div>
        </section>

        <section class="codex-section">
          <h3 class="codex-heading"><i class="fad fa-clipboard-check"></i> In real life</h3>
          <div class="codex-body">
            <ul class="codex-lines">
              <li
                v-for="line in shown.realLife"
                :key="line"
              >{{ line }}</li>
            </ul>
          </div>
        </section>

        <section
          v-if="shown.growsInto.length"
          class="codex-section"
        >
          <h3 class="codex-heading"><i class="fad fa-crown"></i> Grows into</h3>
          <div class="codex-body">
            <ul class="codex-evolutions">
              <li
                v-for="evolution in shown.growsInto"
                :key="evolution.name"
                class="codex-evolution"
                :style="crestStyle(evolution.name)"
              >
                <i :class="['fad', evolution.icon, 'fa-2x', 'evolution-crest']"></i>
                <span class="evolution-text">
                  <span class="evolution-name">{{ evolution.name }}</span>
                  <span
                    v-if="evolution.with"
                    class="evolution-with"
                  >with {{ evolution.with }}</span>
                  <span class="evolution-need">{{ evolution.requirement }}</span>
                </span>
                <i
                  v-if="evolution.met"
                  class="fad fa-check-circle evolution-met"
                  title="Ready"
                ></i>
              </li>
            </ul>
          </div>
        </section>

        <section
          v-if="shown.tier >= 2"
          class="codex-section"
        >
          <h3 class="codex-heading"><i class="fad fa-lock"></i> Unlocks when</h3>
          <div class="codex-body">
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
          </div>
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

  // The class colours of the old picker (JobClassSelector) for the four base classes, one tint of its own per advanced
  // class (all at least 4.5:1 on the dark purple checker)
  const CREST_RGB: Record<string, [number, number, number]> = {
    Warrior: [255, 82, 82],
    Mage: [64, 196, 255],
    Thief: [105, 240, 174],
    Monk: [255, 215, 64],
    Knight: [125, 165, 220], // steel blue
    Berserker: [230, 45, 60], // blood red
    "White Mage": [250, 235, 190], // ivory and gold
    "Black Mage": [160, 110, 255], // violet
    Assassin: [150, 165, 188], // slate
    Ranger: [85, 190, 95], // forest green
    "Martial Artist": [255, 176, 20], // amber
    Mystic: [35, 200, 188], // teal
    Paladin: [255, 160, 90],
    Ninja: [196, 140, 255],
    Sage: [130, 230, 215],
  };
  const crestStyle = (name: string) => {
    const [r, g, b] = CREST_RGB[name] ?? [247, 232, 168];
    return { "--crest": `rgb(${r}, ${g}, ${b})`, "--crest-rgb": `${r}, ${g}, ${b}` };
  };

  const tierLabel = (tier: ClassCodexEntry["tier"]) => {
    const isCrown = tier === 3;
    if (isCrown) return "Crown class";
    const isAdvanced = tier === 2;
    if (isAdvanced) return "Advanced class";
    return "Base class";
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
    const hasNothingToCenter = !strip || !crest;
    if (hasNothingToCenter) return;
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
    const isSealed = entry.sealed;
    const isShown = entry.name === shown.value?.name;
    if (isSealed) play$fx("no");
    else if (!isShown) play$fx("cursor");
    if (isShown) return;
    selectedName.value = entry.name;
    content.value?.$el?.scrollToTop?.(0);
    void centerRail(true);
  };

  const confirmDisabled = computed(() => !shown.value || shown.value.sealed || isCurrent.value);
  const confirmLabel = computed(() => {
    const entry = shown.value;
    if (!entry) return "";
    const isSealed = entry.sealed;
    if (isSealed) return `Sealed · ${entry.requirement}`;
    if (isCurrent.value) return "This is your class";
    return `Become a ${entry.name}`;
  });
  const confirmIcon = computed(() => {
    const isSealed = shown.value?.sealed;
    if (isSealed) return "fa-lock";

    return isCurrent.value ? "fa-check-circle" : "fa-sparkles";
  });

  const confirm = () => {
    const isConfirmBlocked = confirmDisabled.value || !shown.value;
    if (isConfirmBlocked) return;
    play$fx("select");
    emit("chosen", shown.value.name);
    emit("close");
  };
</script>

<style lang="scss" scoped src="./_XpClassCodex.scss" />
