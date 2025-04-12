<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar color="secondary">
        <ion-buttons slot="start">
          <ion-back-button
            :default-href="`/my-portal/${userId}/my-home`"
          ></ion-back-button>
          <xp-icon 
            icon="hospital" 
            primary="red" 
            secondary="white"
            size="2x"
          />
        </ion-buttons>
        <ion-title> Hospital Hub </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <xp-loading v-if="isLoading" />
      <ion-grid v-else>
        <ion-row>
          <ion-col size="12">
            <ion-card class="nurse-card">
              <ion-card-header>
                <ion-card-title class="flex items-center gap-2">
                  <xp-icon 
                    icon="user-nurse" 
                    primary="blue" 
                    secondary="white"
                  />
                  Nurse
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>
                Welcome traveler! You look like you've had quite an adventure.
                How can we assist you today?
              </ion-card-content>
            </ion-card>

            <ion-card v-for="user in users" :key="user.id" class="patient-card">
              <div class="heartbeat">
                <svg height="100%" width="100%">
                  <polyline
                    fill="none"
                    stroke="red"
                    stroke-width="3"
                    points="0,45 50,45 55,10 60,45 80,45 90,45 100,70 110,10 120,45 150,45
                    200,45 205,10 210,45 230,45 240,45 250,70 260,10 270,45 300,45 
                    350,45 355,10 360,45 380,45 390,45 400,70 410,10 420,45 450,45 500,45"
                  ></polyline>
                </svg>
              </div>
              
              <ion-card-content>
                <div class="flex items-center gap-4">
                  <ion-avatar>
                    <ion-img :src="$getUserAvatar(user)"></ion-img>
                  </ion-avatar>
                  <div class="flex-grow">
                    <h3>{{ user.name.full }}</h3>
                    <ion-progress-bar 
                      color="danger" 
                      :value="user.stats.hp.current / user.stats.hp.max"
                    ></ion-progress-bar>
                    <div class="text-sm text-gray-600 mt-1">
                      HP: {{ user.stats.hp.current }}/{{ user.stats.hp.max }}
                    </div>
                  </div>
                </div>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ion-button expand="block" @click="clickButton">
          <xp-icon 
            icon="stethoscope" 
            primary="white" 
            secondary="blue"
            size="lg"
          />
          <span class="ml-2">Check Patient</span>
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script lang="ts" src="./HospitalHub.ts" />
<style lang="scss" src="./_HospitalHub.scss" scoped />
