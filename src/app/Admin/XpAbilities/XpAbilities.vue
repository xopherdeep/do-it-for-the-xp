<template>
  <ion-page
    :class="$options.name"
    style="background: transparent"
  >
    <ion-header>
      <ion-toolbar class="icon-colors rpg-box">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/game-master" />
        </ion-buttons>
        <i
          slot="start"
          class="fad fa-book-spells fa-2x"
        />
        <ion-title>
          Powers
        </ion-title>
        <ion-buttons slot="end">
          <ion-button @click="toggleViewMode">
            <ion-icon :icon="viewMode === 'list' ? gridOutline : listOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment
          v-model="currentFilter"
          @ionChange="filterAbilities"
        >
          <ion-segment-button value="all">
            <ion-icon :icon="albumsOutline"></ion-icon>
            <ion-label>All</ion-label>
          </ion-segment-button>
          <ion-segment-button value="real-life">
            <ion-icon :icon="homeOutline"></ion-icon>
            <ion-label>IRL</ion-label>
          </ion-segment-button>
          <ion-segment-button value="in-game">
            <ion-icon :icon="gameControllerOutline"></ion-icon>
            <ion-label>Game</ion-label>
          </ion-segment-button>
          <ion-segment-button value="presets">
            <ion-icon :icon="starOutline"></ion-icon>
            <ion-label>Presets</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
      <ion-toolbar v-if="currentFilter === 'in-game'">
        <ion-segment
          v-model="classFilter"
          @ionChange="filterByClass"
        >
          <ion-segment-button value="all">All</ion-segment-button>
          <ion-segment-button value="time-mage">Time Mage</ion-segment-button>
          <ion-segment-button value="black-mage">Black Mage</ion-segment-button>
          <ion-segment-button value="white-mage">White Mage</ion-segment-button>
          <ion-segment-button value="technician">Technician</ion-segment-button>
          <ion-segment-button value="other">Other</ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content
      class="transparent-content"
      style="--background: transparent"
    >
      <!-- Loading State -->
      <div
        v-if="isLoading"
        class="loading-wrapper-centered"
      >
        <XpLoading />
      </div>

      <!-- Enhanced Ability Manager Component -->
      <XpAbilityManager
        v-else
        :abilities="filteredAbilities"
        :view-mode="viewMode"
        :ability-statuses="abilityStatuses"
        :unlock-statuses="unlockStatuses"
        @edit-ability="navigateToEditAbility"
        @view-mode-change="viewMode = $event"
      />

      <!-- Icon Picker Modal -->
      <ion-modal
        :is-open="showIconPicker"
        @didDismiss="closeIconPicker"
      >
        <ion-header>
          <ion-toolbar>
            <ion-title>Select an Icon</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeIconPicker">
                <ion-icon :icon="closeOutline" />
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <XpIconPicker
          :initial-icon="selectedIconName"
          @select="selectIcon"
        />
      </ion-modal>

      <!-- Preset Abilities Modal -->
      <ion-modal
        :is-open="showPresetModal"
        @didDismiss="closePresetModal"
      >
        <ion-header>
          <ion-toolbar>
            <ion-title>Preset Abilities</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closePresetModal">
                <ion-icon :icon="closeOutline" />
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-list>
            <ion-item-group>
              <ion-item-divider>
                <ion-label>Time Mage Abilities</ion-label>
              </ion-item-divider>
              <ion-item
                v-for="preset in timeMagePresets"
                :key="preset.id"
                button
                @click="addPreset(preset)"
              >
                <ion-icon
                  :icon="getAbilityIcon(preset)"
                  slot="start"
                />
                <ion-label>
                  <h2>{{ preset.name }}</h2>
                  <p>{{ preset.description }}</p>
                </ion-label>
                <ion-checkbox
                  slot="end"
                  :checked="isPresetAdded(preset.id)"
                ></ion-checkbox>
              </ion-item>
            </ion-item-group>

            <ion-item-group>
              <ion-item-divider>
                <ion-label>Technician Abilities</ion-label>
              </ion-item-divider>
              <ion-item
                v-for="preset in techMagePresets"
                :key="preset.id"
                button
                @click="addPreset(preset)"
              >
                <ion-icon
                  :icon="getAbilityIcon(preset)"
                  slot="start"
                />
                <ion-label>
                  <h2>{{ preset.name }}</h2>
                  <p>{{ preset.description }}</p>
                </ion-label>
                <ion-checkbox
                  slot="end"
                  :checked="isPresetAdded(preset.id)"
                ></ion-checkbox>
              </ion-item>
            </ion-item-group>

            <ion-item-group>
              <ion-item-divider>
                <ion-label>Real Life Rewards</ion-label>
              </ion-item-divider>
              <ion-item
                v-for="preset in realLifePresets"
                :key="preset.id"
                button
                @click="addPreset(preset)"
              >
                <ion-icon
                  :icon="getAbilityIcon(preset)"
                  slot="start"
                />
                <ion-label>
                  <h2>{{ preset.name }}</h2>
                  <p>{{ preset.description }}</p>
                </ion-label>
                <ion-checkbox
                  slot="end"
                  :checked="isPresetAdded(preset.id)"
                ></ion-checkbox>
              </ion-item>
            </ion-item-group>

            <ion-item-group v-if="hybridPresets.length > 0">
              <ion-item-divider>
                <ion-label>Multi-Class Abilities</ion-label>
              </ion-item-divider>
              <ion-item
                v-for="preset in hybridPresets"
                :key="preset.id"
                button
                @click="addPreset(preset)"
              >
                <ion-icon
                  :icon="getAbilityIcon(preset)"
                  slot="start"
                />
                <ion-label>
                  <h2>{{ preset.name }}</h2>
                  <p>{{ preset.description }}</p>
                </ion-label>
                <ion-checkbox
                  slot="end"
                  :checked="isPresetAdded(preset.id)"
                ></ion-checkbox>
              </ion-item>
            </ion-item-group>
          </ion-list>

          <div class="ion-padding">
            <ion-button
              expand="block"
              @click="closePresetModal"
            >Done</ion-button>
          </div>
        </ion-content>
      </ion-modal>

      <!-- FAB button for adding abilities -->
      <ion-fab
        slot="fixed"
        vertical="bottom"
        horizontal="center"
      >
        <ion-fab-button
          @click="presentActionSheet"
          color="rpg"
        >
          <i class="fad fa-book-spells fa-2x" />
        </ion-fab-button>
      </ion-fab>

    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./XpAbilities.ts"></script>
<style lang="scss" scoped src="./_XpAbilities.scss"></style>
