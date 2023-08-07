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
                <ion-card-title>Classification</ion-card-title>
              </ion-card-header>
              <ion-card-content class="rpg-box ion-no-padding">
                <ion-list>
                  <ion-item>
                    <ion-label>Achievement Name</ion-label>
                    <ion-input v-model="achievementName" placeholder="Enter Achievement Name"></ion-input>
                  </ion-item>
                  <ion-item>
                    <ion-label>Category</ion-label>
                    <ion-select v-model="category">
                      <ion-select-option v-for="(cat, index) in categories" :value="cat.id" :key="index">
                        {{ cat.name }}
                      </ion-select-option>
                    </ion-select>
                    <ion-button @click="openAddCategoryModal" color="success">Add New Category</ion-button>
                  </ion-item>
                  <ion-item>
                    <ion-label>Requires Approval</ion-label>
                    <ion-checkbox v-model="requiresApproval"></ion-checkbox>
                  </ion-item>
                  <ion-item>
                    <ion-label>Bonus Achievement</ion-label>
                    <ion-checkbox v-model="bonusAchievement"></ion-checkbox>
                  </ion-item>
                </ion-list>
              </ion-card-content>
            </ion-card>
            <ion-card class="">
              <ion-card-header>
                <ion-card-title>Points</ion-card-title>
              </ion-card-header>
              <ion-card-content class="rpg-box ion-no-padding">
                <ion-list>
                  <ion-item>
                    <ion-label>Difficulty Point Value</ion-label>
                    <ion-radio-group v-model="difficulty">
                      <ion-item>
                        <ion-label><i class="fad fa-dice-d4"></i></ion-label>
                        <ion-radio value="1"></ion-radio>
                      </ion-item>
                      <ion-item>
                        <ion-label><i class="fad fa-dice-d6"></i></ion-label>
                        <ion-radio value="2"></ion-radio>
                      </ion-item>
                      <ion-item>
                        <ion-label><i class="fad fa-dice-d8"></i></ion-label>
                        <ion-radio value="3"></ion-radio>
                      </ion-item>
                      <ion-item>
                        <ion-label><i class="fad fa-dice-d10"></i></ion-label>
                        <ion-radio value="5"></ion-radio>
                      </ion-item>
                      <ion-item>
                        <ion-label><i class="fad fa-dice-d12"></i></ion-label>
                        <ion-radio value="8"></ion-radio>
                      </ion-item>
                      <ion-item>
                        <ion-label><i class="fad fa-dice-d20"></i></ion-label>
                        <ion-radio value="13"></ion-radio>
                      </ion-item>
                    </ion-radio-group>
                  </ion-item>
                  <ion-item>
                    <ion-label>XP</ion-label>
                    <ion-input v-model="xp" type="number" placeholder="Enter XP"></ion-input>
                  </ion-item>
                  <ion-item>
                    <ion-label>GP</ion-label>
                    <ion-input v-model="gp" type="number" placeholder="Enter GP"></ion-input>
                  </ion-item>
                  <ion-item>
                    <ion-label>AP</ion-label>
                    <ion-input v-model="ap" type="number" placeholder="Enter AP"></ion-input>
                  </ion-item>
                </ion-list>
              </ion-card-content>
            </ion-card>
            <ion-card class="">
              <ion-card-header>
                <ion-card-title>Assignment</ion-card-title>
              </ion-card-header>
              <ion-card-content class="rpg-box ion-no-padding">
                <ion-list>
                  <ion-item>
                    <ion-label>Type</ion-label>
                    <ion-select v-model="type">
                      <ion-select-option value="compete">Compete</ion-select-option>
                      <ion-select-option value="collaborate">Collaborate</ion-select-option>
                      <ion-select-option value="rotate">Rotate</ion-select-option>
                      <ion-select-option value="asNeeded">As Needed</ion-select-option>
                      <ion-select-option value="individual">Individual</ion-select-option>
                    </ion-select>
                  </ion-item>
                  <ion-item>
                    <ion-label>Who</ion-label>
                    <ion-select v-model="assignee" multiple :disabled="type === 'asNeeded'">
                      <!-- Replace with actual list of users -->
                      <ion-select-option value="user1">User 1</ion-select-option>
                      <ion-select-option value="user2">User 2</ion-select-option>
                    </ion-select>
                  </ion-item>
                  <ion-item>
                    <ion-label>When</ion-label>
                    <ion-datetime v-model="schedule"></ion-datetime>
                  </ion-item>
                </ion-list>

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
      @add-category="addCategory"
    />
  </ion-page>
</template>

<script src="./XpAddAchievement" />
<style lang="scss" src="./_XpAddAchievement.scss" />
