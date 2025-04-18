<template>
  <ion-card class="achievements-card">
    <ion-card-title>Pegasi</ion-card-title> <!-- Changed title -->
    <ion-card-content>
      <div class="crystals-circle-container"> <!-- Keeping class names for now -->
        <div class="crystals-circle">
          <!-- Loop for the first 6 pegasi -->
          <div 
            v-for="(pegasus, index) in pegasi.slice(0, 6)" 
            :key="`outer-${index}`" 
            class="crystal-item outer-crystal" 
            :class="{ 'obtained': pegasus.obtained }"
          >
            <!-- Changed icon and added style binding -->
            <i 
              class="fad fa-pegasus fa-lg" 
              :style="pegasus.obtained ? { '--fa-primary-color': pegasus.color, '--fa-secondary-color': lightenDarkenColor(pegasus.color, -40), '--fa-primary-opacity': 1, '--fa-secondary-opacity': 1 } : {}"
            ></i>
          </div>
          <!-- Separate element for the 7th (center) pegasus -->
          <div 
            v-if="pegasi.length > 6"
            class="crystal-item center-crystal" 
            :class="{ 'obtained': pegasi[6].obtained }"
            :key="'center-crystal'"
          >
             <!-- Changed icon and added style binding -->
            <i 
              class="fad fa-pegasus fa-lg"
              :style="pegasi[6].obtained ? { '--fa-primary-color': pegasi[6].color, '--fa-secondary-color': lightenDarkenColor(pegasi[6].color, -40), '--fa-primary-opacity': 1, '--fa-secondary-opacity': 1 } : {}"
            ></i>
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
  emits: ["change-bg"],
  data() {
    // Define colors for the pegasi
    const pegasusColors = [
      '#ff6b6b', // Red
      '#feca57', // Orange/Yellow
      '#48dbfb', // Light Blue
      '#1dd1a1', // Green/Teal
      '#ff9ff3', // Pink
      '#5f27cd', // Purple
      '#f1f2f6'  // White/Silver (for center)
    ];

    return {
      // Updated data structure with colors
      pegasi: pegasusColors.map((color, index) => ({
        obtained: index < 3, // First 3 obtained
        color: color
      }))
    };
  },
  methods: {
    // Helper function to slightly darken a color for the secondary part
    lightenDarkenColor(col: string, amt: number): string {
      let usePound = false;
      if (col[0] == "#") {
        col = col.slice(1);
        usePound = true;
      }
      const num = parseInt(col, 16);
      let r = (num >> 16) + amt;
      if (r > 255) r = 255;
      else if (r < 0) r = 0;
      let b = ((num >> 8) & 0x00FF) + amt;
      if (b > 255) b = 255;
      else if (b < 0) b = 0;
      let g = (num & 0x0000FF) + amt;
      if (g > 255) g = 255;
      else if (g < 0) g = 0;
      return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
    }
  }
});
</script>

<style lang="scss" scoped>
.achievements-card {
  // Increased height slightly to accommodate the circle comfortably
  // height: 18vh; // Removed fixed height
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
    flex: 1; // Allow content to grow
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px 5px 5px 5px; // Add some padding, especially top
    min-height: 120px; // Ensure minimum height for the circle
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
    width: 90px; // Slightly smaller diameter
    height: 90px; // Slightly smaller diameter
    border-radius: 50%;
    // border: 1px dashed rgba(255, 255, 255, 0.1); 
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
          // Adjust translation distance based on new radius (90px diameter / 2 = 45px)
          transform: rotate($angle) translate(45px) rotate(-$angle); 
        }
      }
    }
    
    // --- Position the center item ---
    &.center-crystal {
      // Already positioned absolute at top 50%, left 50% with negative margin
      // No additional transform needed
    }

    // Updated icon class and default styles
    i.fa-pegasus { 
      font-size: 1.5rem; 
      // Style for not-obtained pegasi (default)
      --fa-primary-color: #444; // Slightly lighter grey outline
      --fa-secondary-color: #222; // Darker grey body
      --fa-primary-opacity: 0.7;
      --fa-secondary-opacity: 0.5;
      transition: all 0.3s ease;
    }

    &.obtained {
      // Removed background color change if not desired
      
      // Removed specific i.fa-gem styles for .obtained, colors are now inline
      // Add a subtle glow effect for obtained items
      i.fa-pegasus {
         filter: drop-shadow(0 0 4px var(--fa-primary-color)); 
      }
    }
  }
}
</style>
