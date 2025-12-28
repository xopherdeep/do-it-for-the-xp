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
      points: "Every adventure has stakes. Set the difficulty to calculate the XP rewards.",
      heros: "Who is brave enough for this task? Assign it to yourself, or rally the party.",
      splash: "What is the objective? Give your quest a name and a category.",
      "quest-type": "Is this a simple chore, or a monster to be slain? Choose your path wisely.",
      when: "When does destiny call? Set a deadline or a recurring schedule."
    };

    const showCoachMessage = (tab: string) => {
      const message = textMap[tab] || "Focus entirely on the task at hand.";
      showMessage(message, 'global', { autoDismiss: false });
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
