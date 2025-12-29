<template>
  <div class="battle-controls">
    <div v-if="battleEngine.currentEnemy" class="enemy-status">
      <div class="enemy-name">{{ battleEngine.currentEnemy.value?.name }}</div>
      <div class="enemy-health">
        <div class="health-label">
          HP: {{ battleEngine.currentEnemy.value?.health }} /
          {{ battleEngine.currentEnemy.value?.maxHealth }}
        </div>
        <div class="health-bar-container">
          <div
            class="health-bar"
            :style="{
              width: `${((battleEngine.currentEnemy.value?.health || 0) / (battleEngine.currentEnemy.value?.maxHealth || 1)) * 100}%`,
              backgroundColor: battleEngine.enemyHealthColor.value as string
            }"
          ></div>
        </div>
      </div>
    </div>

    <div
      class="battle-actions"
      v-if="
        battleEngine.state.isPlayerTurn && !battleEngine.battleDialog.showDialog
      "
    >
      <ion-button
        v-for="action in Array.isArray(battleEngine.userActions)
          ? battleEngine.userActions
          : []"
        :key="action.id"
        @click="handleAction(action.id)"
        :color="getActionColor(action.type)"
        size="small"
        expand="block"
        class="action-button"
      >
        <ion-icon
          v-if="action.icon"
          :icon="getIconByName(action.icon)"
          slot="start"
        ></ion-icon>
        {{ action.name }}
      </ion-button>
    </div>
  </div>
</template>

<script lang="ts">
  import { defineComponent } from "vue";
  import { useBattleEngine } from "@/app/Console/BattleField/hooks/useBattleEngine";
  import {
    flash as swordOutline,
    shield as shieldOutline,
    colorWand as colorWandOutline,
    bag as bagOutline,
    walk as walkOutline,
  } from "ionicons/icons";

  export default defineComponent({
    name: "XpBattleControls",
    setup() {
      // Use the battle engine hook directly - this works from any component
      const battleEngine = useBattleEngine();

      const handleAction = (actionId: string) => {
        // Call the battle engine's action handler
        battleEngine.handleBattleAction({ action: actionId });
      };

      // Helper function to get icon by name
      const getIconByName = (iconName: string) => {
        const iconMap: Record<string, any> = {
          "sword-outline": swordOutline,
          "shield-outline": shieldOutline,
          "color-wand-outline": colorWandOutline,
          "bag-outline": bagOutline,
          "walk-outline": walkOutline,
        };

        return iconMap[iconName] || null;
      };

      // Helper function to set button colors based on action type
      const getActionColor = (actionType: string) => {
        const colorMap: Record<string, string> = {
          attack: "danger",
          defend: "warning",
          special: "tertiary",
          item: "success",
          escape: "medium",
        };

        return colorMap[actionType] || "primary";
      };

      return {
        battleEngine,
        handleAction,
        getIconByName,
        getActionColor,
      };
    },
  });
</script>

<style scoped>
  .battle-controls {
    padding: 10px;
    background-color: rgba(0, 0, 0, 0.7);
    border-radius: 8px;
    margin: 10px;
  }

  .enemy-status {
    margin-bottom: 15px;
    padding: 10px;
    border-radius: 5px;
    background-color: rgba(0, 0, 0, 0.4);
  }

  .enemy-name {
    font-size: 1.2rem;
    font-weight: bold;
    margin-bottom: 5px;
    color: white;
  }

  .enemy-health {
    width: 100%;
  }

  .health-label {
    font-size: 0.9rem;
    margin-bottom: 3px;
    color: white;
  }

  .health-bar-container {
    width: 100%;
    height: 10px;
    background-color: #444;
    border-radius: 5px;
    overflow: hidden;
  }

  .health-bar {
    height: 100%;
    transition: width 0.3s, background-color 0.3s;
  }

  .battle-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .action-button {
    text-transform: none;
    font-weight: bold;
  }
</style>
