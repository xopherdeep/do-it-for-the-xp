<template>
  <ion-header>
    <ion-toolbar class="rpg-box">
      <ion-title>Start New Profile</ion-title>
      <ion-item
        slot="end"
        v-if="$props.showIsAdult"
      >
        <ion-label> Adult </ion-label>
        <ion-checkbox
          readonly
          v-model="isAdult"
          slot="end"
        > </ion-checkbox>
      </ion-item>

    </ion-toolbar>
  </ion-header>
  <ion-content class="bg-slide rpg-box">
    <ion-grid>
      <ion-card>
        <ion-segment v-model="activeSegment">
          <ion-segment-button value="info">
            <i class="fad fa-user fa-2x"></i>
            Profile
          </ion-segment-button>
          <ion-segment-button value="account">
            <i class="fad fa-shield fa-2x"></i>
            Security
          </ion-segment-button>
          <ion-segment-button value="features">
            <i class="fad fa-bell fa-2x"></i>
            Features
          </ion-segment-button>
          <ion-segment-button value="prefrences">
            <i class="fad fa-cog fa-2x"></i>
            Prefrences
          </ion-segment-button>
        </ion-segment>
      </ion-card>
      <ion-card v-if="activeSegment === 'info'">
        <ion-grid>
          <ion-row class="ion-justify-center ion-align-middle">
            <ion-col
              class="ion-text-center"
              size="2"
            >
              <i :class="`${selectedJobIcon} fa-4x`" />
            </ion-col>
            <ion-col
              class="ion-text-center"
              size="2"
            >
              <i :class="`${selectedFoodIcon} fa-4x`" />
            </ion-col>
            <ion-col>
              <ion-label>
                <h1>
                  {{ fullName }}
                </h1>
                <p>
                  {{ favoriteThing }}
                </p>
                <p>
                  &nbsp;
                  <ion-badge color="success">
                    Level {{ profile?.stats.level || 1 }}
                  </ion-badge>
                  <ion-badge color="warning">
                    <xp-gp :gp="profile?.stats.gp.wallet || 0" />
                  </ion-badge>
                </p>
              </ion-label>
            </ion-col>
            <ion-col size="2">
              <ion-avatar size="large">
                <ion-img
                  :src="currentAvatar"
                  class="img-avatar"
                />
              </ion-avatar>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-card>

      <ion-card v-if="activeSegment === 'info'">
        <ion-grid class="ion-no-padding">
          <ion-row>
            <ion-col>
              <ion-item class="avatar-row">
                <ion-label>
                  Choose Avatar
                </ion-label>
                <ion-input
                  type="number"
                  v-model="avatarIndex"
                  min="1"
                  max="51"
                />
                <ion-buttons>

                  <ion-button
                    :disabled="avatarIndex === 1"
                    @click="previousAvatar"
                  >
                    <ion-icon :icon="arrowBack" /> Back
                  </ion-button>
                  <ion-button
                    :disabled="avatarIndex === maxAvatarIndex"
                    @click="nextAvatar"
                  >
                    Next <ion-icon :icon="arrowForward" />
                  </ion-button>
                </ion-buttons>
              </ion-item>
            </ion-col>
          </ion-row>
          <ion-row>
            <ion-col size="7">
              <ion-item>
                <ion-label position="stacked">Full Name</ion-label>
                <ion-input
                  v-model="fullName"
                  class="ion-text-right"
                ></ion-input>
              </ion-item>
            </ion-col>
            <ion-col size="5">
              <ion-item>
                <ion-label position="stacked">Favorite Thing</ion-label>
                <ion-input
                  v-model="favoriteThing"
                  class="ion-text-right"
                ></ion-input>
              </ion-item>
            </ion-col>
          </ion-row>
          <ion-row>
            <ion-col>
              <ion-item>
                <ion-label> Job Class </ion-label>
                <ion-select
                  slot="end"
                  v-model="jobClass"
                  placeholder="Starter Class..."
                >
                  <ion-select-option
                    v-for="(job, index) in jobClassOptions"
                    :key="index"
                    :value="job.name"
                  >
                    {{ job.name }}
                  </ion-select-option>
                </ion-select>
              </ion-item>
              <ion-item>
                <ion-label> Favorite Food </ion-label>
                <ion-select
                  v-model="favoriteFood"
                  slot="end"
                  placeholder="Favorite Food..."
                >
                  <ion-select-option
                    v-for="food in foodOptions"
                    :key="food.value"
                    :value="food.value"
                  >
                    {{ food.value }}
                  </ion-select-option>
                </ion-select>
              </ion-item>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-card>

      <ion-card v-if="activeSegment === 'account'">
        <ion-card-header>
          <ion-card-title>
            Account Settings
          </ion-card-title>
        </ion-card-header>
        <ion-list>
          <ion-item>
            <ion-label>
              Email Address:
            </ion-label>
            <ion-input type="email" autocomplete="off"></ion-input>
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
                maxlength="1"
                @keyup="moveFocus($event, 'passcode2')"
              ></ion-input>
            </ion-col>
            <ion-col>
              <ion-input
                ref="passcode2"
                name="passcode"
                class="ion-text-center"
                :type="passcodeType"
                autocomplete="new-password"
                pattern="[0-9]*"
                inputmode="numeric"
                maxlength="1"
                @keyup="moveFocus($event, 'passcode3')"
              ></ion-input>

            </ion-col>
            <ion-col>
              <ion-input
                ref="passcode3"
                autocomplete="new-password"
                name="passcode"
                class="ion-text-center"
                :type="passcodeType"
                pattern="[0-9]*"
                inputmode="numeric"
                maxlength="1"
                @keyup="moveFocus($event, 'passcode4')"
              ></ion-input>

            </ion-col>
            <ion-col class="text-xl">
              <ion-input
                ref="passcode4"
                autocomplete="new-password"
                name="passcode"
                class="ion-text-center text-5xl"
                :type="passcodeType"
                pattern="[0-9]*"
                inputmode="numeric"
                maxlength="1"
              ></ion-input>

            </ion-col>

          </ion-row>
        </ion-grid>
        <ion-item>
          <ion-label slot="end">
            Hide Passcode
          </ion-label>
          <ion-checkbox
            label="Hide Passcode"
            v-model="hidePasscode"
            slot="end"
          >
          </ion-checkbox>
        </ion-item>
      </ion-card>

      <ion-card v-if="activeSegment === 'features'">
        <ion-list>
          <ion-item
            button
            @click="toggleReward"
          >
            <ion-label>
              <h2>Rewards</h2>
              <p>Allowed this player access to shops and purchase rewards.
              </p>
            </ion-label>
            <ion-toggle
              v-model="features.rewards"
              @click.stop
            >
            </ion-toggle>
          </ion-item>
          <ion-item
            button
            @click="toggleGoal"
          >
            <ion-label>
              <h2>Savings Goals</h2>
              <p>Allowed player access to the banks and saves toward gaols.
              </p>
            </ion-label>
            <ion-toggle
              v-model="features.goals"
              @click.stop
            >
            </ion-toggle>
          </ion-item>
        </ion-list>

      </ion-card>
      <ion-card
        class="ion-no-padding"
        v-if="activeSegment === 'prefrences'"
      >
        <InputSettings />
      </ion-card>
    </ion-grid>

  </ion-content>
  <ion-footer>
    <ion-toolbar class="rpg-box">
      <ion-buttons slot="start">
        <ion-button
          color="primary"
          @click="closeModal"
        >
          <i class="fad fa-times fa-3x"></i>
          Cancel
        </ion-button>

      </ion-buttons>
      <ion-buttons slot="end">
        <ion-button
          :disabled="!favoriteFood || !favoriteThing || !jobClass || !fullName"
          @click="clickSaveProfile"
        >
          Save Profile
          <i class="fad fa-save fa-3x"></i>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-footer>
</template>
<script lang="ts"  src="./AddProfile.ts"></script>
