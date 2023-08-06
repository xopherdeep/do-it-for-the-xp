<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button 
            :default-href="`/game-master/achievements`"
          ></ion-back-button>
          <!-- <ion-icon :icon="storefrontOutline" slot="icon-only" /> -->
        </ion-buttons>
        <ion-title> 
          Create Achievement
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content >
      <ion-grid>
        <ion-row>
          <ion-col>
            <ion-card>
              <ion-card-header>
                <ion-card-title>Achievement Form</ion-card-title>
              </ion-card-header>
              <ion-card-content class="rpg-box">
                <ion-item>
                  <ion-label>Achievement Name</ion-label>
                  <ion-input v-model="achievementName" placeholder="Enter Achievement Name"></ion-input>
                </ion-item>

                <ion-item>
                  <ion-label>Category</ion-label>
                  <ion-input v-model="category" placeholder="Enter Category"></ion-input>
                </ion-item>

                <ion-item>
                  <ion-label>Requires Approval</ion-label>
                  <ion-toggle v-model="requiresApproval"></ion-toggle>
                </ion-item>

                <ion-item>
                  <ion-label>Points: GP, AP, XP</ion-label>
                  <ion-input v-model="points" placeholder="Enter Points"></ion-input>
                </ion-item>

                <ion-item>
                  <ion-label>Assign</ion-label>
                  <ion-input v-model="assign" placeholder="Enter Assign"></ion-input>
                </ion-item>

                <ion-item>
                  <ion-label>Type</ion-label>
                  <ion-select v-model="type">
                    <ion-select-option value="individual">Individual</ion-select-option>
                    <ion-select-option value="asNeeded">As Needed</ion-select-option>
                    <ion-select-option value="rotate">Rotate</ion-select-option>
                    <ion-select-option value="compete">Compete</ion-select-option>
                    <ion-select-option value="collaborate">Collaborate</ion-select-option>
                  </ion-select>
                </ion-item>

                <ion-item>
                  <ion-label>Bonus Achievement</ion-label>
                  <ion-toggle v-model="bonusAchievement"></ion-toggle>
                </ion-item>

                <ion-item>
                  <ion-label>Schedule</ion-label>
                  <ion-datetime v-model="schedule"></ion-datetime>
                </ion-item>

                <ion-button expand="full" @click="submitForm">Submit</ion-button>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      
      </ion-grid>
      <!-- fab placed to the bottom and start and on the bottom edge of the content overlapping footer with a list to the right -->
    </ion-content>
  </ion-page>
</template>

<script src="./XpAddAchievement" />
<style lang="scss" src="./_XpAddAchievement.scss" />