<script setup lang="ts">
import { computed, onBeforeUnmount, ref, toRef, watch } from "vue";
import { useRouter } from "vue-router";
import { toastController } from "@ionic/vue";
import { play$fx } from "@/assets/fx";
import XpRevealPrompt from "@/components/organisms/RevealPrompt/XpRevealPrompt.vue";
import { useRevealPrompt } from "@/components/organisms/RevealPrompt/useRevealPrompt";
import { showRewards } from "@/components/organisms/RewardsOverlay/rewardsOverlay";
import { useGuide } from "@/hooks/useGuide";
import { crownChampion, markGuide } from "@/lib/services/guide/guideState";
import {
  CHAMPION_LINES,
  CHAMPION_TITLE,
  GUIDE_INTRO_LINES,
  GUIDE_INTRO_TITLE,
  GUIDE_SPEAKER,
  PEGASUS_COUNT,
  type GuideStep,
} from "@/lib/services/guide/nextStep";

/**
 * The Guide: once the first-run tour is over it tells the hero the goal of the game, then keeps their one next step in a
 * chip under the HUD (Beast Log, the Wind Temple, the first room, Aura, the shop, the next temple...). The step moves on
 * by itself as the hero plays. Tapping the chip has the Guide say it again with a Go button; the chip can be tucked
 * away and brought back from the avatar menu (`open()`). When the ninth Pegasus is free the Guide crowns the hero a
 * Sky Champion, and after that it keeps pointing at the day's beasts and the streak.
 */
const props = defineProps<{
  heroId: string;
  /** The first-run tour is done (or was seen before), so the Guide may speak */
  ready: boolean;
}>();

const router = useRouter();
const reveal = useRevealPrompt();
const { step, record, loaded } = useGuide(toRef(props, "heroId"));

/** The Guide waits its turn behind anything else asking for the hero's attention (the tour's own list, and the tour) */
const BUSY_SELECTORS = [
  ".xp-audio-permission-overlay",
  "[data-cy=reveal-prompt]",
  "ion-modal.show-modal",
  "[data-cy=hero-fanfare]",
  "[data-cy=first-run-tour]",
  ".xp-rewards-overlay",
];
const RETRY_MS = 700;
const isBusy = () => BUSY_SELECTORS.some((selector) => document.querySelector(selector));

const isTalking = ref(false);
const showChip = computed(() => props.ready && loaded.value && !record.value.hidden);

const say = async (message: string) => {
  const toast = await toastController.create({
    message,
    duration: 3200,
    position: "middle",
    cssClass: "rpg-toast",
    buttons: [{ icon: "close", role: "cancel" }],
  });
  await toast.present();
};

const go = async (target: GuideStep) => {
  const isCelebration = target.go.kind === "celebrate";
  if (isCelebration) return celebrate();
  play$fx("select");
  await router.push({ name: target.go.name, params: { ...(target.go.params ?? {}), userId: props.heroId } });
};

/** The Guide says the step and offers to take the hero there. */
const talk = async (lead: readonly string[] = [], heading?: string) => {
  if (isTalking.value) return;
  isTalking.value = true;
  const current = step.value;
  let pick = "later";
  try {
    pick = await reveal.showPrompt({
      speaker: GUIDE_SPEAKER,
      title: heading ?? (current.champion ? CHAMPION_TITLE : `Next: ${current.title}`),
      lines: [...lead, ...current.lines],
      choices: [
        { id: "go", label: current.goLabel, icon: "flag", tone: "primary" },
        { id: "later", label: "Not now", tone: "ghost" },
      ],
      cancelId: "later",
    });
  } finally {
    isTalking.value = false;
  }
  const wantsToGo = pick === "go";
  if (wantsToGo) await go(current);
};

/** The Sky Champion celebration: the Guide's speech, the title, then the one-time reward counted up. */
const celebrate = async () => {
  if (isTalking.value) return;
  isTalking.value = true;
  try {
    const pick = await reveal.showPrompt({
      speaker: GUIDE_SPEAKER,
      title: `All ${PEGASUS_COUNT} Pegasi are free!`,
      sprite: "chestOpen",
      glow: "gold",
      sound: "levelUp",
      lines: [...CHAMPION_LINES],
      choices: [
        { id: "claim", label: "Claim my reward", icon: "crown", tone: "primary" },
        { id: "later", label: "Later", tone: "ghost" },
      ],
      cancelId: "later",
    });
    const isClaimed = pick === "claim";
    if (!isClaimed) return;
    const paid = crownChampion(props.heroId);
    if (!paid) return;
    await showRewards({
      title: CHAMPION_TITLE,
      subtitle: `All ${PEGASUS_COUNT} Pegasi fly free`,
      rewards: { xp: paid.xp, gp: paid.gp, ap: paid.ap },
      held: false,
      levelUp: paid.levelUp ?? undefined,
    });
  } finally {
    isTalking.value = false;
  }
};

/** Tuck the chip away; the avatar menu's Guide brings it back. */
const hide = () => {
  play$fx("cursor");
  markGuide(props.heroId, { hidden: true });
  void say("The Guide is resting. Open your avatar menu and pick Guide to bring it back.");
};

/** The avatar menu's Guide: the chip comes back and the Guide says the next step. */
const open = () => {
  markGuide(props.heroId, { hidden: false });
  play$fx("openMenu");
  void talk();
};
defineExpose({ open });

// The first time the Guide may speak it explains the whole game, and the ninth Pegasus calls the celebration.
// Either waits for the screen to be free (the tour, a building's prompt, a modal).
let waitTimer: number | undefined;
const speakWhenFree = () => {
  window.clearTimeout(waitTimer);
  const needsIntro = !record.value.introSeen;
  const needsCelebration = step.value.id === "champion";
  const hasSomethingToSay = props.ready && loaded.value && !isTalking.value && (needsIntro || needsCelebration);
  if (!hasSomethingToSay) return;
  if (isBusy()) {
    waitTimer = window.setTimeout(speakWhenFree, RETRY_MS);
    return;
  }
  if (needsIntro) {
    markGuide(props.heroId, { introSeen: true });
    void talk(GUIDE_INTRO_LINES, GUIDE_INTRO_TITLE);
  } else {
    void celebrate();
  }
};
watch(() => [props.ready, loaded.value, step.value.id, record.value.introSeen], speakWhenFree, { immediate: true });
onBeforeUnmount(() => window.clearTimeout(waitTimer));
</script>

<template>
  <div v-if="showChip" class="xp-guide" data-cy="guide-tracker">
    <button
      :key="step.key"
      type="button"
      class="guide-chip"
      :class="{ 'is-champion': step.champion }"
      :aria-label="step.champion ? `${CHAMPION_TITLE}: ${step.title}` : `Next step: ${step.title}`"
      data-cy="guide-step"
      @click="talk()"
    >
      <i :class="['fad', step.champion ? 'fa-crown' : 'fa-flag', 'guide-icon']" aria-hidden="true"></i>
      <span v-if="!step.champion" class="guide-label">Next</span>
      <span class="guide-title">{{ step.title }}</span>
      <span v-if="!step.champion" class="guide-count" :aria-label="`${step.freed} of ${PEGASUS_COUNT} Pegasi freed`">
        <i class="fad fa-pegasus" aria-hidden="true"></i>{{ step.freed }}/{{ PEGASUS_COUNT }}
      </span>
    </button>
    <button type="button" class="guide-hide" aria-label="Hide the Guide" data-cy="guide-hide" @click="hide">
      <i class="fad fa-times" aria-hidden="true"></i>
    </button>
  </div>
  <xp-reveal-prompt :prompt="reveal.prompt.value" @respond="reveal.submitAnswer" />
</template>

<style lang="scss" scoped>
// Under the HUD, above the page: a quest marker that names the hero's one next step
.xp-guide {
  position: fixed;
  top: calc(var(--ion-safe-area-top, 0px) + var(--xp-guide-top, 104px));
  left: 0;
  right: 0;
  z-index: 1400;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  pointer-events: none;
}

.guide-chip,
.guide-hide {
  pointer-events: auto;
  border: 2px solid #fff;
  border-radius: 8px;
  background: #1b1640;
  box-shadow: 0 0 0 2px #000, 0 3px 0 2px rgba(0, 0, 0, 0.45);
  color: #fff;
  font-family: "StatusPlz", monospace;
  line-height: 1;
}

.guide-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
  min-height: 34px;
  padding: 6px 10px;
  font-size: 14px;
  animation: guide-chip-in 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.3);

  &.is-champion {
    border-color: #ffe066;
    .guide-icon,
    .guide-label {
      color: #ffe066;
    }
  }
}

.guide-icon {
  flex: none;
  font-size: 15px;
  color: #7bed9f;
  animation: guide-flag-wave 1.6s ease-in-out infinite;
}

.guide-label {
  flex: none;
  white-space: nowrap;
  color: #7bed9f;
  text-transform: uppercase;
  font-size: 12px;
  letter-spacing: 0.04em;
}

.guide-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.guide-count {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: #ffe066;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.guide-hide {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  font-size: 13px;
}

@keyframes guide-chip-in {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.92);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes guide-flag-wave {
  0%,
  100% {
    transform: rotate(0deg);
  }
  50% {
    transform: rotate(-10deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .guide-chip,
  .guide-icon {
    animation: none;
  }
}
</style>
