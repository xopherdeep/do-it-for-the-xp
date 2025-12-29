<template>
  <ion-card class="achievements-card">
    <ion-card-title class="card-header">
      <i class="fad fa-pegasus mr-2"></i>
      Pegasi
    </ion-card-title>
    <ion-card-content class="content">
      <div class="crystals-circle-container">
        <div class="crystals-circle">
          <div 
            v-for="(pegasus, index) in pegasi.slice(0, 6)" 
            :key="`outer-${index}`" 
            class="crystal-item outer-crystal" 
            :class="{ 'obtained': pegasus.obtained }"
          >
            <i 
              class="fad fa-pegasus fa-lg" 
              :style="pegasus.obtained ? { '--fa-primary-color': pegasus.color, '--fa-secondary-color': lightenDarkenColor(pegasus.color, -40), '--fa-primary-opacity': 1, '--fa-secondary-opacity': 1 } : {}"
            ></i>
          </div>
          <div 
            v-if="pegasi.length > 6"
            class="crystal-item center-crystal" 
            :class="{ 'obtained': pegasi[6].obtained }"
            :key="'center-crystal'"
          >
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
      pegasi: pegasusColors.map((color, index) => ({
        obtained: index < 3,
        color: color
      }))
    };
  },
  methods: {
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
  display: flex;
  flex-direction: column;
  background: rgba(20, 20, 30, 0.4) !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.4);
  
  .card-header {
    background: rgba(0, 0, 0, 0.3);
    padding: 0.75rem 1rem;
    font-size: 1.1rem;
    font-family: 'Apple Kid', sans-serif;
    letter-spacing: 5px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    text-transform: uppercase;
    color: #ffd700;
  }

  .content {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 1.5rem;
    min-height: 140px;
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
    width: 100px;
    height: 100px;
    border-radius: 50%;
  }

  .crystal-item {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 36px;
    height: 36px;
    margin: -18px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    
    &.outer-crystal {
      @for $i from 0 through 5 {
        &:nth-child(#{$i + 1}) {
          $angle: calc(360deg / 6) * $i;
          transform: rotate($angle) translate(50px) rotate(-$angle); 
        }
      }
    }
    
    i.fa-pegasus { 
      font-size: 1.6rem; 
      --fa-primary-color: #444;
      --fa-secondary-color: #222;
      --fa-primary-opacity: 0.7;
      --fa-secondary-opacity: 0.5;
      filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5));
    }

    &.obtained {
      i.fa-pegasus {
         filter: drop-shadow(0 0 8px var(--fa-primary-color)); 
      }
      
      &:hover {
        transform: scale(1.2) translateY(-2px);
        filter: brightness(1.2);
        z-index: 10;
        
        // Re-calculate transform for outer crystals to maintain position during hover
        &.outer-crystal {
          @for $i from 0 through 5 {
            &:nth-child(#{$i + 1}) {
              $angle: calc(360deg / 6) * $i;
              transform: rotate($angle) translate(50px) rotate(-$angle) scale(1.25); 
            }
          }
        }
        
        &.center-crystal {
          transform: scale(1.3);
        }
      }
    }
  }
}
</style>
