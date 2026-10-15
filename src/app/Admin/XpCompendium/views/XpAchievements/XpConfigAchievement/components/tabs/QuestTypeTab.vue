<template>
  <!-- Step 1, What's the chore?: the category, what the kind means, and the beast or the chain it needs. The name and the
       Normal / Beast / Chain segments are at the bottom of the step (XpConfigAchievement), in thumb reach. -->
  <div class="quest-type-tab" data-test="step-chore">
    <xp-app-section>
      <xp-app-row
        icon="tags"
        title="Category"
        :subtitle="categoryName"
        data-test="category-row"
        @click="addCategoryModalOpen = true"
      />
    </xp-app-section>

    <p class="kind-note" data-test="kind-note">
      <i :class="['fad', `fa-${activeKind.icon}`]" aria-hidden="true"></i>
      <span>{{ activeKind.hint }}</span>
    </p>

    <div class="chore-kind">
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
                        <i v-else-if="!pro.isPro" class="fad fa-lock fa-3x"></i>
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
                <i v-else-if="!pro.isPro" class="fad fa-lock mr-2"></i>
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
        <!-- The library's suggestion for a quest with no beast; the quest takes it when it is saved -->
        <div v-if="suggestedBeast" class="suggestion-card" data-test="beast-suggestion">
          <div class="suggestion-main">
            <img
              v-if="portraitUrl(suggestedBeast)"
              :src="portraitUrl(suggestedBeast)"
              :alt="suggestedBeast.name"
              class="suggestion-portrait"
            />
            <i v-else class="fad fa-dragon suggestion-portrait suggestion-portrait-empty"></i>
            <div class="suggestion-text">
              <span class="suggestion-kicker">Suggested beast</span>
              <strong class="suggestion-name" data-test="suggested-name">{{ suggestedBeast.name }}</strong>
              <span class="suggestion-hint">It joins your bestiary when the quest is saved, and the quest becomes a fight.</span>
            </div>
          </div>
          <div class="suggestion-actions">
            <ion-button fill="outline" color="primary" data-test="beast-change" @click="isChanging = !isChanging">
              Change
            </ion-button>
            <ion-button fill="clear" color="medium" data-test="beast-none" @click="decline">
              No beast
            </ion-button>
          </div>
          <div v-if="isChanging" class="suggestion-list">
            <button
              v-for="entry in otherSuggestions"
              :key="String(entry.id)"
              type="button"
              class="suggestion-option"
              @click="choose(entry)"
            >
              <img v-if="portraitUrl(entry)" :src="portraitUrl(entry)" alt="" class="suggestion-option-portrait" />
              <span class="suggestion-option-text">
                <strong>{{ entry.name }}</strong>
                <span v-if="'chore' in entry">{{ entry.chore }}</span>
              </span>
            </button>
            <button type="button" class="suggestion-option suggestion-browse" @click="browseBestiary">
              <i class="fad fa-paw-claws"></i>
              <span class="suggestion-option-text"><strong>Choose from my bestiary</strong></span>
            </button>
          </div>
        </div>

        <div v-else class="empty-state">
          <i class="fad fa-feather-alt fa-4x mb-3 text-success"></i>
          <h3>Peaceful Errand</h3>
          <p>
            No threats detected. This is a skill challenge or simple chore.
          </p>
          <ion-button v-if="isBeastDeclined" fill="clear" color="medium" data-test="beast-allow" @click="restoreSuggestion">
            Suggest a beast
          </ion-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, computed, ref } from "vue";
import { useRouter } from "vue-router";
import {
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
import XpAppRow from "@/components/organisms/XpApp/XpAppRow.vue";
import XpAppSection from "@/components/organisms/XpApp/XpAppSection.vue";
import XpBeastSelectorItem from "@/app/Admin/XpCompendium/views/XpBestiary/components/XpBeastSelectorItem.vue";
import { AchievementFormInjectionKey } from "../../hooks/useAchievementForm";
import { QUEST_KINDS } from "../../../questConfigWizard";
import { generateFullBeast } from "@/lib/services/ai/GeminiService";
import { useProStore } from "@/lib/store/stores/pro";
import BestiaryDb, { beastStorage, Beast } from "@/lib/databases/BestiaryDb";
import type { LibraryEntry } from "@/lib/services/bestiary/librarySuggest";

const {
  achievement,
  adventureType,
  beasts,
  achievements,
  categories,
  addCategoryModalOpen,
  loadData,
  suggestedBeast,
  beastSuggestions,
  isBeastDeclined,
  selectSuggestion,
  dismissSuggestion,
  restoreSuggestion,
} = inject(AchievementFormInjectionKey)!;

const router = useRouter();
const pro = useProStore();

// The category the quest is filed under: the row shows it, a tap opens the category list
const categoryName = computed(
  () => categories.value.find((category) => category.id === achievement.value.categoryId)?.name || "Pick a category"
);

// What the chosen kind means, under the row (the segments themselves are at the bottom of the step)
const activeKind = computed(() => QUEST_KINDS.find((kind) => kind.value === adventureType.value) ?? QUEST_KINDS[0]);

const bestiaryDb = new BestiaryDb(beastStorage);
const isGeneratingBeast = ref(false);

// Dynamic avatar count (will be updated when we add dynamic avatar support)
const MAX_AVATARS = 73;
const MAX_BACKGROUNDS = 328;

// "Change" opens the other library beasts that fit the quest's name
const isChanging = ref(false);
const otherSuggestions = computed(() =>
  beastSuggestions.value.filter((entry) => String(entry.id) !== String(suggestedBeast.value?.id))
);

const portraitUrl = (entry: LibraryEntry): string | null => {
  const avatar = entry.avatar;
  if (!avatar) return null;
  try {
    return require(`@/assets/images/beasts/${avatar.toString().padStart(3, "0")}.webp`);
  } catch {
    return null; // no picture for this number: the card shows the dragon icon
  }
};

const choose = async (entry: LibraryEntry) => {
  isChanging.value = false;
  await selectSuggestion(entry);
};

const decline = () => {
  isChanging.value = false;
  dismissSuggestion();
};

const browseBestiary = () => {
  isChanging.value = false;
  adventureType.value = "beast";
};

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
  const hasPro = await pro.requirePro("aiHelpers");
  if (!hasPro) return;

  isGeneratingBeast.value = true;

  try {
    // Use the quest name as theme if available, so AI generates relevant tasks
    const questName = achievement.value.achievementName?.trim();
    const result = await generateFullBeast({
      theme: questName || undefined
    });

    const generatedName = result.name;
    const generatedChecklist = result.checklist;
    const isBeastGenerated = result.success && !!generatedName && !!generatedChecklist;
    if (isBeastGenerated) {
      // Create a new beast with random avatar and background
      const newBeast: Beast = {
        id: '', // Will be generated by setBeast
        name: generatedName,
        checklist: generatedChecklist,
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
.quest-type-tab {
  padding: 0 12px 8px;
  color: var(--xp-app-text);
}

// What the chosen kind means, in the cream of the app
.kind-note {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px 4px 14px;
  color: var(--xp-app-text);
  font-size: 0.9rem;
  line-height: 1.3;

  i {
    flex: 0 0 auto;
    color: var(--xp-app-accent);
    font-size: 1.3rem;
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
    font-family: var(--xp-app-font-title);
    font-size: 1.1rem;
  }

  p {
    margin: 2px 0 0;
    font-size: 0.85rem;
    color: var(--xp-app-text-dim);
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
    --background: var(--xp-app-surface);
    --border-radius: 12px;
    --padding-start: 16px;
    margin-bottom: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
}

/* Simple Errand */
.empty-state {
  padding: 40px;
  background: var(--xp-app-surface);
  border-radius: 20px;
  border: 2px dashed rgba(255, 255, 255, 0.1);

  h3 {
    font-family: var(--xp-app-font-title);
    margin-bottom: 8px;
  }

  p {
    color: var(--xp-app-text-dim);
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
    font-family: var(--xp-app-font-title);
    font-size: 0.6rem;
    text-transform: uppercase;
  }

  .generate-hint {
    font-size: 0.7rem;
    color: var(--xp-app-text-dim);
  }
}

.empty-state-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}

/* Suggested beast */
.suggestion-card {
  text-align: left;
  background: var(--xp-app-surface);
  border-radius: 16px;
  border: 2px solid rgba(var(--ion-color-danger-rgb), 0.45);
  padding: 16px;
}

.suggestion-main {
  display: flex;
  align-items: center;
  gap: 16px;
}

.suggestion-portrait {
  flex: 0 0 72px;
  width: 72px;
  height: 72px;
  object-fit: contain;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.15);

  &.suggestion-portrait-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    color: var(--ion-color-danger);
  }
}

.suggestion-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.suggestion-kicker {
  font-family: var(--xp-app-font-title);
  font-size: 0.55rem;
  text-transform: uppercase;
  color: var(--xp-app-text-dim);
}

.suggestion-name {
  font-family: var(--xp-app-font-title);
  font-size: 1.2rem;
}

.suggestion-hint {
  font-size: 0.75rem;
  color: var(--xp-app-text-dim);
  line-height: 1.25;
}

.suggestion-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;

  ion-button {
    flex: 1;
    margin: 0;
    min-height: 44px;
  }
}

.suggestion-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.suggestion-option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 52px;
  padding: 6px 10px;
  text-align: left;
  color: inherit;
  font: inherit;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--xp-app-accent);
  }

  i {
    width: 40px;
    text-align: center;
    font-size: 1.4rem;
  }
}

.suggestion-option-portrait {
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.suggestion-option-text {
  display: flex;
  flex-direction: column;
  min-width: 0;

  span {
    font-size: 0.75rem;
    color: var(--xp-app-text-dim);
  }
}
</style>
