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

    <ion-content
      class="rpg-box class-selector-content bg-slide bg-slide-modal"
      :scrollY="true"
    >
      <div class="selection-container">
        <!-- 1. Class Selection Grid (Top) -->
        <div class="class-selection">
          <div class="classes-grid">
            <div
              v-for="job in jobClassOptions"
              :key="job.name"
              class="class-option"
              :class="{ 'selected': job.name === modelValue }"
              @click="selectClass(job.name)"
            >
              <div
                class="class-icon-container"
                :class="job.name.toLowerCase()"
              >
                <i :class="`fad ${job.icon} fa-2x`"></i>
              </div>
              <div class="class-name">{{ job.name }}</div>

              <!-- <div class="class-stats-peek">
                <div class="stat-peek">
                  <i :class="getAreaFaIcon(job.primaryPillar)"></i>
                  <span>{{ getAreaLabel(job.primaryPillar) }}</span>
                </div>
              </div> -->
            </div>
          </div>
        </div>

        <!-- 2. Selected Class Detail View (Bottom) -->
        <div
          class="character-preview"
          v-if="selectedJob"
        >
          <div class="class-details">
            <div class="class-description">
              {{ selectedJob.description }}
            </div>

            <div class="pillar-boosts-container">
              <div class="pillars-grid">
                <div class="pillar-item primary">
                  <div class="pillar-icon">
                    <i :class="getAreaFaIcon(selectedJob.primaryPillar)"></i>
                  </div>
                  <div class="pillar-info">
                    <span class="pillar-rank">Primary</span>
                    <span class="pillar-name">{{ getAreaLabel(selectedJob.primaryPillar) }}</span>
                  </div>
                </div>
                <div class="pillar-item secondary">
                  <div class="pillar-icon">
                    <i :class="getAreaFaIcon(selectedJob.secondaryPillar)"></i>
                  </div>
                  <div class="pillar-info">
                    <span class="pillar-rank">Secondary</span>
                    <span class="pillar-name">{{ getAreaLabel(selectedJob.secondaryPillar) }}</span>
                  </div>
                </div>
                <div class="pillar-item tertiary">
                  <div class="pillar-icon">
                    <i :class="getAreaFaIcon(selectedJob.tertiaryPillar)"></i>
                  </div>
                  <div class="pillar-info">
                    <span class="pillar-rank">Tertiary</span>
                    <span class="pillar-name">{{ getAreaLabel(selectedJob.tertiaryPillar) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ion-content>

    <ion-footer>
      <ion-toolbar class="rpg-box">
        <ion-button
          expand="block"
          color="primary"
          class="confirm-button"
          @click="$emit('close')"
        >
          <i class="fad fa-check-circle mr-2"></i>
          Confirm Selection
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-modal>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { JOB_CLASS_OPTIONS } from "@/constants";
import { closeOutline } from 'ionicons/icons';
import Ionic from '@/mixins/ionic';

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
    
    const selectedJob = computed(() => 
      jobClassOptions.value.find(job => job.name === props.modelValue)
    );

    // Pillar helpers matching UserProfileModal
    const getAreaLabel = (pillar: string) => {
      const labels: Record<string, string> = {
        physical: 'Body',
        mental: 'Mind',
        vibrational: 'Spirit',
        relational: 'Heart',
        eternal: 'Legend'
      };
      return labels[pillar] || pillar;
    };

    const getAreaFaIcon = (pillar: string) => {
      const iconMap: Record<string, string> = {
        physical: 'fad fa-heartbeat',
        mental: 'fad fa-brain',
        vibrational: 'fad fa-waveform',
        eternal: 'fad fa-atom',
        relational: 'fad fa-handshake-alt'
      };
      return iconMap[pillar] || 'fad fa-chart-bar';
    };
    
    // Get the icon for the selected class
    const getSelectedClassIcon = () => {
      if (!props.modelValue) return '';
      const selectedClass = jobClassOptions.value.find(job => job.name === props.modelValue);
      return selectedClass ? selectedClass.icon : '';
    };
    
    // Select a class
    const selectClass = (className: string) => {
      emit('update:modelValue', className);
    };
    
    return {
      jobClassOptions,
      selectedJob,
      getAreaLabel,
      getAreaFaIcon,
      closeOutline,
      getSelectedClassIcon,
      selectClass
    };
  }
});
</script>

<style lang="scss" scoped>
  @use "@/styles/themes/earthbound" as eb;

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
    padding: 1rem;
    padding-bottom: 2rem;
  }

  /* Character Preview Section */
  .character-preview {
    background: transparent;
    padding: 0.5rem;
    margin-bottom: 1.5rem;
  }



  .class-details {
    width: 100%;
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

  .pillar-boosts-container {
    width: 100%;
    margin-top: 1rem;

    h3 {
      text-align: center;
      font-size: 1.2rem;
      margin-bottom: 1.5rem;
      color: eb.$eb-color-pale-yellow;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
  }

  .pillars-grid {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    flex-grow: 1;
    gap: 1rem;
    background: rgba(25, 25, 35, 0.4);
    // padding: 1.5rem;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .pillar-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    border-left: 4px solid transparent;
    transition: all 0.3s ease;

    flex: 1;

    &.primary {
      border-left-color: #ff5252;

      .pillar-icon i {
        color: #ff5252;
      }
    }

    &.secondary {
      border-left-color: #40c4ff;

      .pillar-icon i {
        color: #40c4ff;
      }
    }

    &.tertiary {
      border-left-color: #69f0ae;

      .pillar-icon i {
        color: #69f0ae;
      }
    }

    .pillar-icon {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 50%;
      font-size: 1.5rem;
    }

    .pillar-info {
      display: flex;
      flex-direction: column;
    }

    .pillar-rank {
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      opacity: 0.6;
    }

    .pillar-name {
      font-size: 1.1rem;
      font-weight: 700;
      color: #fff;
    }
  }



  .confirm-button {
    --border-radius: 8px;
    text-transform: uppercase;
    letter-spacing: 2px;
    font-weight: 800;
    height: 52px;
    font-size: 1.1rem;
    margin: 0.5rem 1rem;
  }

  .rpg-box-footer {
    --background: rgba(15, 15, 20, 0.95);
    border-top: 2px solid rgba(255, 255, 255, 0.1);

    ion-toolbar {
      --background: transparent;
      padding: 0.5rem 0;
    }
  }

  /* Class Selection Section */
  .class-selection {
    background: transparent;
    border-radius: 12px;
    padding: 0.5rem;
    margin-bottom: 2rem;
  }

  .classes-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
    // padding: 0.5rem;
    perspective: 1000px;
  }







  .class-option {
    background: rgba(30, 30, 45, 0.4);
    border-radius: 16px;
    padding: 1.5rem 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    position: relative;
    border: 2px solid rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(5px);

    &:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
    }

    &.selected {
      border-color: eb.$eb-color-pale-yellow;
      background: rgba(104, 208, 184, 0.3);
      transform: scale(1.05);
      box-shadow: 0 0 25px rgba(104, 208, 184, 0.4);

      .class-name {
        color: eb.$eb-color-pale-yellow;
        text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
      }
    }
  }

  .class-icon-container {
    width: 70px;
    height: 70px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
    position: relative;
    transition: all 0.3s ease;

    &.warrior {
      background: rgba(192, 57, 43, 0.2);
      color: #ff5252;
    }

    &.mage {
      background: rgba(41, 128, 185, 0.2);
      color: #40c4ff;
    }

    &.thief {
      background: rgba(142, 68, 173, 0.2);
      color: #69f0ae;
    }

    &.monk {
      background: rgba(243, 156, 18, 0.2);
      color: #ffd740;
    }

    i {
      font-size: 2.5rem;
      transition: transform 0.3s ease;
    }
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

  .class-stats-peek {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 0.5rem;

    .stat-peek {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 1rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 20px;
      font-size: 0.75rem;
      color: eb.$eb-color-cream;
      border: 1px solid rgba(255, 255, 255, 0.1);

      i {
        font-size: 0.9rem;
      }

      span {
        text-transform: uppercase;
        letter-spacing: 1px;
        font-weight: 700;
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

    .character-preview,
    .class-selection {
      // padding: 1rem;
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