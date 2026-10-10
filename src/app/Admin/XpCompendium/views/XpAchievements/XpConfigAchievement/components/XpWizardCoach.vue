<template>
  <!-- Empty wrapper - this component now just triggers the global dialog -->
  <div class="xp-wizard-coach-trigger"></div>
</template>

<script lang="ts">
import { defineComponent, watch, onMounted } from 'vue';
import { useDialogSystem } from '@/lib/engine/core/DialogSystem';

export default defineComponent({
  name: 'XpWizardCoach',
  props: {
    activeTab: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const { showMessage } = useDialogSystem();

    // One line per tab (the route segment), worded from the controls on that tab
    const textMap: Record<string, string> = {
      dashboard: "What: Name your quest, then file it under a category like Around the House. Approval and Priority are set here too.",
      "quest-type": "How: Choose a Basic Task, a Beast Encounter or an Immersive Sequence (a chain of quests). A Beast Encounter also needs a beast.",
      heros: "Who: Choose how the quest is shared (Open Bounty, Solo Mission, Team Effort, Rotate Out or Rat Race), then pick the heroes. An Open Bounty is open to every hero.",
      when: "When: Set the start date, an optional end date and a due time, then choose how often it repeats: Once, Daily, Weekly or Custom.",
      points: "Why: Set the difficulty with the slider. It sets how much XP, GP and AP the quest pays, and you can still adjust each amount."
    };

    const isHelpEnabled = () => {
      try {
        const settings = localStorage.getItem("generalSettings");
        if (!settings) return true; // Default to true
        const parsed = JSON.parse(settings);
        return parsed.showHelperDialogs !== false; // Default true if undefined
      } catch {
        return true;
      }
    };

    const showCoachMessage = (tab: string) => {
      if (!isHelpEnabled()) return;

      const message = textMap[tab];
      if (message) {
         showMessage(message, 'global', { autoDismiss: false });
      }
    };

    // Show message on mount for initial tab
    onMounted(() => {
      showCoachMessage(props.activeTab);
    });

    // Show message when tab changes
    watch(() => props.activeTab, (newTab) => {
      showCoachMessage(newTab);
    });

    return {};
  }
});
</script>

<style lang="scss" scoped>
  .xp-wizard-coach-trigger {
    display: none; // Invisible - just a logic container
  }
</style>
