<template>
  <ion-page>
    <ion-content>
      <!-- Battle Room Preview -->
      <div class="battleroom-container">
        <BattleField
          ref="battlegroundRef"
          :taskId="0"
          :enemyType="selectedEnemyType"
          :userId="String(selectedProfile?.userData?.id || 1)"
          :userName="selectedProfile?.name || 'Developer'"
          :beastAvatar="selectedBeast?.avatar || undefined"
          :showEnemyInfo="false"
          class="battleground-component"
        />
      </div>
    </ion-content>

    <!-- Battle Dialog Box (Earthbound-style) -->
    <div
      class="battle-dialog-overlay"
      v-if="showBattleDialog"
      @click="advanceBattleDialog"
    >
      <div class="battle-dialog-box rpg-box">
        <div class="dialog-content">
          <xp-typing-text
            ref="battleDialogText"
            :text="battleDialogText"
            :speed="25"
            :auto-start="true"
            :sound-theme="$fx?.theme?.rpg"
            sound-type="text"
            @typing-complete="onBattleDialogComplete"
            class="battle-text"
            :has-more-text="hasMoreBattleDialog"
          />
        </div>
        <div
          v-if="hasMoreBattleDialog"
          class="dialog-indicator"
        >
          <i class="fad fa-chevron-down blink"></i>
        </div>
      </div>
    </div>

    <!-- Victory Dialog Box (Special styling for victory messages) -->
    <div
      class="victory-dialog-overlay"
      v-if="showVictoryDialog"
      @click="advanceVictoryDialog"
    >
      <div class="victory-dialog-box rpg-box">
        <div
          class="victory-title"
          v-if="isShowingVictoryTitle"
        >You Won!</div>
        <div class="dialog-content">
          <xp-typing-text
            ref="victoryDialogText"
            :text="victoryDialogText"
            :speed="25"
            :auto-start="true"
            :sound-theme="$fx?.theme?.rpg"
            sound-type="text"
            @typing-complete="onVictoryDialogComplete"
            class="victory-text"
            :has-more-text="hasMoreVictoryDialog"
          />
        </div>
        <div
          v-if="hasMoreVictoryDialog"
          class="dialog-indicator"
        >
          <i class="fad fa-chevron-down blink"></i>
        </div>
      </div>
    </div>

    <!-- Configuration Toolbox FAB -->
    <DevToolsFab
      @open-profile-selector="openProfileSelector"
      @open-beast-selector="openBeastSelector"
      @open-controls-modal="openControlsModal"
    />

    <!-- Battle Actions FAB -->
    <BattleActionsFab
      @attack-animation="triggerAttackAnimation"
      @enemy-hit="triggerEnemyHit"
      @player-hit="triggerPlayerHit"
      @victory-animation="triggerVictoryAnimation"
      @defeat-animation="triggerDefeatAnimation"
      @reset-battle="resetBattle"
    />

    <!-- Dev Controls Modal -->
    <ion-modal
      ref="controlsModal"
      :is-open="isControlsModalOpen"
      @didDismiss="isControlsModalOpen = false"
    >
      <ion-header>
        <ion-toolbar>
          <ion-title>Development Controls</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="isControlsModalOpen = false">
              <ion-icon
                :icon="closeOutline"
                slot="icon-only"
              ></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-list>
          <!-- Task Enemy Visualization Section -->
          <ion-item-divider>
            <ion-label>Task Enemy Configuration</ion-label>
          </ion-item-divider>

          <ion-item>
            <ion-label>Task Type</ion-label>
            <ion-select
              v-model="selectedTaskType"
              @ionChange="changeTaskType"
            >
              <ion-select-option value="daily">Daily Chore</ion-select-option>
              <ion-select-option value="weekly">Weekly Task</ion-select-option>
              <ion-select-option value="project">Project Milestone</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-label>Task Difficulty</ion-label>
            <ion-range
              :min="1"
              :max="5"
              :step="1"
              v-model="taskDifficultyValue"
              @ionChange="onDifficultyChange"
              snaps
            >
              <ion-icon
                slot="start"
                size="small"
                :icon="easyIcon"
              ></ion-icon>
              <ion-icon
                slot="end"
                :icon="hardIcon"
              ></ion-icon>
            </ion-range>
          </ion-item>

          <ion-item>
            <ion-label>Enemy Health</ion-label>
            <ion-progress-bar
              :value="taskDifficulty / 5"
              :color="healthBarColor"
            ></ion-progress-bar>
          </ion-item>

          <ion-item>
            <ion-button
              expand="block"
              @click="simulateTaskProgress"
            >
              Simulate Task Progress
            </ion-button>
          </ion-item>

          <ion-item-divider>
            <ion-label>Battle Environment</ion-label>
          </ion-item-divider>

          <!-- Existing controls -->
          <ion-item>
            <ion-label>Enemy Type</ion-label>
            <ion-select
              v-model="selectedEnemyType"
              @ionChange="changeEnemyType"
            >
              <ion-select-option value="basic">Basic</ion-select-option>
              <ion-select-option value="miniboss">Mini Boss</ion-select-option>
              <ion-select-option value="boss">Boss</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-label>Battle State</ion-label>
            <ion-toggle
              v-model="battleActive"
              @ionChange="toggleBattleState"
            ></ion-toggle>
          </ion-item>

          <ion-item>
            <ion-button
              expand="block"
              @click="triggerBattle"
            >
              Trigger Battle
            </ion-button>
          </ion-item>
        </ion-list>

        <!-- Task Enemy Preview -->
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>Current Task Enemy</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <div class="task-enemy-preview">
              <h3>{{ currentTaskName }}</h3>
              <div class="enemy-health">
                <span>HP: {{ taskHealth }} / {{ maxTaskHealth }}</span>
                <ion-progress-bar
                  :value="taskHealth / maxTaskHealth"
                  :color="healthBarColor"
                ></ion-progress-bar>
              </div>
              <div class="enemy-status">
                <p><strong>Type:</strong> {{ taskTypeDisplay }}</p>
                <p><strong>Difficulty:</strong> {{ taskDifficultyDisplay }}</p>
                <p><strong>Rewards:</strong> {{ taskRewards }}</p>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Battle State Info -->
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>Battle State</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <pre>{{ battleStateJson }}</pre>
          </ion-card-content>
        </ion-card>
      </ion-content>
    </ion-modal>

    <!-- Beast Selector Modal -->
    <ion-modal
      ref="beastSelectorModal"
      :is-open="isBeastModalOpen"
      @didDismiss="isBeastModalOpen = false"
    >
      <ion-header>
        <ion-toolbar>
          <ion-title>Beast Selector</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="isBeastModalOpen = false">
              <ion-icon
                :icon="closeOutline"
                slot="icon-only"
              ></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-list>
          <ion-item-divider>
            <ion-label>Select Beast</ion-label>
          </ion-item-divider>

          <ion-item
            button
            v-for="beast in beasts"
            :key="beast.id"
            @click="selectBeast(beast)"
          >
            <ion-thumbnail
              slot="start"
              class="cursor-pointer"
            >
              <ion-img
                v-if="beast?.avatar"
                :src="getAvatar(beast.avatar)"
                class="w-full p-0 m-0"
              />
              <ion-skeleton-text
                v-else
                animated
              />
            </ion-thumbnail>
            <ion-label>
              <h2>{{ beast.name }}</h2>
              <p>{{ beast.checklist?.length || 0 }} Challenges</p>
            </ion-label>
          </ion-item>

          <ion-item v-if="beasts.length === 0">
            <ion-label class="ion-text-center">
              <p>Loading beasts or no beasts found...</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-modal>

    <!-- Profile Selector Modal -->
    <ion-modal
      ref="profileSelectorModal"
      :is-open="isProfileModalOpen"
      @didDismiss="isProfileModalOpen = false"
    >
      <ion-header>
        <ion-toolbar>
          <ion-title>Profile Selector</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="isProfileModalOpen = false">
              <ion-icon
                :icon="closeOutline"
                slot="icon-only"
              ></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-list>
          <ion-item-divider>
            <ion-label>Select Profile</ion-label>
          </ion-item-divider>

          <ion-item
            button
            v-for="profile in profiles"
            :key="profile.id"
            @click="selectProfile(profile)"
          >
            <ion-avatar
              slot="start"
              class="cursor-pointer"
            >
              <ion-img
                v-if="profile?.avatar"
                :src="profile.avatar"
                class="w-full p-0 m-0"
              />
              <ion-icon
                v-else
                :icon="personOutline"
                class="w-full p-2 text-gray-500"
              />
            </ion-avatar>
            <ion-label>
              <h2>{{ profile.name }}</h2>
              <p>{{ profile.role || 'User' }} - Level {{ profile.level || 1 }}</p>
            </ion-label>
            <ion-badge
              v-if="profile.id === selectedProfile?.id"
              color="primary"
              slot="end"
            >Selected</ion-badge>
          </ion-item>

          <ion-item v-if="profiles.length === 0">
            <ion-label class="ion-text-center">
              <p>Loading profiles or no profiles found...</p>
            </ion-label>
          </ion-item>

          <ion-item>
            <ion-button
              expand="block"
              fill="outline"
              @click="createNewProfile"
            >
              <ion-icon
                :icon="addOutline"
                slot="start"
              ></ion-icon>
              Create New Profile
            </ion-button>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script lang="ts" src="./BattleroomDevTools.ts"></script>
<style lang="scss" scoped src="./_BattleroomDevTools.scss"></style>