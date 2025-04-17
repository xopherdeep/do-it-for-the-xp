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
      <div class="thunderstorm-container">
        <!-- Enhanced lightning effect -->
        <div class="lightning-container">
          <div class="lightning"></div>
          <div class="lightning"></div>
          <div class="lightning"></div>
          <!-- Visible lightning bolts with content -->
          <div class="lightning-bolt lightning-bolt-1"></div>
          <div class="lightning-bolt lightning-bolt-2"></div>
        </div>
        
        <!-- Completely revamped rain effect -->
        <div class="rain-container">
          <!-- Remove the rain layers causing the static effect -->
          <!-- Only use actual rain drops with improved styling -->
          <div v-for="n in 100" :key="n" class="raindrop"></div>
        </div>
        
        <!-- Enhanced clouds with more variety and dynamic positions -->
        <div class="cloud-container">
          <div class="cloud cloud1"></div>
          <div class="cloud cloud2"></div>
          <div class="cloud cloud3"></div>
          <div class="cloud cloud4"></div>
          <div class="cloud cloud5"></div>
          <div class="cloud cloud6"></div>
          <div class="cloud cloud-dark cloud7"></div>
          <div class="cloud cloud-dark cloud8"></div>
          <div class="cloud cloud-dark cloud9"></div>
        </div>
        
        <!-- Fog/mist layer for depth -->
        <div class="fog-layer"></div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script src="./WorldClouds" />
<style lang="scss" src="./_WorldClouds.scss" scoped />
<style lang="scss">
  #sky-temple{
    .fa-place-of-worship {
      --fa-primary-color: var(--xp-color-white);
      --fa-secondary-color: var(--xp-color-skyblue);
      // --fa-secondary-opacity: 1
    }
  }
</style>