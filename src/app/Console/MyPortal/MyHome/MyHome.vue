<template>
  <ion-page :class="$options.name" class="page-loaded">
    <!-- <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button :router-link="`/my-portal/${userId}`" >
            <ion-icon :icon="arrowBack" slot="icon-only"/>
          </ion-button>
        </ion-buttons>
        <ion-title>
        </ion-title>
      </ion-toolbar>
    </ion-header> -->

    <ion-content :fullscreen="true" class="my-home-bg">
      <IonRouterOutlet />
      <div class="my-home-plaza">
        <xp-draggable-spot screen="my-home" spot-id="home-bed" :default-x="25" :default-y="25">
          <xp-building-model building-id="home-bed" label="Cozy Bed" sublabel="Rest & heal" :size="115" @click="restInBed" />
        </xp-draggable-spot>

        <xp-draggable-spot screen="my-home" spot-id="home-storage" :default-x="65" :default-y="25">
          <xp-building-model building-id="home-storage" label="My Storage" sublabel="Open vault" :size="115" />
        </xp-draggable-spot>

        <xp-draggable-spot screen="my-home" spot-id="home-workbench" :default-x="20" :default-y="50">
          <xp-building-model building-id="home-workbench" label="My Workbench" sublabel="Craft gear" :size="115" />
        </xp-draggable-spot>

        <xp-draggable-spot screen="my-home" spot-id="home-kitchen" :default-x="80" :default-y="50">
          <xp-building-model building-id="home-kitchen" label="My Kitchen" sublabel="Cook meals" :size="115" />
        </xp-draggable-spot>

        <xp-draggable-spot screen="my-home" spot-id="home-calendar" :default-x="25" :default-y="75">
          <xp-building-model building-id="home-calendar" label="My Calendar" sublabel="View schedule" :size="115" />
        </xp-draggable-spot>

        <xp-draggable-spot screen="my-home" spot-id="home-door" :default-x="65" :default-y="75">
          <xp-building-model building-id="home-door" label="Front Door" sublabel="Go outside" :size="115" />
        </xp-draggable-spot>
      </div>
      <ion-modal :breakpoints="[0.9]" :initialBreakpoint="0.9">
        <ion-card>
          <ion-card-title> World Map </ion-card-title>
          <i class="fad fa-globe fa-3x ion-float-right"></i>
          <ion-card-header> </ion-card-header>
        </ion-card>
      </ion-modal>
      <!-- Save & Quit Modal -->
      <save-and-quit-modal :is-open="showSaveQuitModal" :user-avatar="userAvatar" @close="closeSaveQuitModal"
        @confirm="confirmSaveQuit" />
    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./MyHome.ts" />
<style lang="scss" src="./_MyHome.scss" scoped />
