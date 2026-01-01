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

    const textMap: Record<string, string> = {
      dashboard: "Quest Setup: Give your adventure a name and choose a Stat Category (STR, INT, etc) to determine the rewards.",
      "quest-type": "Adventure Type: Is this a simple task, a generic monster hunt, or a boss battle? This defines the complexity.",
      heros: "Party Assignment: Assign this quest to yourself (Solo) or the whole party (Group Raid).",
      when: "Schedule: Set a due date or make it a recurring event (Daily/Weekly).",
      points: "Difficulty: Adjust the slider to increase the challenge and the resulting XP/GP rewards."
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
