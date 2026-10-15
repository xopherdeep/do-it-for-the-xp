<template>
  <xp-rpg-page
    title="Powers"
    headerIcon="fa-hand-holding-magic"
    :loading="isLoading"
  >
    <template #actions>
      <ion-button @click="toggleViewMode">
        <ion-icon :icon="viewMode === 'list' ? gridOutline : listOutline" />
      </ion-button>
    </template>
    <template #footer>
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

    </template>

    <!-- Preview as: the lock marks below are this hero's real progress, never an invented hero's -->
    <!-- Only once there is something to preview: an empty list keeps its Add from Presets button clear of the FAB -->
    <section
      v-if="hasPreviewHero && abilities.length > 0"
      class="preview-as"
    >
      <h2 class="preview-title">Preview as</h2>
      <div
        class="hero-chips"
        role="radiogroup"
        aria-label="Preview the Powers as this hero"
      >
        <button
          v-for="hero in heroes"
          :key="hero.id"
          type="button"
          role="radio"
          class="hero-chip"
          :class="{ active: previewHero?.id === hero.id }"
          :aria-checked="previewHero?.id === hero.id"
          @click="selectPreviewHero(hero)"
        >
          {{ heroName(hero) }}
        </button>
      </div>
      <p
        v-if="previewSnapshot"
        class="preview-stats"
      >
        <span>Lv {{ previewSnapshot.level }}</span>
        <span>{{ previewSnapshot.mp }} MP</span>
        <span>{{ previewSnapshot.ap.daily }} AP today</span>
        <span>{{ previewSnapshot.ap.weekly }} AP this week</span>
        <span>{{ previewSnapshot.ap.total }} AP in all</span>
      </p>
      <p class="preview-note">Marks show what this hero has really earned so far.</p>
    </section>
    <section
      v-else-if="abilities.length > 0"
      class="preview-as preview-as--empty"
    >
      <p class="preview-note">No heroes yet, so there are no lock marks. Add a hero to see who can use which ability.</p>
    </section>

    <!-- Enhanced Ability Manager Component -->
    <XpAbilityManager
      :abilities="filteredAbilities"
      :view-mode="viewMode"
      :ability-statuses="abilityStatuses"
      :unlock-statuses="unlockStatuses"
      :show-status="hasPreviewHero"
      :empty-title="emptyTitle"
      :empty-hint="emptyHint"
      @edit-ability="navigateToEditAbility"
      @view-mode-change="viewMode = $event"
    >
      <template
        v-if="currentFilter !== 'presets'"
        #empty-actions
      >
        <div class="empty-actions">
          <ion-button
            size="small"
            color="rpg"
            @click="openPresetModal"
          >
            Add from Presets
          </ion-button>
        </div>
      </template>
    </XpAbilityManager>

    <!-- Presets segment: the catalogue, one tap to add -->
    <section
      v-if="currentFilter === 'presets' && unaddedPresetGroups.length > 0"
      class="preset-catalogue"
    >
      <h2 class="catalogue-title">Preset catalogue</h2>
      <div
        v-for="group in unaddedPresetGroups"
        :key="group.key"
        class="catalogue-group"
      >
        <h3 class="catalogue-group-title">{{ group.label }}</h3>
        <ul class="catalogue-list">
          <li
            v-for="preset in group.presets"
            :key="preset.id"
            class="catalogue-row"
          >
            <i
              v-if="preset.iconPrefix"
              :class="['catalogue-icon', preset.iconPrefix, `fa-${preset.icon}`]"
              aria-hidden="true"
            />
            <ion-icon
              v-else
              :icon="getAbilityIcon(preset)"
              class="catalogue-icon"
            />
            <div class="catalogue-info">
              <strong>{{ preset.name }}</strong>
              <span class="catalogue-cost">
                {{ preset.apRequirement.amount }} AP<template v-if="preset.mpCost"> / {{ preset.mpCost }} MP</template>
              </span>
              <p>{{ preset.description }}</p>
              <p
                v-if="presetNeeds(preset).length > 0"
                class="catalogue-needs"
              >
                Needs {{ presetNeeds(preset).join(', ') }} first
              </p>
            </div>
            <ion-button
              size="small"
              color="rpg"
              :aria-label="`Add ${preset.name}`"
              @click="addPresetFromCatalogue(preset)"
            >
              Add
            </ion-button>
          </li>
        </ul>
      </div>
    </section>

    <!-- Keeps the last card clear of the floating spellbook button -->
    <div class="fab-clearance" />

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
          <ion-item-group
            v-for="group in presetGroups"
            :key="group.key"
          >
            <ion-item-divider>
              <ion-label>{{ group.label }}</ion-label>
            </ion-item-divider>
            <ion-item
              v-for="preset in group.presets"
              :key="preset.id"
              button
              @click="addPreset(preset)"
            >
              <i
                v-if="preset.iconPrefix"
                :class="[preset.iconPrefix, `fa-${preset.icon}`, 'fa-lg', 'mr-3']"
                slot="start"
                aria-hidden="true"
              />
              <ion-icon
                v-else
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
  </xp-rpg-page>
</template>

<script lang="ts" src="./XpAbilities.ts"></script>
<style lang="scss" scoped src="./_XpAbilities.scss"></style>
