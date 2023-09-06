<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar color="secondary">
        <ion-buttons slot="start">
          <ion-back-button
            :default-href="`/my-portal/${userId}/my-home`"
          ></ion-back-button>
          <i class="fad fa-hospital fa-2x" />
        </ion-buttons>
        <ion-title> Hospital Hub </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <xp-loading v-if="isLoading" />
      <ion-grid v-else>
        <ion-row>
          <ion-col size="12">
            <ion-card>
              <ion-title>Nurse</ion-title>
              <ion-card-content>
                Welcome traveler! You look like you've had quite an adventure.
                How can we assist you today?
              </ion-card-content>
            </ion-card>
            <ion-card v-for="user in users" :key="user.id">
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
              <ion-avatar>
                <ion-img :src="$getUserAvatar(user)"></ion-img>
              </ion-avatar>

              <ion-progress-bar color="danger"></ion-progress-bar>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
      <ion-fab vertical="bottom" horizontal="center" slot="fixed">
        <ion-fab-button color="secondary" @click="clickButton">
          <i class="fa-user-nurse fad fa-2x" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
    <ion-router-outlet />
    <ion-footer>
      <!-- <ion-toolbar color="secondary">
        <ion-grid>
          <ion-row>
            <ion-col class="ion-no-padding">
              <ion-searchbar
                color="light"
                @ionChange="request.params.page = 1"
                v-model="request.params.search"
              ></ion-searchbar>
            </ion-col>
          </ion-row>
          <ion-row>
            <ion-col>
              <ion-button
                @click="request.params.page--"
                :disabled="request.params.page == 1"
                color="light"
                expand="block"
              >
                <ion-icon
                  :icon="chevronBack"
                  slot="icon-only"
                />
              </ion-button>
            </ion-col>
            <ion-col>
              <ion-button
                @click="request.params.page++"
                :disabled="!hasNextPage"
                color="light"
                expand="block"
            >
              <ion-icon
                :icon="chevronForward"
                slot="icon-only"
              />
            </ion-button>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-toolbar> -->
    </ion-footer>
  </ion-page>
</template>

<script src="./HospitalHub" lang="ts" />
<style lang="scss" src="./_HospitalHub.scss" scoped />
