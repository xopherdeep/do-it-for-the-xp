<template>
  <ion-modal
    :is-open="open"
    class="beast-card-modal"
    :class="rootClass"
    :style="rootStyle"
    :breakpoints="[0, 1]"
    :initial-breakpoint="1"
    @didPresent="startBackdrop"
    @didDismiss="onDidDismiss"
  >
    <ion-header>
      <ion-toolbar>
        <xp-app-header title="Bestiary" icon="dragon" :meta="tier.label">
          <template #end>
            <xp-close-button size="lg" color="light" aria-label="Close" @click="close" />
          </template>
        </xp-app-header>
      </ion-toolbar>
    </ion-header>

    <ion-content class="beast-card" :scroll-y="true">
      <!-- The beast on its battle backdrop -->
      <section class="beast-hero" :class="`beast-hero--${tier.tier}`" :aria-label="`${heading}, ${tier.label}`">
        <canvas ref="backdrop" class="beast-hero__backdrop" aria-hidden="true"></canvas>
        <img v-if="portrait" class="beast-hero__portrait" :src="portrait" :alt="heading" draggable="false" />
        <i v-else class="fad fa-dragon beast-hero__placeholder" aria-hidden="true"></i>
        <span class="beast-hero__tier" :data-tier="tier.tier">
          <i :class="['fad', `fa-${tier.icon}`]" aria-hidden="true"></i>
          {{ tier.label }}
        </span>
        <span v-if="stateChip" class="beast-hero__state" :class="`is-${status}`">{{ stateChip }}</span>
      </section>

      <div class="beast-plate">
        <h2 class="beast-plate__name">{{ heading }}</h2>
        <p v-if="subheading" class="beast-plate__sub">{{ subheading }}</p>
      </div>

      <!-- The bestiary entry: tier, theme, due clock, kill count, grudge -->
      <div class="beast-facts">
        <div v-if="theme" class="beast-fact">
          <i class="fad fa-map-marked-alt" aria-hidden="true"></i>
          <span>{{ theme }}</span>
        </div>
        <div v-if="clock" class="beast-fact" :class="{ 'is-overdue': status === 'overdue' }" data-test="due-clock">
          <i class="fad fa-alarm-clock" aria-hidden="true"></i>
          <span>{{ clock }}</span>
        </div>
        <div class="beast-fact" data-test="tamed-line">
          <i class="fad fa-trophy" aria-hidden="true"></i>
          <span>{{ tamedText }}</span>
        </div>
        <div v-if="grudge.length" class="beast-fact beast-fact--grudge" data-test="grudge">
          <span class="beast-grudge" aria-hidden="true">
            <i
              v-for="(lit, index) in grudge"
              :key="index"
              :class="['fad', 'fa-skull', { 'is-lit': lit }]"
            ></i>
          </span>
          <span>{{ grudgeText }}</span>
        </div>
        <div class="beast-rewards">
          <xp-app-chip v-if="rewards.xp" kind="xp" :value="rewards.xp" />
          <xp-app-chip v-if="rewards.gp" kind="gp" :value="rewards.gp" />
          <xp-app-chip v-if="rewards.ap" kind="ap" :value="rewards.ap" />
          <xp-app-chip v-if="quest.requiresApproval" kind="tag" value="GM approves" />
        </div>
      </div>

      <!-- The checklist: the battle's own attacks, checked off here or in the fight -->
      <xp-app-section
        v-if="ready"
        :label="progress"
        class="beast-steps"
        :class="{ 'is-complete': listReady, 'is-just-complete': justCompleted }"
      >
        <xp-app-row
          v-for="step in shownSteps"
          :key="step.id"
          class="beast-step"
          :class="[{ 'is-checked': step.checked }, tapClass(step)]"
          :title="step.name"
          :chevron="false"
          role="checkbox"
          :aria-checked="step.checked ? 'true' : 'false'"
          :data-step-id="step.id"
          @click="onStep(step)"
        >
          <template #leading>
            <i
              :class="['fad', step.checked ? 'fa-check-square' : 'fa-square', 'beast-step__box']"
              aria-hidden="true"
            ></i>
            <span v-if="isJustChecked(step)" class="beast-step__spark" aria-hidden="true">
              <i></i><i></i><i></i><i></i>
            </span>
          </template>
        </xp-app-row>
      </xp-app-section>
      <p v-else class="beast-loading">{{ t("beastCard.loading") }}</p>

      <p v-if="actions.note" class="beast-note" data-test="state-note">
        <span>{{ actions.note }}</span>
        <xp-speak-button :text="actions.note" />
      </p>
    </ion-content>

    <!-- Controls stay in thumb reach: Hunt and Claim sit at the bottom of the sheet -->
    <ion-footer class="beast-footer">
      <div class="beast-bar">
        <template v-if="actions.showButtons">
          <p class="beast-bar__hint">
            <span>{{ hint }}</span>
            <xp-speak-button :text="hint" />
          </p>
          <div class="beast-bar__buttons">
            <button
              type="button"
              class="xp-app-btn beast-btn beast-btn--hunt"
              data-test="hunt"
              :disabled="!ready || !actions.canHunt"
              @click="hunt"
            >
              <i class="fad fa-swords" aria-hidden="true"></i>
              <span class="beast-btn__text">
                <span class="beast-btn__label">Hunt</span>
                <small class="beast-btn__sub" data-test="hunt-bonus">{{ bonusLabel }}</small>
              </span>
            </button>
            <button
              type="button"
              class="xp-app-btn xp-app-btn--ghost beast-btn beast-btn--claim"
              :class="{ 'is-ready': actions.canClaim, 'is-just-ready': justCompleted }"
              data-test="claim"
              :disabled="!ready || !actions.canClaim || claiming"
              @click="claim"
            >
              <i class="fad fa-check-double" aria-hidden="true"></i>
              <span class="beast-btn__text">
                <span class="beast-btn__label">Claim</span>
              </span>
            </button>
          </div>
        </template>
        <button v-else type="button" class="xp-app-btn xp-app-btn--ghost beast-btn" @click="close">
          <i class="fad fa-door-open" aria-hidden="true"></i>
          <span class="beast-btn__text"><span class="beast-btn__label">Close</span></span>
        </button>
      </div>
    </ion-footer>
  </ion-modal>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { IonContent, IonFooter, IonHeader, IonModal, IonToolbar, toastController } from "@ionic/vue";
import { useRouter } from "vue-router";
import { play$fx } from "@/assets/fx";
import XpCloseButton from "@/components/atoms/CloseButton/XpCloseButton.vue";
import XpSpeakButton from "@/components/atoms/SpeakButton/XpSpeakButton.vue";
import XpAppChip from "@/components/organisms/XpApp/XpAppChip.vue";
import XpAppHeader from "@/components/organisms/XpApp/XpAppHeader.vue";
import XpAppRow from "@/components/organisms/XpApp/XpAppRow.vue";
import XpAppSection from "@/components/organisms/XpApp/XpAppSection.vue";
import { useAppSkin } from "@/components/organisms/XpApp/useAppSkin";
import { beastPortraitUrl } from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/components/beastPortrait";
import { questBattleRoute } from "@/app/Console/BattleField/battle/battleContext";
import { clearBattleProgress, loadBattleProgress, saveBattleProgress } from "@/app/Console/BattleField/battle/battleProgress";
import { useTimers } from "@/hooks/useTimers";
import { useCopy, useReadAloud, useVoice } from "@/hooks/useVoice";
import { backgroundManager } from "@/lib/engine/core/BackgroundManager";
import { achievementCategoryStorage, AchievementCategoryDb } from "@/lib/databases/AchievementDb";
import type { Achievement } from "@/lib/databases/AchievementDb";
import { BestiaryDb, beastStorage } from "@/lib/databases/BestiaryDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import { getQuestLogDb } from "@/lib/databases/QuestLogDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { grudgeLabel, marksFor } from "@/lib/services/battle/questGrudge";
import { checkClaimWindow } from "@/lib/services/quests/QuestClaimGuard";
import { completeQuest, questRewards } from "@/lib/services/quests/QuestCompletionService";
import type { CompletionResult } from "@/lib/services/quests/QuestCompletionService";
import { useUserStore } from "@/lib/store/stores/user";
import { formatQuestName } from "@/lib/utils/format";
import debug from "@/lib/utils/debug";
import {
  beastOf,
  cardActions,
  cardFace,
  checkedIds,
  dueClock,
  grudgeSlots,
  hintLine,
  huntBonusLabel,
  huntSteps,
  mergeProgress,
  progressContext,
  progressLine,
  stateWord,
  stepsForState,
  tamedCount,
  tamedLine,
  tapStep,
  themeLine,
  tierBadge,
} from "../beastCard";
import type { BeastCardStatus, CardStep } from "../beastCard";

defineOptions({ name: "xp-beast-card-modal" });

/**
 * The bestiary entry of a quest, as a bottom sheet: tapping a quest in the Beast Log or the Calendar opens it.
 *
 * Top: the beast on its battle backdrop, its tier, the due clock, the grudge it holds and how often the hero tamed it.
 * Middle: the quest's checklist as tappable steps. They are the battle's own attacks and share its progress record
 * (battleProgress), so steps checked here are done when a hunt starts and steps done in the fight read checked here.
 * Bottom: Hunt (the quest fight, the route the quest book's Fight! uses) and Claim (lit when every step is checked;
 * it completes the quest through completeQuest, and a quest that needs approval goes on hold as it always does).
 * A tamed, pending or not-yet-due quest only shows its entry.
 */
const props = withDefaults(
  defineProps<{
    quest: Achievement;
    userId: string | number;
    status: BeastCardStatus;
    /** When the quest is due, for the clock; null for a quest with no time */
    due?: Date | null;
    /** The board's wording of the due time ("6:00pm", "Tomorrow 6:00pm") */
    dueLabel?: string;
  }>(),
  { due: null, dueLabel: "" }
);

const emit = defineEmits<{
  (e: "didDismiss"): void;
}>();

const PAGE_ID = "beast-card";

const router = useRouter();
const userStore = useUserStore();
const timers = useTimers();
const t = useCopy();
const { voice } = useVoice();
const { startAutoReading } = useReadAloud();
// The Quests app skin (purple accent) follows the Retro / Modern toggle; the kit CSS reads it from this root class.
const { rootClass, rootStyle } = useAppSkin("quests");

const backdrop = ref<HTMLCanvasElement | null>(null);
const open = ref(true);
const ready = ref(false);
const claiming = ref(false);

const familyBeasts = ref<Beast[]>([]);
const categoryName = ref("");
const entries = ref<QuestLogEntry[]>([]);
const steps = ref<CardStep[]>([]);
// The step just tapped and how it flipped, for its pop; the whole list lit when the last step fell
const tapped = ref<{ id: string; checked: boolean } | null>(null);
const justCompleted = ref(false);
const TAP_ANIM_MS = 700;
const COMPLETE_ANIM_MS = 1400;
let tapTimer = 0;
let completeTimer = 0;

const isJustChecked = (step: CardStep) => tapped.value?.id === step.id && tapped.value.checked;
const isJustUnchecked = (step: CardStep) => tapped.value?.id === step.id && !tapped.value.checked;
const tapClass = (step: CardStep) => ({ "is-just-checked": isJustChecked(step), "is-just-unchecked": isJustUnchecked(step) });

const heroId = computed(() => String(props.userId));
const ctx = computed(() => progressContext(heroId.value, props.quest.id));

const tier = computed(() => tierBadge(props.quest.difficulty));
const beast = computed(() => beastOf(props.quest, familyBeasts.value));
const face = computed(() => cardFace(beast.value, tier.value.tier));
const questTitle = computed(() => formatQuestName(props.quest.achievementName));

// A quest with a beast is shown as the beast; one without shows its own name and the stand-in that guards it
const heading = computed(() => (face.value.isStandIn ? questTitle.value : face.value.name));
const subheading = computed(() => (face.value.isStandIn ? `Guarded by ${face.value.name}` : questTitle.value));
const portrait = computed(
  () => beastPortraitUrl(face.value.avatar) || face.value.picture || props.quest.localImage || props.quest.imageUrl || ""
);

const theme = computed(() => themeLine(beast.value, categoryName.value));
const rewards = computed(() => questRewards(props.quest));
const clock = computed(() => dueClock(props.status, props.due, props.dueLabel, new Date(), voice.value));
const tamedText = computed(() => tamedLine(tamedCount(entries.value, props.quest.id, heroId.value), voice.value));

const marks = computed(() => marksFor(userStore.getUserById(heroId.value)?.questGrudges, props.quest.id));
const grudge = computed(() => grudgeSlots(marks.value));
const grudgeText = computed(() => grudgeLabel(marks.value));

const stateChip = computed(() => stateWord(props.status, voice.value));

const shownSteps = computed(() => stepsForState(props.status, steps.value));
const progress = computed(() => progressLine(shownSteps.value));
const actions = computed(() => cardActions(props.status, steps.value, voice.value));
const listReady = computed(() => actions.value.canClaim);
// Every quest earns it by winning its fight; a Game Master's approval pays it on top, once (a claim never does)
const bonusLabel = huntBonusLabel();

const hint = computed(() => hintLine(actions.value.canClaim, voice.value));

const say = async (header: string, message?: string, duration = 2200) => {
  try {
    const toast = await toastController.create({
      header,
      message,
      duration,
      position: "middle",
      buttons: [{ text: "Close", role: "cancel" }],
      cssClass: "rpg-toast",
    });
    await toast.present();
  } catch (error) {
    debug.warn("[BeastCard] the toast could not be shown", error);
  }
};

// --- the backdrop: the beast's own battle background, animated by the same engine the fight uses ---
const DEFAULT_BG1 = 219;
const DEFAULT_BG2 = 218;

const startBackdrop = () => {
  const canvas = backdrop.value;
  if (!canvas) return;
  backgroundManager.initBackground({
    canvasElement: canvas,
    bg1: face.value.bg1 ?? DEFAULT_BG1,
    bg2: face.value.bg2 ?? DEFAULT_BG2,
    aspectRatio: 0,
    handleResize: false,
    page: PAGE_ID,
  });
};

const stopBackdrop = () => {
  if (backgroundManager.isActiveFor(PAGE_ID)) backgroundManager.cleanupBackground();
};

// The beast arrives after the sheet opens: repaint the backdrop with its layers
watch(
  () => [face.value.bg1, face.value.bg2],
  () => {
    if (backgroundManager.isActiveFor(PAGE_ID)) void nextTick(startBackdrop);
  }
);

// --- the data: nothing here is a prop, so the Beast Log and the Calendar open the card the same way ---
const load = async () => {
  try {
    const [beasts, categories, log] = await Promise.all([
      new BestiaryDb(beastStorage).getBeasts().catch(() => [] as Beast[]),
      new AchievementCategoryDb(achievementCategoryStorage).getAll().catch(() => [] as unknown[]),
      getQuestLogDb()
        .getEntries()
        .catch(() => [] as QuestLogEntry[]),
    ]);
    familyBeasts.value = beasts;
    entries.value = log;
    const category = (categories as { id?: string; name?: string }[]).find(
      (item) => item && String(item.id) === String(props.quest.categoryId)
    );
    categoryName.value = category?.name ?? "";
  } catch (error) {
    // the entry still opens, with the library's beast and no kill count
    debug.warn("[BeastCard] could not read the bestiary", error);
  }
  steps.value = mergeProgress(huntSteps(props.quest, beast.value), loadBattleProgress(ctx.value));
  ready.value = true;
  // The simple voice reads the card's line aloud when it opens: the hint under the steps, or the note for a quest that
  // can only be looked at
  startAutoReading(actions.value.showButtons ? hint.value : actions.value.note);
};

onMounted(() => {
  void load();
});

onBeforeUnmount(stopBackdrop);

// --- actions ---
const onStep = (step: CardStep) => {
  if (!actions.value.canCheck) return;
  const tap = tapStep(steps.value, step.id);
  const isNotOnTheList = !tap.known;
  if (isNotOnTheList) return;
  steps.value = tap.steps;
  // The fight reads this record when it starts and writes it as its chores fall
  saveBattleProgress(ctx.value, checkedIds(tap.steps));
  play$fx(tap.checked ? "yes" : "no");

  tapped.value = { id: step.id, checked: tap.checked };
  timers.cancel(tapTimer);
  tapTimer = timers.startTimeout(TAP_ANIM_MS, () => {
    tapped.value = null;
  });

  justCompleted.value = false;
  timers.cancel(completeTimer);
  const isStillOpen = !tap.completesList;
  if (isStillOpen) return;
  // The last step: let the check land, then light the list and the Claim button
  void nextTick(() => {
    justCompleted.value = true;
    play$fx("gainGP");
    completeTimer = timers.startTimeout(COMPLETE_ANIM_MS, () => {
      justCompleted.value = false;
    });
  });
};

const close = () => {
  open.value = false;
};

const onDidDismiss = () => {
  stopBackdrop();
  emit("didDismiss");
};

const hunt = () => {
  if (!actions.value.canHunt) return;
  play$fx("yes");
  // Nothing is claimed here: the fight credits the rewards and logs the win
  stopBackdrop();
  emit("didDismiss");
  void router.push(questBattleRoute(heroId.value, String(props.quest.id)));
};

const announce = ({ awaitingApproval, levelUp, paid }: CompletionResult) => {
  const nick = userStore.getUserById(heroId.value)?.name?.nick || "The hero";
  if (awaitingApproval) {
    void say(t("beastCard.toast.sent"), nick);
    return;
  }
  play$fx("select");
  const { xp, gp, ap } = paid ?? rewards.value;
  void say(t("beastCard.toast.tamed", { nick, quest: questTitle.value }), t("beastCard.toast.loot", { xp, gp, ap }), 2000);
  if (!levelUp?.didLevelUp) return;
  const { newLevel } = levelUp;
  // let the rewards toast clear first
  timers.startTimeout(2000, () => {
    play$fx("levelUp");
    void say(t("beastCard.toast.levelUp", { level: newLevel }), nick, 2400);
  });
};

const claim = async () => {
  if (!actions.value.canClaim || claiming.value) return;
  claiming.value = true;
  try {
    // The quest log is the source of truth, so a stale card can never pay out twice. Every hero's log: another
    // assignee's clear of a shared quest (Team Effort, Rat Race) already used the window up
    const log = await getQuestLogDb().getEntries();
    const effects = userStore.getUserById(heroId.value)?.questEffects;
    const check = checkClaimWindow(props.quest, log, heroId.value, new Date(), effects);
    if (!check.canClaim) {
      void say(questTitle.value, check.notice);
      close();
      return;
    }
    const result = await completeQuest(props.quest, heroId.value, "claim");
    // The steps did their job: a quest that comes round again starts with a clean checklist
    clearBattleProgress(ctx.value);
    announce(result);
    close();
  } catch (error) {
    debug.warn("[BeastCard] the claim could not be recorded", error);
    void say(t("beastCard.error.log"));
  } finally {
    claiming.value = false;
  }
};

defineExpose({ close });
</script>

<style lang="scss" scoped>
// The sheet is the Quests phone app: a plain app surface with one thin frame, the kit's tokens for both skins.
.beast-card-modal {
  // The modal host covers the whole screen: the kit's page background belongs on the sheet behind (::part below).
  background: transparent;
  --background: var(--xp-app-bg);
  --box-shadow: none;
  --height: calc(100% - var(--ion-safe-area-top, 0px) - 56px);
  --width: 100%;
  --border-radius: 14px 14px 0 0;

  &::part(content) {
    max-width: 700px;
    margin: 0 auto;
    background: var(--xp-app-bg);
    border: var(--xp-app-section-border);
    border-bottom: 0;
  }
}

// ---- The beast on its backdrop ---------------------------------------------------------------------------------

.beast-hero {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: 184px;
  overflow: hidden;
  background: #000;
  border-bottom: var(--xp-app-section-border);

  &__backdrop {
    position: absolute;
    inset: 0;
    z-index: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    image-rendering: pixelated;
    pointer-events: none;
  }

  &__portrait {
    position: relative;
    z-index: 1;
    height: 92%;
    max-width: 78%;
    object-fit: contain;
    filter: drop-shadow(0 6px 0 rgba(0, 0, 0, 0.45));
    user-select: none;
  }

  &__placeholder {
    position: relative;
    z-index: 1;
    align-self: center;
    font-size: 5rem;
    color: var(--xp-app-tile-fg);
    opacity: 0.8;
  }

  &__tier,
  &__state {
    position: absolute;
    z-index: 2;
    top: 10px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: rgba(0, 0, 0, 0.62);
    border: 1px solid var(--xp-app-frame, rgba(255, 255, 255, 0.4));
    border-radius: var(--xp-app-radius-chip);
    color: var(--xp-app-text);
    font-family: var(--xp-app-font-title);
    font-size: 0.78rem;
    letter-spacing: 0.4px;
    text-transform: var(--xp-app-title-transform);
  }

  &__tier {
    left: 10px;
  }

  &__state {
    right: 10px;
    background: var(--xp-app-accent);
    border-color: transparent;
    color: var(--xp-app-on-accent);

    &.is-pending {
      background: rgba(0, 0, 0, 0.62);
      color: var(--xp-app-text);
    }
  }

  &--miniboss .beast-hero__tier {
    color: #ffd27a;
  }

  &--boss .beast-hero__tier {
    color: #ff8a7a;
  }
}

// ---- Name plate and facts --------------------------------------------------------------------------------------

.beast-plate {
  padding: 12px 14px 4px;

  &__name {
    margin: 0;
    font-family: var(--xp-app-font-title);
    font-size: 1.35rem;
    line-height: 1.15;
    text-transform: var(--xp-app-title-transform);
    color: var(--xp-app-text);
  }

  &__sub {
    margin: 4px 0 0;
    color: var(--xp-app-text-dim);
    font-size: 0.9rem;
  }
}

.beast-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 14px 12px;
}

// The entry's facts are small pills, so the checklist stays on screen under them
.beast-fact {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 26px;
  padding: 2px 10px;
  border: 1px solid var(--xp-app-line);
  border-radius: var(--xp-app-radius-chip);
  color: var(--xp-app-text);
  font-size: 0.8rem;
  line-height: 1.2;

  > i {
    flex: 0 0 auto;
    color: var(--xp-app-tile-fg);
  }

  &.is-overdue {
    color: #ff8a7a;
  }

  &--grudge {
    flex: 1 1 100%;
    border-radius: var(--xp-app-radius-control);
  }
}

.beast-grudge {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 3px;

  i {
    color: var(--xp-app-text-dim);
    opacity: 0.35;

    &.is-lit {
      color: #ff6b5a;
      opacity: 1;
    }
  }
}

.beast-rewards {
  display: flex;
  flex: 1 1 100%;
  flex-wrap: wrap;
  gap: 6px;
}

// ---- The checklist -----------------------------------------------------------------------------------------------

.beast-steps {
  margin: 0 12px;
}

.beast-step {
  --step-pop-ms: 420ms;

  :deep(.xp-app-row__tile) {
    position: relative;
    overflow: visible;
  }

  &__box {
    font-size: 1.3rem;
    transition: color 160ms ease-out;
  }

  // The title's line-through sweeps across instead of snapping on
  :deep(.xp-app-row__title) {
    background-image: linear-gradient(currentColor, currentColor);
    background-position: 0 58%;
    background-repeat: no-repeat;
    background-size: 0% 2px;
    transition: opacity 220ms ease-out, background-size 260ms ease-out;
    width: fit-content;
  }

  &.is-checked {
    :deep(.xp-app-row__title) {
      background-size: 100% 2px;
      opacity: 0.6;
    }

    .beast-step__box {
      color: var(--xp-app-accent);
    }
  }

  // Checked: the box pops and the row flashes the accent once
  &.is-just-checked {
    animation: beast-step-flash 600ms ease-out;

    .beast-step__box {
      animation: beast-box-pop var(--step-pop-ms) cubic-bezier(0.2, 1.6, 0.4, 1);
    }
  }

  // Unchecked: a quiet shake, no reward
  &.is-just-unchecked .beast-step__box {
    animation: beast-box-drop 320ms ease-out;
  }

  // Four pixel sparks fly off the box
  &__spark {
    position: absolute;
    inset: 0;
    pointer-events: none;

    i {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 5px;
      height: 5px;
      background: var(--xp-app-accent);
      opacity: 0;
      animation: beast-spark 520ms ease-out forwards;

      &:nth-child(1) { --dx: -16px; --dy: -16px; }
      &:nth-child(2) { --dx: 16px; --dy: -14px; animation-delay: 30ms; }
      &:nth-child(3) { --dx: -14px; --dy: 15px; animation-delay: 60ms; }
      &:nth-child(4) { --dx: 17px; --dy: 14px; animation-delay: 20ms; }
    }
  }
}

// Every step checked: the header lights and the list holds a soft accent edge until it is claimed
.beast-steps {
  &.is-complete :deep(.xp-app-section__label) {
    color: var(--xp-app-accent);
  }

  &.is-just-complete :deep(.xp-app-section__label) {
    transform-origin: left center;
    animation: beast-label-pulse 700ms ease-out 2;
  }
}

.beast-btn--claim {
  &.is-ready:not(:disabled) {
    box-shadow: 0 0 0 1px var(--xp-app-accent), 0 0 12px -2px var(--xp-app-accent);
    color: var(--xp-app-accent);
  }

  &.is-just-ready {
    animation: beast-claim-glow 700ms ease-out 2;
  }
}

@keyframes beast-step-flash {
  0% {
    background-color: rgba(255, 255, 255, 0.22);
  }

  100% {
    background-color: transparent;
  }
}

@keyframes beast-box-pop {
  0% {
    transform: scale(0.6);
  }

  60% {
    transform: scale(1.45) rotate(-6deg);
  }

  100% {
    transform: scale(1) rotate(0);
  }
}

@keyframes beast-box-drop {
  0%,
  100% {
    transform: translateX(0);
  }

  25% {
    transform: translateX(-3px) scale(0.92);
  }

  75% {
    transform: translateX(3px) scale(0.92);
  }
}

@keyframes beast-spark {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }

  100% {
    opacity: 0;
    transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0.2);
  }
}

@keyframes beast-label-pulse {
  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.12);
  }
}

@keyframes beast-claim-glow {
  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.04);
    box-shadow: 0 0 0 2px var(--xp-app-accent), 0 0 22px 2px var(--xp-app-accent);
  }
}

// Reduced motion: the colour change stays, the movement goes
@media (prefers-reduced-motion: reduce) {
  .beast-step,
  .beast-step__box,
  .beast-step__spark i,
  .beast-steps :deep(.xp-app-section__label),
  .beast-btn--claim {
    animation: none !important;
    transition: none !important;
  }

  .beast-step__spark {
    display: none;
  }
}

.beast-loading,
.beast-note {
  margin: 8px 14px 0;
  color: var(--xp-app-text-dim);
  font-size: 0.9rem;
}

// The note and the hint carry a speaker button beside the line
.beast-note {
  display: flex;
  align-items: center;
  gap: 6px;
}

// ---- Hunt and Claim, at the bottom of the sheet --------------------------------------------------------------------

.beast-footer::before {
  display: none;
}

.beast-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px calc(10px + var(--ion-safe-area-bottom, 0px));
  background: var(--xp-app-bar-bg);
  border-top: 1px solid var(--xp-app-line);

  &__hint {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin: 0;
    color: var(--xp-app-text-dim);
    font-size: 0.82rem;
    text-align: center;
  }

  &__buttons {
    display: flex;
    gap: 10px;
  }
}

.beast-btn {
  min-height: 52px;
  font-size: 1rem;

  i {
    font-size: 1.2rem;
  }

  &__text {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    line-height: 1.1;
  }

  &__sub {
    font-size: 0.68rem;
    opacity: 0.85;
    text-transform: none;
    letter-spacing: 0;
  }

  &--hunt {
    flex: 1.6 1 0;
  }

  &--claim {
    flex: 1 1 0;
  }
}

.beast-bar > .beast-btn {
  width: 100%;
}
</style>
