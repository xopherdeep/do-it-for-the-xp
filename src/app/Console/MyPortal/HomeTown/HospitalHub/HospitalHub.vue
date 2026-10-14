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

    <!-- The Patients board: every hero's chart, their Vital Statistics, and treatment for the hero at the counter -->
    <xp-hospital-patients
      :is-open="isModalOpen"
      :users="users"
      :current-user-id="userId"
      @close="closePatientsModal"
      @vitals="viewVitals"
      @treat="treatFromBoard"
    />
  </ion-page>
</template>

<script lang="ts" src="./HospitalHub.ts" />
<style lang="scss" src="./_HospitalHub.scss" scoped />
