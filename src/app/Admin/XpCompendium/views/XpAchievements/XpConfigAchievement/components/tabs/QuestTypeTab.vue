<template>
  <ion-page class="quest-type-tab">
    <ion-content class="bg-slide bg-slide-dark" :fullscreen="true">
      <div class="content-wrapper">
        <!-- Splash Header -->
        <XpSplashHeader v-model="achievement.achievementName" :icon="activeLoreCombo.icon"
          :tagline="activeLoreCombo.tagline" placeholder="Name Your Quest..." />

        <div class="tab-content">
          <!-- TYPE SELECTOR -->
          <div class="section-card">
            <h3 class="section-title">Adventure Type</h3>
            <div class="type-grid">
              <div v-for="type in achievementTypes" :key="type.value" :class="[
                'type-option',
                { selected: adventureType === type.value },
              ]" @click="adventureType = type.value">
                <i :class="['fad', type.icon, 'type-icon']"></i>
                <span class="type-name">{{ type.name }}</span>
                <span class="type-desc">{{ type.text }}</span>

                <div class="check-mark" v-if="adventureType === type.value">
                  <i class="fas fa-check-circle"></i>
                </div>
              </div>
            </div>
          </div>

          <!-- DYNAMIC CONTENT AREA -->

          <!-- BEAST SELECTOR -->
          <div v-if="adventureType === 'beast'" class="dynamic-section beast-section">
            <div class="section-header">
              <i class="fad fa-dragon section-icon text-danger"></i>
              <div>
                <h3>Select The Threat</h3>
                <p>Choose the beast to be hunted.</p>
              </div>
            </div>

            <div class="beast-grid">
              <template v-if="beasts.length > 0">
                <ion-grid class="ion-no-padding">
                  <ion-row>
                    <!-- Generate Beast Card (AI) -->
                    <ion-col size="4" size-md="4">
                      <div class="beast-column-content">
                        <div class="beast-card-wrapper generate-beast-card" :class="{ loading: isGeneratingBeast }"
                          @click="generateBeastWithAI">
                          <div class="generate-beast-content">
                            <i v-if="isGeneratingBeast" class="fad fa-spinner-third fa-spin fa-3x"></i>
                            <i v-else class="fad fa-sparkles fa-3x"></i>
                            <span class="generate-label">{{ isGeneratingBeast ? 'Generating...' : 'AI Generate'
                              }}</span>
                            <span class="generate-hint">Create a random beast</span>
                          </div>
                        </div>
                        <div class="beast-name-spacer"></div>
                      </div>
                    </ion-col>
                    <!-- Existing Beasts -->
                    <ion-col size="4" size-md="4" v-for="beast in beasts" :key="beast.id">
                      <div :class="[
                        'beast-card-wrapper',
                        { selected: achievement.beastId === beast.id },
                      ]" @click="achievement.beastId = beast.id">
                        <XpBeastSelectorItem :id="beast.id" :name="beast.name" :avatar="beast.avatar" :bg1="beast.bg1"
                          :bg2="beast.bg2" :selected="achievement.beastId === beast.id" />
                        <!-- Edit Button -->
                        <div v-if="achievement.beastId === beast.id" class="edit-beast-badge"
                          @click.stop="editBeast(beast.id)">
                          <i class="fad fa-edit"></i>
                        </div>
                      </div>
                    </ion-col>
                  </ion-row>
                </ion-grid>
              </template>

              <div v-else class="empty-state beast-empty-state text-center">
                <i class="fad fa-dragon fa-4x mb-3 text-medium"></i>
                <h3>No Beasts Found</h3>
                <p>You need a nemesis to fight! Create one now.</p>
                <div class="empty-state-buttons">
                  <ion-button @click="generateBeastWithAI" class="mt-4" color="tertiary" :disabled="isGeneratingBeast">
                    <i v-if="isGeneratingBeast" class="fad fa-spinner-third fa-spin mr-2"></i>
                    <i v-else class="fad fa-sparkles mr-2"></i>
                    {{ isGeneratingBeast ? 'Generating...' : 'AI Generate' }}
                  </ion-button>
                  <ion-button @click="createBeast" class="mt-4" color="danger">
                    <i class="fas fa-plus mr-2"></i>
                    Create Manually
                  </ion-button>
                </div>
              </div>
            </div>
          </div>

          <!-- CHAIN SELECTOR -->
          <div v-if="adventureType === 'chain'" class="dynamic-section chain-section">
            <div class="section-header">
              <i class="fad fa-link section-icon text-warning"></i>
              <div>
                <h3>Build The Chain</h3>
                <p>Select achievements to link together.</p>
              </div>
            </div>

            <ion-list class="chain-list">
              <ion-item class="chain-select-item">
                <ion-label position="stacked">Linked Quests</ion-label>
                <ion-select v-model="achievement.subAchievementIds" multiple mode="ios" placeholder="Select links...">
                  <ion-select-option v-for="quest in availableAchievements" :key="quest.id" :value="quest.id">
                    {{ quest.achievementName }}
                  </ion-select-option>
                </ion-select>
              </ion-item>
            </ion-list>
          </div>

          <!-- SIMPLE ERRAND -->
          <div v-if="adventureType === 'simple'" class="dynamic-section simple-section text-center">
            <div class="empty-state">
              <i class="fad fa-feather-alt fa-4x mb-3 text-success"></i>
              <h3>Peaceful Errand</h3>
              <p>
                No threats detected. This is a skill challenge or simple chore.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { inject, computed, ref } from "vue";
import { useRouter } from "vue-router";
import {
  IonPage,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonList,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonButton,
  toastController,
} from "@ionic/vue";
import XpSplashHeader from "@/components/atoms/SplashHeader/XpSplashHeader.vue";
import XpBeastSelectorItem from "@/app/Admin/XpCompendium/views/XpBestiary/components/XpBeastSelectorItem.vue";
import { AchievementFormInjectionKey } from "../../hooks/useAchievementForm";
import { generateFullBeast, isGeminiConfigured } from "@/lib/services/ai/GeminiService";
import BestiaryDb, { beastStorage, Beast } from "@/lib/databases/BestiaryDb";

const {
  achievement,
  activeLoreCombo,
  achievementTypes,
  adventureType,
  beasts,
  achievements,
  loadData,
} = inject(AchievementFormInjectionKey)!;

const router = useRouter();
const bestiaryDb = new BestiaryDb(beastStorage);
const isGeneratingBeast = ref(false);

// Dynamic avatar count (will be updated when we add dynamic avatar support)
const MAX_AVATARS = 73;
const MAX_BACKGROUNDS = 328;

const createBeast = () => {
  router.push({ name: "xp-create-update-beast" });
};

const editBeast = (beastId: string) => {
  router.push({ name: "xp-create-update-beast", params: { id: beastId } });
};

const availableAchievements = computed(() => {
  return achievements.value.filter((a) => a.id !== achievement.value.id);
});

const generateBeastWithAI = async () => {
  if (!isGeminiConfigured()) {
    const toast = await toastController.create({
      message: 'AI not configured. Add VUE_APP_GEMINI_API_KEY to your .env file.',
      duration: 3000,
      color: 'warning',
      position: 'top',
    });
    await toast.present();
    return;
  }

  isGeneratingBeast.value = true;

  try {
    // Use the quest name as theme if available, so AI generates relevant tasks
    const questName = achievement.value.achievementName?.trim();
    const result = await generateFullBeast({
      theme: questName || undefined
    });

    if (result.success && result.name && result.checklist) {
      // Create a new beast with random avatar and background
      const newBeast: Beast = {
        id: '', // Will be generated by setBeast
        name: result.name,
        checklist: result.checklist,
        avatar: Math.floor(Math.random() * MAX_AVATARS) + 1,
        bg1: Math.floor(Math.random() * MAX_BACKGROUNDS),
        bg2: Math.floor(Math.random() * MAX_BACKGROUNDS),
        aspectRatio: 64,
      };

      // Save the beast
      await bestiaryDb.setBeast(newBeast);

      // Reload the beasts list
      await loadData();

      // Auto-select the newly created beast (it will be the last one)
      const allBeasts = await bestiaryDb.getAll();
      const createdBeast = allBeasts.find(b => b.name === result.name);
      if (createdBeast) {
        achievement.value.beastId = createdBeast.id;
      }

      const toast = await toastController.create({
        message: `✨ Created: ${result.name}!`,
        duration: 2000,
        color: 'success',
        position: 'top',
      });
      await toast.present();
    } else {
      const toast = await toastController.create({
        message: result.error || 'Failed to generate beast',
        duration: 3000,
        color: 'danger',
        position: 'top',
      });
      await toast.present();
    }
  } catch (error) {
    console.error('Error generating beast:', error);
    const toast = await toastController.create({
      message: 'Something went wrong. Please try again.',
      duration: 3000,
      color: 'danger',
      position: 'top',
    });
    await toast.present();
  } finally {
    isGeneratingBeast.value = false;
  }
};
</script>

<style lang="scss" scoped>
.tab-content {
  padding: 16px;
  max-width: 800px;
  margin: 0 auto;
}

.section-card {
  background: rgba(var(--ion-color-step-50-rgb), 0.5);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 24px;
  border: 1px solid rgba(255, 255, 255, 0.05);

  .section-title {
    font-family: "Press Start 2P";
    font-size: 0.8rem;
    color: var(--ion-color-medium);
    margin-bottom: 16px;
    text-transform: uppercase;
  }
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.type-option {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid transparent;
  border-radius: 12px;
  padding: 16px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;

  .type-icon {
    font-size: 1.8rem;
    margin-bottom: 8px;
    color: var(--ion-color-medium);
  }

  .type-name {
    font-weight: 600;
    font-size: 0.85rem;
    margin-bottom: 4px;
  }

  .type-desc {
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.5);
    line-height: 1.2;
    display: none; // Hide on small screens, show on larger?

    @media (min-width: 400px) {
      display: block;
    }
  }

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  &.selected {
    background: rgba(var(--ion-color-primary-rgb), 0.15);
    border-color: var(--ion-color-primary);

    .type-icon,
    .type-name {
      color: var(--ion-color-primary);
    }
  }

  .check-mark {
    position: absolute;
    top: -6px;
    right: -6px;
    background: var(--background);
    border-radius: 50%;
    color: var(--ion-color-success);
    font-size: 1.2rem;
  }
}

/* Dynamic Sections */
.dynamic-section {
  animation: slideUp 0.3s ease-out;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  padding: 0 8px;

  .section-icon {
    font-size: 2rem;
  }

  h3 {
    margin: 0;
    font-family: var(--xp-font-heading);
    font-size: 1.1rem;
  }

  p {
    margin: 2px 0 0;
    font-size: 0.85rem;
    color: var(--ion-color-medium);
  }
}

.text-danger {
  color: var(--ion-color-danger);
}

.text-warning {
  color: var(--ion-color-warning);
}

.text-success {
  color: var(--ion-color-success);
}

/* Beast Grid */
.beast-grid {
  ion-col {
    padding: 6px;
  }
}

.beast-card-wrapper {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.02);
  }

  &.selected {
    border-color: var(--ion-color-danger);
    box-shadow: 0 0 15px rgba(var(--ion-color-danger-rgb), 0.3);
  }
}

.edit-beast-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: var(--ion-color-primary);
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.1);
    background: var(--ion-color-primary-shade);
  }

  i {
    font-size: 0.9rem;
  }
}

/* Chain List */
.chain-list {
  background: transparent;

  .chain-select-item {
    --background: rgba(var(--ion-color-step-50-rgb), 0.5);
    --border-radius: 12px;
    --padding-start: 16px;
    margin-bottom: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
}

/* Simple Errand */
.empty-state {
  padding: 40px;
  background: rgba(var(--ion-color-step-50-rgb), 0.3);
  border-radius: 20px;
  border: 2px dashed rgba(255, 255, 255, 0.1);

  h3 {
    font-family: var(--xp-font-heading);
    margin-bottom: 8px;
  }

  p {
    color: var(--ion-color-medium);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}


/* Generate Beast Card */
.beast-column-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.beast-name-spacer {
  height: 24px;
}

.generate-beast-card {
  background: linear-gradient(145deg,
      rgba(var(--ion-color-tertiary-rgb), 0.2) 0%,
      rgba(var(--ion-color-primary-rgb), 0.15) 100%);
  border: 4px dashed rgba(var(--ion-color-tertiary-rgb), 0.5) !important;
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: linear-gradient(145deg,
        rgba(var(--ion-color-tertiary-rgb), 0.3) 0%,
        rgba(var(--ion-color-primary-rgb), 0.25) 100%);
    border-color: var(--ion-color-tertiary) !important;
  }

  &.loading {
    opacity: 0.7;
    pointer-events: none;
  }
}

.generate-beast-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  color: var(--ion-color-tertiary);
  padding: 16px;

  i {
    color: var(--ion-color-tertiary);
  }

  .generate-label {
    font-family: "Press Start 2P";
    font-size: 0.6rem;
    text-transform: uppercase;
  }

  .generate-hint {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.5);
  }
}

.empty-state-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}
</style>
