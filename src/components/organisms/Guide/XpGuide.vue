<script setup lang="ts">
import { onBeforeUnmount, ref, toRef, watch } from "vue";
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
} from "@/lib/services/guide/nextStep";

/**
 * The Guide speaks like a game character, never playing for the hero (owner, 2026-10-18). Once the first-run tour is
 * over it tells the goal of the game and sends the hero to ask around town, where the shopkeeper, the hotel and the
 * bank pass on the next step as news (npcHints.ts). The avatar menu's Journal (`open()`) has it say the current goal
 * again. When the ninth Pegasus is free it crowns the hero a Sky Champion.
 */
const props = defineProps<{
  heroId: string;
  /** The first-run tour is done (or was seen before), so the Guide may speak */
  ready: boolean;
}>();

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

/** The Guide says something and waits for the hero to nod. */
const speak = async (title: string, lines: readonly string[]) => {
  if (isTalking.value) return;
  isTalking.value = true;
  try {
    await reveal.showPrompt({
      speaker: GUIDE_SPEAKER,
      title,
      lines: [...lines],
      choices: [{ id: "ok", label: "Got it", tone: "primary" }],
      cancelId: "ok",
    });
  } finally {
    isTalking.value = false;
  }
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

/** The avatar menu's Journal: the Guide says the current goal (or holds the celebration the hero put off). */
const open = () => {
  play$fx("openMenu");
  const isCelebrationWaiting = step.value.id === "champion";
  if (isCelebrationWaiting) {
    void celebrate();
    return;
  }
  const heading = step.value.champion ? `${CHAMPION_TITLE}: ${step.value.title}` : step.value.title;
  void speak(heading, step.value.lines);
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
    void speak(GUIDE_INTRO_TITLE, GUIDE_INTRO_LINES);
  } else {
    void celebrate();
  }
};
watch(() => [props.ready, loaded.value, step.value.id, record.value.introSeen], speakWhenFree, { immediate: true });
onBeforeUnmount(() => window.clearTimeout(waitTimer));
</script>

<template>
  <xp-reveal-prompt :prompt="reveal.prompt.value" @respond="reveal.submitAnswer" />
</template>
