<template>
  <article class="family-reward" data-test="family-reward">
    <div class="family-reward__head">
      <span class="family-reward__icon" aria-hidden="true"><i class="fad fa-gift"></i></span>
      <p class="family-reward__line">{{ t("projectFinish.approval.earned", { reward: text }) }}</p>
    </div>
    <button
      type="button"
      class="family-reward__give"
      data-test="family-reward-give"
      :disabled="isSaving"
      :aria-label="`${t('projectFinish.approval.give')}: ${text}`"
      @click="give"
    >
      <i class="fad fa-hand-holding-box" aria-hidden="true"></i> {{ t("projectFinish.approval.give") }}
    </button>
  </article>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { play$fx } from "@/assets/fx";
import { useToast } from "@/hooks/useToast";
import { useCopy } from "@/hooks/useVoice";
import { markRewardGiven } from "@/lib/services/projects/projectService";
import debug from "@/lib/utils/debug";

defineOptions({ name: "approval-family-reward-row" });

/**
 * The family reward of a cleared project, earned and waiting for the Game Master to hand it over: what the family
 * agreed on, in their own words, and "Mark as given" for when it happens. It sits at the top of the achievements tab
 * of Approvals. The button stamps the reward given (markRewardGiven) and the page reads the list again on `given`.
 */
defineProps<{ text: string }>();

const emit = defineEmits<{ (e: "given"): void }>();

const t = useCopy();
const { showToast } = useToast();
const isSaving = ref(false);

const give = async () => {
  if (isSaving.value) return;
  isSaving.value = true;
  try {
    await markRewardGiven();
  } catch (error) {
    debug.warn("[Approvals] the family reward could not be marked as given", error);
    play$fx("no");
    void showToast(t("projectFinish.approval.failed"), 4000);
    isSaving.value = false;
    return;
  }
  // Left shut on purpose: until the page reads again this row still stands for the run just handed over, and a second tap
  // would stamp the next run's reward, which the Game Master has not seen. The page keys the row by the run, so a next
  // reward gets a fresh row.
  play$fx("select");
  emit("given");
};
</script>

<style lang="scss" scoped>
// Colours, frame and corners come from the kit tokens of the page's skin (`.xp-app--retro` / `.xp-app--modern`), the
// same ones the quest card (ApprovalClaimRow) and the purchase card wear
.family-reward {
  display: grid;
  gap: 8px;
  box-sizing: border-box;
  margin: 6px 8px;
  padding: 10px;
  background: var(--xp-app-surface);
  border: var(--xp-app-section-border);
  border-radius: var(--xp-app-radius-section);
  color: var(--xp-app-text);
  font-family: var(--xp-app-font-body);
  text-shadow: var(--xp-app-text-shadow);
}

.family-reward__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.family-reward__icon {
  display: grid;
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  place-items: center;
  background: var(--xp-app-tile-bg);
  border: var(--xp-app-tile-border);
  border-radius: var(--xp-app-radius-tile);
  color: var(--xp-app-tile-fg);
  font-size: 1.2rem;
}

.family-reward__line {
  min-width: 0;
  margin: 0;
  font-family: var(--xp-app-font-title);
  font-size: 1rem;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.family-reward__give {
  min-height: 44px;
  padding: 0 8px;
  background: var(--gs-good, var(--xp-app-accent));
  border: var(--xp-app-btn-border, 0);
  border-radius: var(--xp-app-radius-control);
  box-shadow: var(--xp-app-btn-ring, none);
  color: var(--xp-app-on-accent);
  font-family: inherit;
  font-size: 0.95rem;
  letter-spacing: 0.5px;
  text-shadow: var(--xp-app-on-accent-shadow, none);
  text-transform: var(--xp-app-title-transform);
  cursor: pointer;
  --fa-primary-color: var(--xp-app-on-accent);
  --fa-secondary-color: var(--xp-app-on-accent);

  &:active {
    transform: translateY(1px);
    filter: brightness(0.85);
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }

  &:focus-visible {
    outline: 2px solid var(--xp-app-text);
    outline-offset: 2px;
  }
}
</style>
