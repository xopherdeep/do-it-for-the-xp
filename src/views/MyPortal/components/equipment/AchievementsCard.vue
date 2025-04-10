<template>
  <ion-card class="achievements-card">
    <ion-card-title>Crystals</ion-card-title>
    <ion-card-content>
      <div class="crystals-grid">
        <div 
          v-for="(crystal, index) in crystals" 
          :key="index" 
          class="crystal-item"
          :class="{ 'obtained': crystal.obtained }"
        >
          <i class="fad fa-gem fa-2x"></i>
        </div>
      </div>
    </ion-card-content>
  </ion-card>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "achievements-card",
  emits: ["change-bg"], // Keeping emit in case it's used elsewhere, though the button is removed
  data() {
    return {
      // Placeholder data: 7 crystals, first 3 obtained
      crystals: [
        { obtained: true },
        { obtained: true },
        { obtained: true },
        { obtained: false },
        { obtained: false },
        { obtained: false },
        { obtained: false },
      ]
    };
  }
});
</script>

<style lang="scss" scoped>
.achievements-card {
  // Adjust height based on the parent layout. This might need tweaking.
  // Assuming it takes the remaining height after EquippedItemsCard (25vh) and ItemInfoCard (20vh)
  // and some padding/margins. Let's aim for roughly 10-15vh.
  height: 15vh; 
  display: flex;
  flex-direction: column;
  background-color: rgba(0, 0, 0, 0.3); // Darker background like a HUD element
  border: 1px solid rgba(255, 255, 255, 0.2);
  
  ion-card-title {
    text-align: center;
    font-size: 1rem;
    padding: 5px 0;
    color: #ffd700; // Gold color for title
    background-color: rgba(0, 0, 0, 0.4);
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  }

  ion-card-content {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 5px; // Reduced padding
  }

  .crystals-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 5px; // Reduced gap
    width: 100%;
    max-width: 250px; // Limit width for better appearance
    margin: 0 auto;
  }

  .crystal-item {
    display: flex;
    justify-content: center;
    align-items: center;
    aspect-ratio: 1 / 1; // Make items square
    border-radius: 4px;
    background-color: rgba(255, 255, 255, 0.05);

    i.fa-gem {
      // Style for not-obtained crystals (default)
      --fa-primary-color: #555; // Dark grey outline
      --fa-secondary-color: #333; // Darker grey fill
      --fa-primary-opacity: 0.7;
      --fa-secondary-opacity: 0.5;
      transition: all 0.3s ease;
    }

    &.obtained {
      background-color: rgba(173, 216, 230, 0.1); // Faint light blue bg for obtained
      
      i.fa-gem {
        // Style for obtained crystals
        --fa-primary-color: #add8e6; // Light blue outline (like the game)
        --fa-secondary-color: #4682b4; // Steel blue fill
        --fa-primary-opacity: 1;
        --fa-secondary-opacity: 1;
        filter: drop-shadow(0 0 3px #add8e6); // Add a glow
      }
    }
  }
}
</style>
