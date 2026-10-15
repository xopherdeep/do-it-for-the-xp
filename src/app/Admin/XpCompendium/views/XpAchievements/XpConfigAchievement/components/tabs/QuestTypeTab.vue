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
          <QuestSuggestionList
            v-if="isChanging"
            :entries="otherSuggestions"
            :portrait-url="portraitUrl"
            @choose="choose"
            @browse="browseBestiary"
          />
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
import QuestSuggestionList from "./QuestSuggestionList.vue";
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

<style lang="scss" scoped src="./_QuestTypeTab.scss" />
