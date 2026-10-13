<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar color="secondary">
        <ion-buttons slot="start">
          <xp-back-button />
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
      
      <!-- FAB button to trigger the nurse dialog -->
      <ion-fab v-show="!isTalking" vertical="bottom" horizontal="center" slot="fixed">
        <ion-fab-button @click="showNurseDialog">
          <i class="fad fa-stethoscope fa-lg"></i>
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <!-- Nurse Joy's dialog, offers and receipts: the game's own prompt, not native alerts -->
    <xp-reveal-prompt :prompt="prompt" @respond="reveal.respond" />

    <!-- Patient Modal -->
    <ion-modal ref="patientsModal" :is-open="isModalOpen" @did-dismiss="closePatientsModal">
      <ion-header>
        <ion-toolbar color="secondary">
          <ion-title>Hospital Patients</ion-title>
          <ion-buttons slot="end">
            <ion-button @click.stop="dismissPatientsModal">Close</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-grid>
          <ion-row>
            <ion-col size="12" class="space-y-2">
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
                      <h3>{{ user.name?.nick || user.name?.full }}</h3>
                      <!-- the real pool: fights leave damage behind, so this is what the nurse sees -->
                      <ion-progress-bar 
                        color="danger" 
                        :value="(user.stats?.hp?.now ?? 0) / (user.stats?.hp?.max || 1)"
                      ></ion-progress-bar>
                      <div class="text-sm text-gray-600 mt-1">
                        HP: {{ user.stats?.hp?.now ?? 0 }}/{{ user.stats?.hp?.max ?? 0 }}
                      </div>
                    </div>
                  </div>
                </ion-card-content>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script lang="ts" src="./HospitalHub.ts" />
<style lang="scss" src="./_HospitalHub.scss" scoped />
