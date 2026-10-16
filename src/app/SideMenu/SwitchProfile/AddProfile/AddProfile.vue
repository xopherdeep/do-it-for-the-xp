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
    <!-- v-if="activeSegment === 'info'" -->
    <!-- NEW HERO: one question at a time, the hero grows as it is answered -->
    <div v-if="!isEditing" class="hero-wizard icon-colors">
      <!-- The quest trail: where you are, where you've been -->
      <nav class="wizard-trail" aria-label="Hero creation steps">
        <div class="wizard-trail__track">
          <div class="wizard-trail__fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <ol>
          <li
            v-for="(s, i) in steps"
            :key="s.id"
            :class="{ done: i < currentStepIndex, current: i === currentStepIndex }"
          >
            <button
              type="button"
              :disabled="i > currentStepIndex"
              :aria-current="i === currentStepIndex ? 'step' : undefined"
              @click="goToStep(s.id)"
            >
              <span class="wizard-trail__dot">
                <i :class="['fad', i < currentStepIndex ? 'fa-check' : s.icon]"></i>
              </span>
              <span class="wizard-trail__label">{{ s.title }}</span>
            </button>
          </li>
        </ol>
      </nav>

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
            />
            <span class="wizard-hero__edit" aria-hidden="true"><i class="fad fa-pencil"></i></span>
          </div>
          <div class="wizard-hero__info">
            <h2 class="wizard-hero__name" :class="{ empty: !fullName.trim() }">
              {{ fullName.trim() || "???" }}
            </h2>
            <p class="wizard-hero__title">
              Lv 1 {{ selectedJob?.name || "Hero" }}
            </p>
            <div class="wizard-hero__badges">
              <span v-if="selectedFood" class="badge"><i :class="['fad', selectedFood.icon]"></i>{{ selectedFood.value }}</span>
              <span v-if="isGameMaster" class="badge badge--gm"><i class="fad fa-crown"></i>GM</span>
            </div>
          </div>
        </div>

        <div class="wizard-body">
          <p class="wizard-kicker">Step {{ currentStepIndex + 1 }} of {{ steps.length }}</p>
          <h3 class="wizard-prompt">{{ currentStepInfo.prompt }}</h3>

          <transition :name="stepsBack ? 'step-back' : 'step-next'" mode="out-in">
            <div :key="step" class="wizard-step">
              <!-- 1. NAME -->
              <div v-if="step === 'name'" class="wizard-fields">
                <label class="field-label" for="hero-name">Hero name</label>
                <ion-input
                  id="hero-name"
                  v-model="fullName"
                  class="rpg-input wizard-input"
                  placeholder="e.g. Master Chief"
                  maxlength="40"
                  enterkeyhint="next"
                  autocapitalize="words"
                  @keyup.enter="goNext"
                ></ion-input>
                <p class="field-hint">A real name, a nickname, or both.</p>

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

              <!-- 3. CLASS -->
              <div v-else-if="step === 'class'" class="choice-grid">
                <button
                  v-for="job in classChoices"
                  :key="job.name"
                  type="button"
                  class="choice-card"
                  :class="{ active: job.name === jobClass }"
                  :aria-pressed="job.name === jobClass"
                  @click="pickClass(job.name)"
                >
                  <i :class="['fad fa-2x', job.icon]"></i>
                  <strong>{{ job.name }}</strong>
                  <small>{{ job.creed }}</small>
                  <span v-if="job.name === jobClass" class="choice-check"><i class="fas fa-check"></i></span>
                </button>
              </div>

              <!-- 4. FOOD -->
              <div v-else-if="step === 'food'" class="choice-grid choice-grid--small">
                <button
                  v-for="food in foodOptions"
                  :key="food.value"
                  type="button"
                  class="choice-card"
                  :class="{ active: food.value === favoriteFood }"
                  :aria-pressed="food.value === favoriteFood"
                  @click="pickFood(food.value)"
                >
                  <i :class="['fad fa-2x', food.icon]"></i>
                  <strong>{{ food.value }}</strong>
                  <span v-if="food.value === favoriteFood" class="choice-check"><i class="fas fa-check"></i></span>
                </button>
              </div>

              <!-- 5. SECRET -->
              <div v-else-if="step === 'secret'" class="wizard-fields">
                <span class="field-label">Who is playing?</span>
                <div class="role-row">
                  <button
                    type="button"
                    class="choice-card"
                    :class="{ active: !isGameMaster }"
                    :aria-pressed="!isGameMaster"
                    :disabled="!canSetFlag"
                    @click="chooseRole(false)"
                  >
                    <i class="fad fa-2x fa-shield-alt"></i>
                    <strong>Hero</strong>
                    <small>Does quests, earns loot</small>
                  </button>
                  <button
                    type="button"
                    class="choice-card"
                    :class="{ active: isGameMaster }"
                    :aria-pressed="isGameMaster"
                    :disabled="!canSetFlag"
                    @click="chooseRole(true)"
                  >
                    <i class="fad fa-2x fa-crown"></i>
                    <strong>Game Master</strong>
                    <small>A parent who runs the game</small>
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
                  {{ (passcode && passcodeError) || (isGameMaster ? "4 digits. You'll need it to open the Game Master tools." : "4 digits to keep your save file safe.") }}
                </p>
              </div>

              <!-- 6. READY -->
              <div v-else class="wizard-fields">
                <ul class="summary">
                  <li><i class="fad fa-signature"></i><span>Name</span><strong>{{ fullName.trim() }}</strong></li>
                  <li v-if="selectedJob"><i :class="['fad', selectedJob.icon]"></i><span>Class</span><strong>{{ selectedJob.name }}</strong></li>
                  <li v-if="selectedFood"><i :class="['fad', selectedFood.icon]"></i><span>Food</span><strong>{{ selectedFood.value }}</strong></li>
                  <li v-if="favoriteThing"><i class="fad fa-star"></i><span>Loves</span><strong>{{ favoriteThing }}</strong></li>
                  <li>
                    <i :class="['fad', isGameMaster ? 'fa-crown' : 'fa-shield-alt']"></i><span>Role</span>
                    <strong>{{ isGameMaster ? "Game Master" : "Hero" }}</strong>
                  </li>
                  <li><i class="fad fa-lock-alt"></i><span>Code</span><strong>{{ passcode ? "Set" : "None" }}</strong></li>
                </ul>
                <button type="button" class="advanced-toggle" :aria-expanded="showAdvanced" @click="showAdvanced = !showAdvanced">
                  <i class="fad fa-gamepad"></i> Game options
                  <i :class="['fad', showAdvanced ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
                </button>
                <div v-if="showAdvanced" class="wizard-options">
                  <label><span>Buy from shops</span><ion-toggle v-model="features.rewards" color="rpg"></ion-toggle></label>
                  <label><span>Save towards goals</span><ion-toggle v-model="features.goals" color="rpg"></ion-toggle></label>
                  <label><span>Random battles</span><ion-toggle v-model="features.battles" color="rpg"></ion-toggle></label>
                  <label><span>Town Hall</span><ion-toggle v-model="features.community" color="rpg"></ion-toggle></label>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </ion-card>
    </div>

    <ion-grid v-else class="md:max-w-[60vw] mb-7 mx-auto flex flex-col items-center justify-center gap-6">
      <gamer-card
        ref="gamerCard"
        :profile="newProfile"
        :equipment="equipment"
        :editing="isEditing"
        class="w-full"
        v-model:avatarIndex="avatarIndex"
        v-model:jobClass="jobClass"
        v-model:favoriteFood="favoriteFood"
        v-model:look="look"
        v-model:avatarImage="avatarImage"
      />

      <!-- <ion-card class="w-full shadow-lg">
        <ion-segment
          v-model="activeSegment"
          class="overflow-visible p-2 mx-2"
        >
          <ion-segment-button
            value="info"
            class="segment-button-custom overflow-visible"
            color="rpg"
          >
            <div class="flex flex-col items-center gap-1 overflow-visible">
              <i class="fad fa-user fa-2x"></i>
              <span class="text-xs">Who</span>
            </div>
          </ion-segment-button>
          <ion-segment-button
            value="account"
            class="segment-button-custom overflow-visible"
            color="rpg"
          >
            <div class="flex flex-col items-center gap-1 overflow-visible">
              <i class="fad fa-fingerprint fa-2x"></i>
              <span class="text-xs">Pin</span>
            </div>
          </ion-segment-button>
          <ion-segment-button
            value="features"
            class="segment-button-custom"
            color="rpg"
          >
            <div class="flex flex-col items-center gap-1">
              <i class="fad fa-gamepad fa-2x text-primary"></i>
              <span class="text-xs">On/Off</span>
            </div>
          </ion-segment-button>
        </ion-segment>
      </ion-card> -->

      <ion-card
        v-if="activeSegment === 'info'"
        class="w-full"
      >
        <ion-list class="p-0">
          <!-- Avatar Selection Row -->
          <ion-item class="avatar-row py-2">
            <div class="flex items-center w-full gap-4">
              <div
                class="avatar-preview w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer hover:opacity-80"
                @click="gamerCard?.openAvatarPicker()"
              >
                <img
                  :src="currentAvatar"
                  alt="Selected avatar"
                  class="w-full h-full object-cover rounded-full"
                />
              </div>
              <div class="flex-1">
                <ion-label
                  class="font-bold mb-2 earthbound-title"
                  style="letter-spacing: 1px;"
                >
                  BUILD YOUR HERO
                  <p
                    class="helper-text mt-1"
                    style="font-family: inherit; letter-spacing: 0; text-transform: none;"
                  >Tap to build your hero; a 2D portrait works too</p>
                </ion-label>
              </div>
            </div>
          </ion-item>

          <!-- Form Fields -->
          <ion-grid>
            <ion-row>
              <!-- Form Column -->
              <ion-col size="12">
                <ion-item class="py-2">
                  <div class="w-full">
                    <ion-label
                      position="stacked"
                      class="font-bold mb-2 earthbound-title"
                      style="letter-spacing: 1px; font-size: 1.1rem;"
                    >
                      FULL NAME
                    </ion-label>
                    <ion-input
                      v-model="fullName"
                      class="rpg-input mt-1"
                      placeholder="First M. Last (e.g. Master Chief)"
                    ></ion-input>
                    <p class="helper-text ml-2 mt-1">First M. Last aka Nickname</p>
                  </div>
                </ion-item>

                <ion-item class="py-2">
                  <div class="w-full">
                    <ion-label
                      position="stacked"
                      class="font-bold mb-2 earthbound-title"
                      style="letter-spacing: 1px; font-size: 1.1rem;"
                    >
                      FAVORITE THING
                    </ion-label>
                    <ion-input
                      v-model="favoriteThing"
                      class="rpg-input mt-1"
                      placeholder="e.g. Pizza, Video Games, Space"
                    ></ion-input>
                    <p class="helper-text ml-2 mt-1">What's your most favorite thing?</p>
                  </div>
                </ion-item>
              </ion-col>
            </ion-row>
          </ion-grid>

          <!-- Game Master (parent): sets isAdult, which unlocks the Compendium and masquerade.
               Only a Game Master can switch it (anybody can while the device has none yet). -->
          <ion-item class="py-2 gm-toggle-row">
            <ion-label
              class="font-bold earthbound-title"
              style="letter-spacing: 1px; font-size: 1.1rem;"
            >
              GAME MASTER (PARENT)
              <p
                class="helper-text mt-1"
                style="font-family: inherit; letter-spacing: 0; text-transform: none;"
              >Game Masters run the game: they open the Compendium, approve quests, and play as any hero.</p>
              <p
                v-if="profilesLoaded && !canSetFlag"
                class="helper-text mt-1 text-danger"
                style="font-family: inherit; letter-spacing: 0; text-transform: none;"
              >Ask a Game Master</p>
              <p
                v-else-if="isGameMaster"
                class="helper-text mt-1"
                style="font-family: inherit; letter-spacing: 0; text-transform: none;"
              >Game Masters need a 4-digit passcode. Set it on the Pin tab.</p>
            </ion-label>
            <ion-toggle
              :checked="isGameMaster"
              :disabled="!canSetFlag"
              @ionChange="setGameMaster($event)"
              color="rpg"
              slot="end"
            ></ion-toggle>
          </ion-item>
        </ion-list>
      </ion-card>

      <ion-card v-if="activeSegment === 'account'">
        <ion-list class="p-0 space-y-4 pb-2">
          <!-- <ion-item class="p-4">
            <div class="w-full">
              <ion-label class="font-medium block mb-1">
                Email Address
                <p class="text-sm text-gray-500">Used for account recovery and notifications</p>
              </ion-label>
              <ion-input
                v-model="email"
                type="email"
                autocomplete="off"
                class="bg-gray-50 rounded-lg mt-1"
                placeholder="Enter your email address"
              ></ion-input>
            </div>
          </ion-item> -->

          <!-- A Game Master's PIN is neither shown to nor editable by anybody who is not a Game Master -->
          <ion-item v-if="gameMasterEditLocked">
            <ion-label>
              Passcode Protection
              <p class="text-sm text-gray-500">Ask a Game Master</p>
            </ion-label>
          </ion-item>

          <template v-else>
            <ion-item class="pt-2">
              <div class="w-full">
                <ion-label class="font-medium block mb-1">
                  Passcode Protection
                  <p class="text-sm text-gray-500">
                    {{ isGameMaster ? "Required for Game Masters: a 4-digit PIN" : "4-digit PIN to secure your profile" }}
                  </p>
                </ion-label>
                <div class="mt-2">
                  <ion-input
                    inputmode="numeric"
                    maxlength="4"
                    class="pin-input text-center"
                    v-model="passcode"
                    :type="passcodeType"
                    placeholder="• • • •"
                    clearOnEdit="false"
                  ></ion-input>
                </div>
                <p
                  v-if="passcodeError"
                  class="helper-text ml-2 mt-1 text-danger"
                >{{ passcodeError }}</p>
              </div>
            </ion-item>

            <ion-item>
              <ion-label>
                Show Passcode
                <p>Toggle to reveal or hide your passcode</p>
              </ion-label>
              <ion-toggle
                :checked="!hidePasscode"
                @ionChange="hidePasscode = !$event.detail.checked"
                color="rpg"
                slot="end"
              ></ion-toggle>
            </ion-item>
          </template>
        </ion-list>
      </ion-card>

      <ion-card
        v-if="activeSegment === 'features'"
        class="w-full"
      >
        <ion-list class="p-0">
          <ion-item
            button
            @click="toggleReward"
          >
            <ion-label class="font-medium">
              Buy from Shops
              <p class="text-sm text-gray-500">Allowed this player access to shops and purchase rewards.</p>
            </ion-label>
            <ion-checkbox
              slot="end"
              v-model="features.rewards"
              @click.stop
              color="rpg"
            />
          </ion-item>

          <ion-item
            button
            @click="toggleGoal"
          >
            <ion-label class="font-medium">
              Save towards Goals
              <p class="text-sm text-gray-500">Allowed player access to the banks and saves toward goals.</p>
            </ion-label>
            <ion-checkbox
              v-model="features.goals"
              @click.stop
              slot="end"
              color="rpg"
            />
          </ion-item>

          <ion-item
            button
            @click="toggleBattles"
          >
            <ion-label class="font-medium">
              Random Battles
              <p class="text-sm text-gray-500">Turn on/off random battles. If off, players will have to manually check
                their achievements.</p>
            </ion-label>
            <ion-checkbox
              v-model="features.battles"
              @click.stop
              slot="end"
              color="rpg"
            />
          </ion-item>

          <ion-item
            button
            @click="toggleCommunity"
          >
            <ion-label class="font-medium">
              Participate in Town Hall
              <p class="text-sm text-gray-500">For players who want to participate in Town Hall.</p>
            </ion-label>
            <ion-checkbox
              v-model="features.community"
              @click.stop
              slot="end"
              color="rpg"
            />
          </ion-item>
        </ion-list>
      </ion-card>
      <InputSettings v-if="activeSegment === 'preferences'" />
    </ion-grid>
  </ion-content>
  <ion-footer v-if="!isEditing">
    <ion-toolbar class="rpg-box wizard-footer">
      <div class="wizard-footer__row">
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
  <ion-footer v-else>

    <ion-toolbar class="rpg-box">
      <ion-segment
        v-model="activeSegment"
        class="overflow-visible p-2 mx-2"
      >
        <ion-segment-button
          value="info"
          class="segment-button-custom overflow-visible"
          color="rpg"
        >
          <div class="flex flex-col items-center gap-1 overflow-visible">
            <i class="fad fa-user fa-2x"></i>
            <span class="text-xs">Who</span>
          </div>
        </ion-segment-button>
        <ion-segment-button
          value="account"
          class="segment-button-custom overflow-visible"
          color="rpg"
        >
          <div class="flex flex-col items-center gap-1 overflow-visible">
            <i class="fad fa-fingerprint fa-2x"></i>
            <span class="text-xs">Pin<span v-if="isGameMaster" class="text-danger"> *</span></span>
          </div>
        </ion-segment-button>
        <ion-segment-button
          value="features"
          class="segment-button-custom"
          color="rpg"
        >
          <div class="flex flex-col items-center gap-1">
            <i class="fad fa-gamepad fa-2x text-primary"></i>
            <span class="text-xs">On/Off</span>
          </div>
        </ion-segment-button>
        <!-- <ion-segment-button
            value="preferences"
            class="segment-button-custom flex-shrink"
            color="rpg"
          >
            <div class="flex flex-col items-center gap-1">
              <i class="fad fa-ear fa-2x"></i>
              <span class="text-xs">Preferences</span>
            </div>
          </ion-segment-button> -->
      </ion-segment>
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
</template>
<script lang="ts" src="./AddProfile.ts"></script>
<style scoped src="./_AddProfile.css" />
