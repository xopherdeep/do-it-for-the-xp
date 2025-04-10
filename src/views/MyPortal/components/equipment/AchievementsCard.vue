<template>
  <ion-card class="achievements-card">
    <ion-card-title>Crystals</ion-card-title>
    <ion-card-content>
      <div class="crystals-circle-container">
        <div class="crystals-circle">
          <!-- Loop for the first 6 crystals -->
          <div 
            v-for="(crystal, index) in crystals.slice(0, 6)" 
            :key="`outer-${index}`" 
            class="crystal-item outer-crystal"
            :class="{ 'obtained': crystal.obtained }"
          >
            <i class="fad fa-gem fa-lg"></i>
          </div>
          <!-- Separate element for the 7th (center) crystal -->
          <div 
            v-if="crystals.length > 6"
            class="crystal-item center-crystal"
            :class="{ 'obtained': crystals[6].obtained }"
            :key="'center-crystal'"
          >
            <i class="fad fa-gem fa-lg"></i>
          </div>
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
  // Increased height slightly to accommodate the circle comfortably
  height: 18vh; 
  display: flex;
  flex-direction: column;
  overflow: hidden; // Prevent potential overflow issues with absolute positioning
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
    padding: 0; // Remove padding to use full space for circle positioning
  }

  .crystals-circle-container {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .crystals-circle {
    position: relative;
    width: 100px; // Diameter of the circle
    height: 100px; // Diameter of the circle
    border-radius: 50%;
    // border: 1px dashed rgba(255, 255, 255, 0.1); // Optional: visualize circle boundary
  }

  .crystal-item {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 30px; // Size of the crystal item container
    height: 30px; // Size of the crystal item container
    margin: -15px; // Center the item (half of width/height)
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%; // Make the item container circular
    // background-color: rgba(255, 255, 255, 0.05); // Keep or remove based on preference

    // --- Calculate positioning for 7 items ---
    // Angle = (360 / 7) * index
    // Offset = radius (50px for a 100px diameter circle)
    // --- Calculate positioning for 6 outer items ---
    // Angle = (360 / 6) * index
    // Offset = radius (50px for a 100px diameter circle)
    // transform: rotate(angle) translate(offset) rotate(-angle);
    
    &.outer-crystal {
      @for $i from 0 through 5 {
        &:nth-child(#{$i + 1}) {
          $angle: (360deg / 6) * $i;
          transform: rotate($angle) translate(50px) rotate(-$angle);
        }
      }
    }
    
    // --- Position the center item ---
    &.center-crystal {
      // Already positioned absolute at top 50%, left 50% with negative margin
      // No additional transform needed
    }

    i.fa-gem {
      font-size: 1.5rem; // Adjust icon size if needed
      // Style for not-obtained crystals (default)
      --fa-primary-color: #555; 
      --fa-secondary-color: #333; 
      --fa-primary-opacity: 0.7;
      --fa-secondary-opacity: 0.5;
      transition: all 0.3s ease;
    }

    &.obtained {
      // background-color: rgba(173, 216, 230, 0.1); // Keep or remove based on preference
      
      i.fa-gem {
        // Style for obtained crystals
        --fa-primary-color: #add8e6; 
        --fa-secondary-color: #4682b4; // Steel blue fill
        --fa-primary-opacity: 1;
        --fa-secondary-opacity: 1;
        filter: drop-shadow(0 0 3px #add8e6); // Add a glow
      }
    }
  }
}
</style>
