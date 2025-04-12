<template>
  <ion-header>
    <ion-toolbar class="rpg-box">
      <ion-title class="text-xl font-bold">Start New Profile</ion-title>
      <ion-item lines="none" slot="end" v-if="$props.showIsAdult">
        <ion-label class="font-medium"> Adult </ion-label>
        <ion-checkbox readonly v-model="isAdult" slot="end"> </ion-checkbox>
      </ion-item>
    </ion-toolbar>
  </ion-header>
  <ion-content class="bg-slide rpg-box">
    <ion-grid class="md:max-w-[60vw] mx-auto flex flex-col items-center justify-center gap-4">
      <ion-card class="w-full shadow-lg">
        <ion-segment v-model="activeSegment" class="p-2">
          <ion-segment-button value="info" class="segment-button-custom">
            <div class="flex flex-col items-center gap-1">
              <i class="fad fa-user fa-2x text-primary"></i>
              <span class="text-sm">Profile</span>
            </div>
          </ion-segment-button>
          <ion-segment-button value="account" class="segment-button-custom">
            <div class="flex flex-col items-center gap-1">
              <i class="fad fa-shield fa-2x text-primary"></i>
              <span class="text-sm">Security</span>
            </div>
          </ion-segment-button>
          <ion-segment-button value="features" class="segment-button-custom">
            <div class="flex flex-col items-center gap-1">
              <i class="fad fa-bell fa-2x text-primary"></i>
              <span class="text-sm">Features</span>
            </div>
          </ion-segment-button>
          <ion-segment-button value="preferences" class="segment-button-custom">
            <div class="flex flex-col items-center gap-1">
              <i class="fad fa-cog fa-2x text-primary"></i>
              <span class="text-sm">Preferences</span>
            </div>
          </ion-segment-button>
        </ion-segment>
      </ion-card>

      <gamer-card 
        :profile="newProfile" 
        v-if="activeSegment === 'info'" 
        class="w-full"
        v-model:avatarIndex="avatarIndex"
        v-model:jobClass="jobClass"
        v-model:favoriteFood="favoriteFood"
      />

      <ion-card v-if="activeSegment === 'info'" class="w-full">
        <ion-list class="p-0">
          <!-- Avatar Selection Row -->
          <ion-item class="avatar-row p-4">
            <div class="flex items-center w-full gap-4">
              <div 
                class="avatar-preview w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer hover:opacity-80"
                @click="isAvatarSelectorOpen = true"
                id="avatar-trigger"
              >
                <img :src="currentAvatar" alt="Selected avatar" class="w-full h-full object-cover rounded-full" />
              </div>
              <div class="flex-1">
                <ion-label class="font-medium mb-2">Choose Avatar</ion-label>
                <p class="text-sm text-gray-500">Click the avatar to select from all available options</p>
              </div>
            </div>
          </ion-item>

          <!-- Form Fields in 2 Columns -->
          <ion-grid>
            <ion-row>
              <!-- Left Column -->
              <ion-col size="12" size-md="6">
                <ion-item class="p-4">
                  <div class="w-full">
                    <ion-label class="font-medium block mb-1">
                      Full Name
                      <p class="text-sm text-gray-500">First M. Last aka Nickname</p>
                    </ion-label>
                    <ion-input 
                      v-model="fullName" 
                      class="bg-gray-50 rounded-lg mt-1"
                      placeholder="Enter your full name"
                    ></ion-input>
                  </div>
                </ion-item>

                <ion-item class="p-4">
                  <div class="w-full">
                    <ion-label class="font-medium block mb-1">
                      Favorite Thing
                      <p class="text-sm text-gray-500">What's your most favorite thing?</p>
                    </ion-label>
                    <ion-input
                      v-model="favoriteThing"
                      class="bg-gray-50 rounded-lg mt-1"
                      placeholder="Enter your favorite thing"
                    ></ion-input>
                  </div>
                </ion-item>
              </ion-col>

              <!-- Right Column -->
              <ion-col size="12" size-md="6">
                <ion-item class="p-4">
                  <div class="w-full">
                    <ion-label class="font-medium block mb-1">
                      Job Class
                      <p class="text-sm text-gray-500">Choose your starter job class</p>
                    </ion-label>
                    <ion-select
                      v-model="jobClass"
                      placeholder="Select starter class..."
                      class="bg-gray-50 rounded-lg mt-1 w-full"
                      interface="action-sheet"
                      :interface-options="{
                        header: 'Choose Your Job Class',
                        subHeader: 'Select your starting role'
                      }"
                    >
                      <ion-select-option
                        v-for="(job, index) in jobClassOptions"
                        :key="index"
                        :value="job.name"
                      >
                        <i :class="`fad ${job.icon} mr-2`"></i>
                        {{ job.name }}
                      </ion-select-option>
                    </ion-select>
                  </div>
                </ion-item>

                <ion-item class="p-4">
                  <div class="w-full">
                    <ion-label class="font-medium block mb-1">
                      Favorite Food
                      <p class="text-sm text-gray-500">Pick a favorite food from the bunch</p>
                    </ion-label>
                    <ion-select
                      v-model="favoriteFood"
                      placeholder="Select favorite food..."
                      class="bg-gray-50 rounded-lg mt-1 w-full"
                      interface="action-sheet"
                      :interface-options="{
                        header: 'Choose Your Favorite Food',
                        subHeader: 'What do you enjoy eating most?'
                      }"
                    >
                      <ion-select-option
                        v-for="food in foodOptions"
                        :key="food.value"
                        :value="food.value"
                      >
                        <i :class="`fad ${food.icon} mr-2`"></i>
                        {{ food.value }}
                      </ion-select-option>
                    </ion-select>
                  </div>
                </ion-item>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-list>
      </ion-card>

      <!-- Avatar Selector Popover -->
      <avatar-selector
        v-model="avatarIndex"
        :is-open="isAvatarSelectorOpen"
        :max-avatar-index="maxAvatarIndex"
        @close="isAvatarSelectorOpen = false"
        trigger="avatar-trigger"
      />

      <ion-card v-if="activeSegment === 'account'">
        <ion-card-header>
          <ion-card-title> Account Settings </ion-card-title>
        </ion-card-header>
        <ion-list>
          <ion-item>
            <ion-label> Email Address: </ion-label>
            <ion-input
              v-model="email"
              type="email"
              autocomplete="off"
            ></ion-input>
          </ion-item>
        </ion-list>
      </ion-card>

      <ion-card v-if="activeSegment === 'account'">
        <ion-grid>
          <ion-row>
            <ion-col>
              <ion-input
                ref="passcode1"
                name="passcode"
                class="ion-text-center"
                :type="passcodeType"
                autocomplete="new-password"
                pattern="[0-9]*"
                inputmode="numeric"
                maxlength="4"
                v-model="passcode"
                @keyup="moveFocus($event, 'passcode2')"
              ></ion-input>
            </ion-col>
          </ion-row>
        </ion-grid>
        <ion-item>
          <ion-label slot="end"> Hide Passcode </ion-label>
          <ion-checkbox label="Hide Passcode" v-model="hidePasscode" slot="end">
          </ion-checkbox>
        </ion-item>
      </ion-card>

      <ion-card v-if="activeSegment === 'features'" class="w-full">
        <ion-list class="p-0">
          <ion-item button @click="toggleReward" class="p-4">
            <div class="flex items-center justify-between w-full">
              <div>
                <h2 class="font-medium text-lg mb-1">Buy from Shops</h2>
                <p class="text-sm text-gray-500">Allowed this player access to shops and purchase rewards.</p>
              </div>
              <ion-toggle v-model="features.rewards" @click.stop class="ml-4"></ion-toggle>
            </div>
          </ion-item>
          
          <ion-item button @click="toggleGoal" class="p-4">
            <div class="flex items-center justify-between w-full">
              <div>
                <h2 class="font-medium text-lg mb-1">Save towards Goals</h2>
                <p class="text-sm text-gray-500">Allowed player access to the banks and saves toward goals.</p>
              </div>
              <ion-toggle v-model="features.goals" @click.stop class="ml-4"></ion-toggle>
            </div>
          </ion-item>

          <ion-item button @click="toggleBattles" class="p-4">
            <div class="flex items-center justify-between w-full">
              <div>
                <h2 class="font-medium text-lg mb-1">Random Battles</h2>
                <p class="text-sm text-gray-500">Turn on/off random battles. If off, players will have to manually check their achievements.</p>
              </div>
              <ion-toggle v-model="features.battles" @click.stop class="ml-4"></ion-toggle>
            </div>
          </ion-item>

          <ion-item button @click="toggleCommunity" class="p-4">
            <div class="flex items-center justify-between w-full">
              <div>
                <h2 class="font-medium text-lg mb-1">Participate in Town Hall</h2>
                <p class="text-sm text-gray-500">For players who want to participate in Town Hall.</p>
              </div>
              <ion-toggle v-model="features.community" @click.stop class="ml-4"></ion-toggle>
            </div>
          </ion-item>
        </ion-list>
      </ion-card>

      <ion-card class="ion-no-padding" v-if="activeSegment === 'preferences'">
        <InputSettings />
      </ion-card>
    </ion-grid>
  </ion-content>
  <ion-footer>
    <ion-toolbar class="rpg-box">
      <ion-buttons slot="start">
        <ion-button color="medium" @click="closeModal" class="font-medium">
          <i class="fad fa-times text-xl mr-2"></i>
          Cancel
        </ion-button>
      </ion-buttons>
      <ion-buttons slot="end">
        <ion-button
          :disabled="!favoriteFood || !favoriteThing || !jobClass || !fullName"
          @click="clickSaveProfile"
          color="primary"
          class="font-medium"
        >
          Save Profile
          <i class="fad fa-save text-xl ml-2"></i>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-footer>
</template>
<script lang="ts" src="./AddProfile.ts"></script>
<style scoped>
.segment-button-custom {
  --background-hover: var(--ion-color-primary-tint);
  --color-checked: var(--ion-color-primary);
  --indicator-color: var(--ion-color-primary);
  transition: all 0.3s ease;
}

.segment-button-custom:hover i {
  transform: scale(1.1);
}

.avatar-preview {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  transition: transform 0.3s ease;
}

.avatar-preview:hover {
  transform: scale(1.05);
}

ion-card {
  border-radius: 1rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

ion-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

ion-item {
  --padding-start: 1rem;
  --inner-padding-end: 1rem;
  --background-hover: var(--ion-color-light-tint);
  transition: background-color 0.2s ease;
}

ion-button {
  --box-shadow: none;
  transition: transform 0.2s ease;
}

ion-button:not([disabled]):hover {
  transform: translateY(-1px);
}

.rpg-box {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
}

/* Add slide transition for segments */
ion-content {
  --background: linear-gradient(135deg, var(--ion-color-light) 0%, var(--ion-color-light-shade) 100%);
}

ion-card {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Custom toggle styling */
ion-toggle {
  --background: var(--ion-color-medium);
  --background-checked: var(--ion-color-primary);
  --handle-background: var(--ion-color-light);
  --handle-background-checked: var(--ion-color-light);
}
</style>
