<template>
  <ion-page :class="$options.name">
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

    <ion-content :fullscreen="true">
      <div class="world-map-plaza">
        <!-- North: High seas, mountain heights, storm clouds -->
        <div class="plaza-row plaza-north">
          <xp-stage-model stage-id="world-islands" :size="100" />
          <xp-stage-model stage-id="world-mountains" :size="100" />
          <xp-stage-model stage-id="world-clouds" :size="100" />
        </div>

        <!-- Equator: West forest and East tundras -->
        <div class="plaza-row plaza-equator">
          <xp-stage-model stage-id="world-forest" :size="105" />
          <div class="plaza-center-clearing" aria-hidden="true"></div>
          <xp-stage-model stage-id="world-ice" :size="105" />
        </div>

        <!-- South: Open prairie plains and desert dunes -->
        <div class="plaza-row plaza-south">
          <xp-stage-model stage-id="world-plains" :size="105" />
          <xp-stage-model stage-id="world-sands" :size="105" />
        </div>

        <!-- Deep South & Cosmos: Witch bogs and cosmic moon -->
        <div class="plaza-row plaza-deep-south">
          <xp-stage-model stage-id="world-swamps" :size="105" />
          <xp-stage-model stage-id="the-moon" :size="105" />
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./WorldMap.ts" />
<style lang="scss" src="./_WorldMap.scss" scoped />
