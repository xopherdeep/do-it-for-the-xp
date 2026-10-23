<template>
  <ion-header>
    <ion-toolbar class="rpg-box">
      <ion-buttons slot="start">
        <ion-button
          color="medium"
          @click="closeModal"
          class="font-medium"
        >
          <i class="fas fa-times text-xl mr-2" />
        </ion-button>
      </ion-buttons>
      <ion-title class="text-xl font-bold">{{ isEditing ? "Edit Profile" : "New Hero" }}</ion-title>
      <ion-buttons v-if="isEditing" slot="end">
        <ion-button
          :disabled="isSaveDisabled"
          @click="clickSaveProfile"
          class="font-medium"
          color="rpg"
        >
          Save
          <i class="fad fa-save text-xl ml-2"></i>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
  <ion-content class="bg-slide rpg-box ion-padding">
    <!-- NEW HERO: one question at a time, the hero grows as it is answered. An existing hero opens on the summary. -->
    <div class="hero-wizard icon-colors">
      <ion-card class="wizard-card">
        <!-- The hero, always in view -->
        <div class="wizard-hero">
          <div class="wizard-hero__face">
            <gamer-card
              ref="gamerCard"
              compact
              :profile="newProfile"
              :equipment="equipment"
              :editing="isEditing"
              v-model:avatarIndex="avatarIndex"
              v-model:jobClass="jobClass"
              v-model:favoriteFood="favoriteFood"
              v-model:look="look"
              v-model:avatarImage="avatarImage"
              @face-done="afterFace"
            />
            <span class="wizard-hero__edit" aria-hidden="true"><i class="fad fa-pencil"></i></span>
          </div>
          <div class="wizard-hero__info">
            <h2 class="wizard-hero__name" :class="{ empty: !fullName.trim() }">
              {{ fullName.trim() || "???" }}
            </h2>
            <p class="wizard-hero__title">
              Lv {{ heroLevel }} {{ selectedJob?.name || "Hero" }}
            </p>
            <div class="wizard-hero__badges">
              <span v-if="selectedFood" class="badge"><i :class="['fad', selectedFood.icon]"></i>{{ selectedFood.value }}</span>
              <span v-if="isGameMaster" class="badge badge--gm"><i class="fad fa-crown"></i>GM</span>
            </div>
          </div>
        </div>

        <div class="wizard-body">
          <p class="wizard-kicker">{{ isEditing ? "Editing" : `Step ${currentStepIndex + 1} of ${steps.length}` }}</p>
          <h3 class="wizard-prompt">{{ isEditing && step === "ready" ? "Tap anything to change it" : currentStepInfo.prompt }}</h3>

          <transition :name="stepsBack ? 'step-back' : 'step-next'" mode="out-in">
            <div :key="step" class="wizard-step">
              <!-- 1. NAME -->
              <div v-if="step === 'name'" class="wizard-fields">
                <label class="field-label" for="hero-name">Hero name</label>
                <ion-input
                  id="hero-name"
                  v-model="fullName"
                  class="rpg-input wizard-input"
                  placeholder="First M. Last a.k.a. Nickname"
                  maxlength="40"
                  enterkeyhint="next"
                  autocapitalize="words"
                  @keyup.enter="goNext"
                ></ion-input>
                <p class="field-hint">Like Sam J. Smith a.k.a. Sammy (aka works too). What comes after it is what we call you.</p>

                <label class="field-label" for="hero-thing">Favorite thing <span class="optional">optional</span></label>
                <ion-input
                  id="hero-thing"
                  v-model="favoriteThing"
                  class="rpg-input wizard-input"
                  placeholder="e.g. Dragons"
                  maxlength="40"
                ></ion-input>
              </div>

              <!-- 2. LOOK -->
              <div v-else-if="step === 'look'" class="wizard-center">
                <button type="button" class="big-action" @click="gamerCard?.openAvatarPicker()">
                  <i class="fad fa-sparkles"></i>
                  {{ hasFace ? "Change my hero" : "Build my hero" }}
                </button>
                <p class="field-hint">
                  Pick a skin, hair and outfit, or choose a ready-made portrait.
                  <br />You can always change it later.
                </p>
              </div>

              <!-- 3. STYLE: look and feel, game style, menu sounds -->
              <hero-style-picker v-else-if="step === 'style'" v-bind="styleChoice" @pick="setStyleChoice" />

              <!-- 4. CLASS and 5. FOOD: one card grid -->
              <div v-else-if="isChoiceStep" class="choice-grid" :class="{ 'choice-grid--small': step === 'food' }">
                <button
                  v-for="card in choiceCards"
                  :key="card.key"
                  type="button"
                  class="choice-card"
                  :class="{ active: card.key === chosenKey }"
                  :aria-pressed="card.key === chosenKey"
                  @click="pickChoice(card.key)"
                >
                  <i :class="['fad fa-2x', card.icon]"></i>
                  <strong>{{ card.label }}</strong>
                  <small v-if="card.hint">{{ card.hint }}</small>
                  <span v-if="card.key === chosenKey" class="choice-check"><i class="fas fa-check"></i></span>
                </button>
              </div>

              <!-- 6. SECRET -->
              <div v-else-if="step === 'secret'" class="wizard-fields">
                <span class="field-label">Who is playing?</span>
                <div class="role-row">
                  <button
                    v-for="role in roles"
                    :key="role.title"
                    type="button"
                    class="choice-card"
                    :class="{ active: role.isGameMaster === isGameMaster }"
                    :aria-pressed="role.isGameMaster === isGameMaster"
                    :disabled="!canSetFlag"
                    @click="chooseRole(role.isGameMaster)"
                  >
                    <i :class="['fad fa-2x', role.icon]"></i>
                    <strong>{{ role.title }}</strong>
                    <small>{{ role.hint }}</small>
                  </button>
                </div>
                <p v-if="profilesLoaded && !canSetFlag" class="field-hint field-hint--warn">
                  Only a Game Master can make another Game Master.
                </p>

                <label class="field-label" for="hero-pin">
                  Secret code
                  <span v-if="!isGameMaster" class="optional">optional</span>
                </label>
                <div class="pin-row">
                  <ion-input
                    id="hero-pin"
                    inputmode="numeric"
                    maxlength="4"
                    class="pin-input wizard-pin"
                    v-model="passcode"
                    :type="passcodeType"
                    placeholder="••••"
                    :clearOnEdit="false"
                  ></ion-input>
                  <button
                    type="button"
                    class="pin-eye"
                    :aria-label="hidePasscode ? 'Show code' : 'Hide code'"
                    @click="hidePasscode = !hidePasscode"
                  >
                    <i :class="['fad', hidePasscode ? 'fa-eye' : 'fa-eye-slash']"></i>
                  </button>
                </div>
                <p class="field-hint" :class="{ 'field-hint--warn': passcode && passcodeError }">
                  {{ (passcode && passcodeError) || pinHint }}
                </p>
              </div>

              <!-- 7. READY -->
              <div v-else class="wizard-fields">
                <ul class="summary">
                  <li><button type="button" class="summary-row" data-test="edit-look" @click="goToStep('look')"><i class="fad fa-user-ninja"></i><span>Look</span><strong>{{ hasFace ? "My hero" : "Not made yet" }}</strong><i class="fad fa-chevron-right summary-row__go"></i></button></li>
                  <li><button type="button" class="summary-row" data-test="edit-name" @click="goToStep('name')"><i class="fad fa-signature"></i><span>Name</span><strong>{{ fullName.trim() }}</strong><i class="fad fa-chevron-right summary-row__go"></i></button></li>
                  <li v-if="styleSummary"><button type="button" class="summary-row" data-test="edit-style" @click="goToStep('style')"><i :class="['fad', styleSummary.icon]"></i><span>Style</span><strong>{{ styleSummary.text }}</strong><i class="fad fa-chevron-right summary-row__go"></i></button></li>
                  <li><button type="button" class="summary-row" data-test="edit-class" @click="goToStep('class')"><i :class="['fad', selectedJob?.icon || 'fa-swords']"></i><span>Class</span><strong>{{ selectedJob?.name || "Pick one" }}</strong><i class="fad fa-chevron-right summary-row__go"></i></button></li>
                  <li><button type="button" class="summary-row" data-test="edit-food" @click="goToStep('food')"><i :class="['fad', selectedFood?.icon || 'fa-utensils']"></i><span>Food</span><strong>{{ selectedFood?.value || "Pick one" }}</strong><i class="fad fa-chevron-right summary-row__go"></i></button></li>
                  <li v-if="favoriteThing"><button type="button" class="summary-row" data-test="edit-thing" @click="goToStep('name')"><i class="fad fa-star"></i><span>Loves</span><strong>{{ favoriteThing }}</strong><i class="fad fa-chevron-right summary-row__go"></i></button></li>
                  <li><button type="button" class="summary-row" data-test="edit-role" @click="goToStep('secret')"><i :class="['fad', isGameMaster ? 'fa-crown' : 'fa-shield-alt']"></i><span>Role</span><strong>{{ isGameMaster ? "Game Master" : "Hero" }}</strong><i class="fad fa-chevron-right summary-row__go"></i></button></li>
                  <li><button type="button" class="summary-row" data-test="edit-code" @click="goToStep('secret')"><i class="fad fa-lock-alt"></i><span>Code</span><strong>{{ passcode || savedPin ? "Set" : "None" }}</strong><i class="fad fa-chevron-right summary-row__go"></i></button></li>
                </ul>
                <button type="button" class="advanced-toggle" :aria-expanded="showAdvanced" @click="showAdvanced = !showAdvanced">
                  <i class="fad fa-gamepad"></i> Game options
                  <i :class="['fad', showAdvanced ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
                </button>
                <div v-if="showAdvanced" class="wizard-options">
                  <label v-for="option in featureOptions" :key="option.key">
                    <span>{{ option.short }}</span><ion-toggle v-model="features[option.key]" color="rpg"></ion-toggle>
                  </label>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </ion-card>

      <!-- The quest trail: where you are, where you've been -->
      <ion-card class="wizard-trail" role="navigation" aria-label="Hero creation steps">
        <div class="wizard-trail__track">
          <div class="wizard-trail__fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <ol>
          <li
            v-for="(s, i) in steps"
            :key="s.id"
            :class="{ done: isEditing ? i !== currentStepIndex : i < currentStepIndex, current: i === currentStepIndex }"
          >
            <button
              type="button"
              :disabled="!isEditing && i > currentStepIndex"
              :aria-current="i === currentStepIndex ? 'step' : undefined"
              @click="goToStep(s.id)"
            >
              <span class="wizard-trail__dot">
                <i :class="['fad', (isEditing ? i !== currentStepIndex : i < currentStepIndex) ? 'fa-check' : s.icon]"></i>
              </span>
              <span class="wizard-trail__label">{{ s.title }}</span>
            </button>
          </li>
        </ol>
      </ion-card>
    </div>

  </ion-content>
  <ion-footer>
    <ion-toolbar class="rpg-box wizard-footer">
      <div v-if="isEditing" class="wizard-footer__row">
        <button v-if="step !== 'ready'" type="button" class="wizard-btn wizard-btn--next wizard-btn--begin" @click="backToSummary">
          Done <i class="fad fa-check"></i>
        </button>
        <button
          v-else
          type="button"
          class="wizard-btn wizard-btn--next wizard-btn--begin"
          :class="{ 'is-blocked': isSaveDisabled }"
          :disabled="isSaveDisabled"
          data-test="save-edit"
          @click="clickSaveProfile"
        >
          Save <i class="fad fa-save"></i>
        </button>
      </div>
      <div v-else class="wizard-footer__row">
        <button type="button" class="wizard-btn wizard-btn--back" :disabled="currentStepIndex === 0" @click="goBack">
          <i class="fad fa-chevron-left"></i> Back
        </button>
        <button
          v-if="!isLastStep"
          type="button"
          class="wizard-btn wizard-btn--next"
          :class="{ 'is-blocked': currentStepProblem }"
          @click="goNext"
        >
          {{ step === 'look' && !hasFace ? "Skip" : "Next" }} <i class="fad fa-chevron-right"></i>
        </button>
        <button v-else type="button" class="wizard-btn wizard-btn--next wizard-btn--begin" @click="beginAdventure() && clickSaveProfile()">
          Begin Adventure! <i class="fad fa-flag-checkered"></i>
        </button>
      </div>
    </ion-toolbar>
  </ion-footer>

  <!-- A new hero joins the party: staged like the temple's reveals, over the whole modal -->
  <xp-hero-fanfare
    :open="showFanfare"
    :name="fullName.trim()"
    :job-class="jobClass"
    :look="look"
    :portrait="currentAvatar"
    @burst="playAdventureSong"
    @done="finishFanfare"
  />

  <!-- Family Sync: an edit of a hero another device plays is not saved, and the clerk says so -->
  <xp-hero-write-gate ref="heroGate" />
</template>
<script lang="ts" src="./AddProfile.ts"></script>
<style scoped src="./_AddProfile.css" />
<style scoped src="./_WizardFields.css" />
