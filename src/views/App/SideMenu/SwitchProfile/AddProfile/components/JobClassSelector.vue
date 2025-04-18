<template>
  <ion-modal
    :is-open="isOpen"
    @didDismiss="$emit('close')"
    class="job-class-selector"
  >
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-title>Choose Your Class</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('close')">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="rpg-box class-selector-content bg-slide" :scrollY="false">
      <div class="selection-container">
        <!-- Character Preview -->
        <ion-content class="character-preview" :scrollY="true" :scrollX="false">
          <div class="character-avatar" :class="modelValue.toLowerCase()">
            <div class="avatar-image">
              <i :class="`fad ${getSelectedClassIcon()} fa-4x`"></i>
            </div>
            <div class="character-name">
              {{ modelValue || 'Select a Class' }}
            </div>
          </div>
          
          <div v-if="modelValue" class="class-details">
            <div class="class-description">
              {{ classDescriptions[modelValue] }}
            </div>
            
            <div class="stats-radar-container">
              <canvas ref="statsRadar" width="200" height="200"></canvas>
            </div>
            
            <div class="abilities-container">
              <h3>Special Abilities</h3>
              <div class="abilities-list">
                <div v-for="(ability, index) in classAbilities[modelValue]" :key="index" class="ability-card">
                  <div class="ability-icon">
                    <i :class="getAbilityIcon(ability)"></i>
                  </div>
                  <div class="ability-details">
                    <h4>{{ ability.name }}</h4>
                    <p>{{ ability.description }}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <ion-button 
              expand="block" 
              color="primary" 
              class="confirm-button"
              @click="$emit('close')"
            >
              <i class="fad fa-check-circle mr-2"></i>
              Confirm Selection
            </ion-button>
          </div>
        </ion-content>
        
        <!-- Class Selection Carousel -->
        <div class="class-selection">
          <h2 class="selection-title">Available Classes</h2>
          
          <ion-content class="classes-scroll-area" :scrollX="true" :scrollY="false">
            <div class="classes-carousel">
              <div 
                v-for="job in jobClassOptions" 
                :key="job.name"
                class="class-option"
                :class="{ 'selected': job.name === modelValue }"
                @click="selectClass(job.name)"
              >
                <div class="class-icon-container" :class="job.name.toLowerCase()">
                  <i :class="`fad ${job.icon} fa-3x`"></i>
                  <div class="class-glow"></div>
                </div>
                <div class="class-name">{{ job.name }}</div>
                
                <div class="difficulty-rating">
                  <span class="difficulty-label">Difficulty:</span>
                  <div class="stars">
                    <i v-for="n in 5" :key="n" 
                       :class="n <= classDifficulty[job.name] ? 'fas fa-star' : 'far fa-star'">
                    </i>
                  </div>
                </div>
                
                <div class="class-tags">
                  <span v-for="(tag, i) in classTags[job.name]" :key="i" class="tag">
                    {{ tag }}
                  </span>
                </div>
              </div>
            </div>
          </ion-content>
          
          <div class="class-navigation">
            <ion-button class="nav-button prev" @click="scrollClasses('left')">
              <ion-icon :icon="chevronBackOutline"></ion-icon>
            </ion-button>
            
            <div class="pagination">
              <span v-for="(job, i) in jobClassOptions" :key="i" 
                    class="page-dot"
                    :class="{ 'active': job.name === modelValue }"
                    @click="selectClass(job.name)">
              </span>
            </div>
            
            <ion-button class="nav-button next" @click="scrollClasses('right')">
              <ion-icon :icon="chevronForwardOutline"></ion-icon>
            </ion-button>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted } from 'vue';
import { JOB_CLASS_OPTIONS } from "@/constants";
import { closeOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
// Import Chart.js directly
import { Chart, RadarController, LineElement, PointElement, RadialLinearScale, Tooltip, Legend } from 'chart.js';
import Ionic from '@/mixins/ionic';

// Register the required Chart.js components
Chart.register(RadarController, LineElement, PointElement, RadialLinearScale, Tooltip, Legend);

export default defineComponent({
  name: 'JobClassSelector',
  mixins: [Ionic],
  props: {
    isOpen: {
      type: Boolean,
      required: true
    },
    modelValue: {
      type: String,
      required: true
    }
  },
  emits: ['update:modelValue', 'close'],
  setup(props, { emit }) {
    const jobClassOptions = ref(JOB_CLASS_OPTIONS);
    const statsRadar = ref<HTMLCanvasElement | null>(null);
    // Properly type the chart instance
    let radarChart: Chart | null = null;
    
    // Enhanced class descriptions
    const classDescriptions = {
      "Warrior": "A mighty fighter who excels in close combat. Warriors are front-line protectors who use their impressive strength and durability to shield allies while delivering devastating blows to enemies. Their unwavering courage and mastery of weapons make them formidable opponents on any battlefield.",
      "Mage": "A master of arcane energies who manipulates the elements. Mages harness the fundamental forces of nature to cast powerful spells that can devastate enemies from a distance. Their vast knowledge of the mystical arts allows them to control fire, ice, and lightning with unparalleled precision.",
      "Thief": "A nimble rogue skilled in stealth and precision. Thieves excel at finding opportunities where others see none, using their exceptional dexterity to strike at critical moments. Their mastery of shadows and sleight of hand makes them dangerous adversaries who can turn the tide of battle through cunning rather than brute force.",
      "Monk": "A disciplined fighter who channels inner energy. Monks pursue the perfection of body and mind through rigorous training and meditation. Their balanced approach to combat allows them to strike with lightning speed and surprising power, while maintaining awareness of their surroundings."
    };
    
    // More detailed class statistics (out of 10)
    const classStats = {
      "Warrior": { strength: 9, intelligence: 3, dexterity: 5, vitality: 9, defense: 8, magic: 2 },
      "Mage": { strength: 2, intelligence: 10, dexterity: 4, vitality: 3, defense: 3, magic: 10 },
      "Thief": { strength: 5, intelligence: 6, dexterity: 10, vitality: 4, defense: 4, magic: 5 },
      "Monk": { strength: 7, intelligence: 6, dexterity: 7, vitality: 6, defense: 6, magic: 6 }
    };
    
    // Class abilities with enhanced descriptions and icons
    const classAbilities = {
      "Warrior": [
        { name: "Mighty Strike", description: "Deliver a powerful blow that deals 150% weapon damage and has a chance to stun the target", icon: "fa-axe-battle" },
        { name: "Shield Wall", description: "Reduce all incoming damage by 30% for 10 seconds", icon: "fa-shield" },
        { name: "Battle Cry", description: "Increase strength and defense of all party members by 20% for 30 seconds", icon: "fa-volume" }
      ],
      "Mage": [
        { name: "Fireball", description: "Launch a ball of fire that deals high damage and leaves a burning effect", icon: "fa-fire-alt" },
        { name: "Frost Nova", description: "Create a wave of ice that freezes enemies for 5 seconds", icon: "fa-snowflake" },
        { name: "Arcane Shield", description: "Generate a protective barrier that absorbs 300 points of damage", icon: "fa-shield-magic" }
      ],
      "Thief": [
        { name: "Backstab", description: "Strike from the shadows dealing 200% damage and ignoring 50% of target's defense", icon: "fa-dagger" },
        { name: "Vanish", description: "Become invisible for 8 seconds, removing all threat and increasing movement speed", icon: "fa-ghost" },
        { name: "Poison Blade", description: "Coat weapons with toxin, causing targets to take damage over time", icon: "fa-flask-poison" }
      ],
      "Monk": [
        { name: "Flying Kick", description: "Leap forward with a powerful kick that deals damage and knocks back enemies", icon: "fa-boot" },
        { name: "Meditation", description: "Enter a state of deep focus, regenerating health and energy over time", icon: "fa-om" },
        { name: "Flurry of Blows", description: "Strike multiple times with increasing speed, each hit building combo points", icon: "fa-hand" }
      ]
    };
    
    // Difficulty rating for each class (1-5 scale)
    const classDifficulty = {
      "Warrior": 2,
      "Mage": 4,
      "Thief": 3,
      "Monk": 3
    };
    
    // Tags for each class that describe their playstyle
    const classTags = {
      "Warrior": ["Tank", "Melee", "Physical"],
      "Mage": ["DPS", "Ranged", "Magic"],
      "Thief": ["DPS", "Stealth", "Agility"],
      "Monk": ["Hybrid", "Melee", "Balance"]
    };
    
    // Class color themes
    const classThemes = {
      "Warrior": "#c0392b", // Red
      "Mage": "#2980b9",    // Blue
      "Thief": "#8e44ad",   // Purple
      "Monk": "#f39c12"     // Orange
    };
    
    // Get the icon for the selected class
    const getSelectedClassIcon = () => {
      if (!props.modelValue) return '';
      const selectedClass = jobClassOptions.value.find(job => job.name === props.modelValue);
      return selectedClass ? selectedClass.icon : '';
    };
    
    // Get an icon for an ability
    const getAbilityIcon = (ability: { icon?: string }) => {
      return `fad ${ability.icon || 'fa-sparkles'} fa-lg`;
    };
    
    // Select a class
    const selectClass = (className: string) => {
      emit('update:modelValue', className);
      // No longer dismiss immediately - allow user to see details and confirm
    };
    
    // Scroll the class carousel
    const scrollClasses = (direction: 'left' | 'right') => {
      const carousel = document.querySelector('.classes-carousel');
      if (carousel) {
        const scrollAmount = direction === 'left' ? -300 : 300;
        carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    };
    
    // Create and update radar chart for stats
    const updateRadarChart = () => {
      if (!props.modelValue || !statsRadar.value) return;
      
      const ctx = statsRadar.value?.getContext('2d');
      if (!ctx) return;
      
      const stats = classStats[props.modelValue];
      const theme = classThemes[props.modelValue];
      
      // Destroy previous chart if it exists
      if (radarChart) {
        radarChart.destroy();
      }
      
      radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
          labels: ['Strength', 'Intelligence', 'Dexterity', 'Vitality', 'Defense', 'Magic'],
          datasets: [{
            label: props.modelValue,
            data: [stats.strength, stats.intelligence, stats.dexterity, stats.vitality, stats.defense, stats.magic],
            backgroundColor: `${theme}33`, // With transparency
            borderColor: theme,
            borderWidth: 2,
            pointBackgroundColor: theme,
            pointRadius: 4
          }]
        },
        options: {
          scales: {
            r: {
              angleLines: {
                display: true,
                color: 'rgba(255, 255, 255, 0.2)'
              },
              suggestedMin: 0,
              suggestedMax: 10,
              ticks: {
                backdropColor: 'transparent',
                color: 'rgba(255, 255, 255, 0.7)'
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.2)'
              },
              pointLabels: {
                color: 'rgba(255, 255, 255, 0.8)',
                font: {
                  size: 12
                }
              }
            }
          },
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
    };
    
    // Watch for changes in the selected class or modal visibility
    watch(() => props.modelValue, () => {
      setTimeout(() => {
        updateRadarChart();
      }, 100);
    });
    
    watch(() => props.isOpen, (newVal) => {
      if (newVal) {
        setTimeout(() => {
          updateRadarChart();
        }, 300);
      }
    });
    
    onMounted(() => {
      if (props.isOpen && props.modelValue) {
        setTimeout(() => {
          updateRadarChart();
        }, 300);
      }
    });
    
    return {
      jobClassOptions,
      classDescriptions,
      classStats,
      classAbilities,
      classDifficulty,
      classTags,
      statsRadar,
      closeOutline,
      chevronBackOutline,
      chevronForwardOutline,
      getSelectedClassIcon,
      getAbilityIcon,
      selectClass,
      scrollClasses
    };
  }
});
</script>

<style lang="scss" scoped>
.job-class-selector {
  --width: 100%;
  --height: 100%;
  --border-radius: 0;
  font-family: 'Cinzel', serif;
}

.class-selector-content {
  --background: url('/src/assets/images/backgrounds/my-home.jpg') no-repeat center center / cover;
}

.selection-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1rem;
  
  @media (min-width: 768px) {
    flex-direction: row;
    align-items: stretch;
  }
}

/* Character Preview Section */
.character-preview {
  flex: 1;
  background: rgba(15, 15, 20, 0.7);
  border-radius: 12px;
  margin-bottom: 1rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  --background: transparent;
  --padding-start: 1.5rem;
  --padding-end: 1.5rem;
  --padding-top: 1.5rem;
  --padding-bottom: 1.5rem;
  
  @media (min-width: 768px) {
    margin-right: 1rem;
    margin-bottom: 0;
    max-width: 40%;
  }
}

.character-avatar {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 2rem;
  position: relative;
  transition: all 0.5s ease;
  
  &:after {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    box-shadow: 0 0 40px rgba(255, 255, 255, 0.3);
    animation: pulse 3s infinite;
    z-index: -1;
  }
  
  &.warrior {
    background: radial-gradient(circle, rgba(192, 57, 43, 0.3), rgba(192, 57, 43, 0.7));
    border: 2px solid #c0392b;
    &:after { box-shadow: 0 0 40px rgba(192, 57, 43, 0.6); }
  }
  
  &.mage {
    background: radial-gradient(circle, rgba(41, 128, 185, 0.3), rgba(41, 128, 185, 0.7));
    border: 2px solid #2980b9;
    &:after { box-shadow: 0 0 40px rgba(41, 128, 185, 0.6); }
  }
  
  &.thief {
    background: radial-gradient(circle, rgba(142, 68, 173, 0.3), rgba(142, 68, 173, 0.7));
    border: 2px solid #8e44ad;
    &:after { box-shadow: 0 0 40px rgba(142, 68, 173, 0.6); }
  }
  
  &.monk {
    background: radial-gradient(circle, rgba(243, 156, 18, 0.3), rgba(243, 156, 18, 0.7));
    border: 2px solid #f39c12;
    &:after { box-shadow: 0 0 40px rgba(243, 156, 18, 0.6); }
  }
}

.avatar-image {
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(30, 30, 40, 0.6);
  border-radius: 50%;
  
  i {
    font-size: 4rem;
    filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.7));
  }
}

.character-name {
  position: absolute;
  bottom: -30px;
  font-size: 1.5rem;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 0 10px rgba(0, 0, 0, 0.7);
}

.class-details {
  width: 100%;
  margin-top: 2rem;
}

.class-description {
  font-size: 1rem;
  line-height: 1.6;
  text-align: center;
  margin-bottom: 2rem;
  color: #ddd;
  font-style: italic;
  padding: 0 1rem;
}

.stats-radar-container {
  width: 100%;
  max-width: 300px;
  margin: 0 auto 2rem;
  padding: 1rem;
  background: rgba(25, 25, 35, 0.5);
  border-radius: 8px;
  box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.3);
}

.abilities-container {
  width: 100%;
  
  h3 {
    text-align: center;
    font-size: 1.3rem;
    margin-bottom: 1rem;
    position: relative;
    
    &:before, &:after {
      content: '★';
      position: absolute;
      top: 0;
    }
    
    &:before {
      left: 20%;
    }
    
    &:after {
      right: 20%;
    }
  }
}

.abilities-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ability-card {
  display: flex;
  align-items: flex-start;
  background: rgba(25, 25, 35, 0.5);
  border-radius: 8px;
  padding: 1rem;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  }
}

.ability-icon {
  width: 40px;
  height: 40px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
  
  i {
    font-size: 1.5rem;
    color: var(--ion-color-primary);
  }
}

.ability-details {
  flex: 1;
  
  h4 {
    margin: 0 0 0.5rem;
    font-size: 1.1rem;
    font-weight: bold;
  }
  
  p {
    margin: 0;
    font-size: 0.9rem;
    color: #bbb;
    line-height: 1.4;
  }
}

.confirm-button {
  margin-top: 2rem;
  --border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: bold;
  height: 48px;
}

/* Class Selection Section */
.class-selection {
  flex: 1;
  background: rgba(15, 15, 20, 0.7);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  
  @media (min-width: 768px) {
    max-width: 60%;
  }
}

.selection-title {
  text-align: center;
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  position: relative;
  
  &:after {
    content: '';
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 100px;
    height: 2px;
    background: var(--ion-color-primary);
  }
}

.classes-scroll-area {
  --background: transparent;
  --padding-start: 0;
  --padding-end: 0;
  height: 380px;
  margin-bottom: 1rem;
}

.classes-carousel {
  display: flex;
  gap: 1.5rem;
  padding: 1rem;
  height: 100%;
  
  &::-webkit-scrollbar {
    height: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--ion-color-primary);
    border-radius: 3px;
  }
}

.class-option {
  min-width: 220px;
  scroll-snap-align: center;
  background: rgba(30, 30, 40, 0.7);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  border: 2px solid transparent;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
  }
  
  &.selected {
    border-color: var(--ion-color-primary);
    background: rgba(40, 40, 55, 0.8);
    transform: translateY(-5px) scale(1.05);
    
    .class-icon-container .class-glow {
      opacity: 1;
    }
    
    .class-name {
      color: var(--ion-color-primary);
    }
  }
}

.class-icon-container {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  position: relative;
  transition: all 0.3s ease;
  
  &.warrior { background: rgba(192, 57, 43, 0.3); }
  &.mage { background: rgba(41, 128, 185, 0.3); }
  &.thief { background: rgba(142, 68, 173, 0.3); }
  &.monk { background: rgba(243, 156, 18, 0.3); }
  
  i {
    transition: transform 0.3s ease;
  }
  
  .class-glow {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    z-index: -1;
    opacity: 0;
    transition: opacity 0.3s ease;
    
    &:after {
      content: '';
      position: absolute;
      top: -5px;
      left: -5px;
      right: -5px;
      bottom: -5px;
      border-radius: 50%;
      background: transparent;
      z-index: -1;
      animation: glowing 2s infinite alternate;
    }
  }
  
  &.warrior .class-glow:after { box-shadow: 0 0 20px 5px rgba(192, 57, 43, 0.7); }
  &.mage .class-glow:after { box-shadow: 0 0 20px 5px rgba(41, 128, 185, 0.7); }
  &.thief .class-glow:after { box-shadow: 0 0 20px 5px rgba(142, 68, 173, 0.7); }
  &.monk .class-glow:after { box-shadow: 0 0 20px 5px rgba(243, 156, 18, 0.7); }
}

.class-option:hover .class-icon-container i {
  transform: scale(1.2);
}

.class-name {
  font-size: 1.3rem;
  font-weight: bold;
  margin-bottom: 1rem;
  text-align: center;
}

.difficulty-rating {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 0.75rem;
  
  .difficulty-label {
    font-size: 0.8rem;
    color: #bbb;
    margin-bottom: 0.25rem;
  }
  
  .stars {
    display: flex;
    gap: 3px;
    
    i {
      font-size: 0.9rem;
      color: gold;
    }
  }
}

.class-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  
  .tag {
    background: rgba(0, 0, 0, 0.3);
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.8rem;
    color: #ddd;
  }
}

.class-navigation {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 1.5rem;
  gap: 1rem;
  
  .nav-button {
    --padding-start: 0.5rem;
    --padding-end: 0.5rem;
    --border-radius: 50%;
    width: 40px;
    height: 40px;
  }
}

.pagination {
  display: flex;
  gap: 8px;
  
  .page-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    cursor: pointer;
    transition: all 0.3s ease;
    
    &.active {
      background: var(--ion-color-primary);
      transform: scale(1.2);
    }
    
    &:hover {
      background: rgba(255, 255, 255, 0.5);
    }
  }
}

/* Animations */
@keyframes pulse {
  0% {
    opacity: 0.4;
    transform: scale(0.98);
  }
  50% {
    opacity: 0.6;
    transform: scale(1);
  }
  100% {
    opacity: 0.4;
    transform: scale(0.98);
  }
}

@keyframes glowing {
  0% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}

/* Responsive Adjustments */
@media (max-width: 767px) {
  .selection-container {
    padding: 0.5rem;
  }
  
  .character-preview, .class-selection {
    padding: 1rem;
  }
  
  .character-avatar {
    width: 140px;
    height: 140px;
    margin-bottom: 1.5rem;
  }
  
  .avatar-image {
    width: 90px;
    height: 90px;
  }
  
  .classes-carousel {
    padding: 0.5rem;
  }
  
  .class-option {
    min-width: 180px;
    padding: 1rem;
  }
  
  .class-icon-container {
    width: 80px;
    height: 80px;
  }
}
</style>