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
      <ion-grid >
        <ion-row>
          <ion-col>
            <ion-card class="">
              <ion-card-header>
                <ion-card-title>Achievement Form</ion-card-title>
              </ion-card-header>
              <ion-card-content class="rpg-box ion-no-padding">
                <ion-item>
                  <ion-label>Achievement Name</ion-label>
                  <ion-input v-model="achievementName" placeholder="Enter Achievement Name"></ion-input>
                </ion-item>

                <ion-item>
                  <ion-label>Category</ion-label>
                  <ion-button @click="openAddCategoryModal" color="success">Add New Category</ion-button>
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

                <ion-list>
                  <ion-radio-group v-model="type">
                    <ion-item>
                      <ion-label>Individual</ion-label>
                      <ion-radio slot="start" value="individual"></ion-radio>
                    </ion-item>
                    <ion-item>
                      <ion-label>As Needed</ion-label>
                      <ion-radio slot="start" value="asNeeded"></ion-radio>
                    </ion-item>
                    <ion-item>
                      <ion-label>Rotate</ion-label>
                      <ion-radio slot="start" value="rotate"></ion-radio>
                    </ion-item>
                    <ion-item>
                      <ion-label>Compete</ion-label>
                      <ion-radio slot="start" value="compete"></ion-radio>
                    </ion-item>
                    <ion-item>
                      <ion-label>Collaborate</ion-label>
                      <ion-radio slot="start" value="collaborate"></ion-radio>
                    </ion-item>
                  </ion-radio-group>
                </ion-list>

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

    <xp-add-category-modal 
      :is-open="addCategoryModalOpen" 
      @dismiss="addCategoryModalOpen = false"
    />
  </ion-page>
</template>

<script src="./XpAddAchievement" />
<style lang="scss" src="./_XpAddAchievement.scss" />
