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
      <!-- Storm effects container -->
      <div class="storm-effects">
        <!-- Rain layers for sideways rain effect -->
        <div class="rain-container">
          <div class="rain-layer rain-layer-1">
            <div v-for="i in 50" :key="`rain-1-${i}`" class="rain-drop"></div>
          </div>
          <div class="rain-layer rain-layer-2">
            <div v-for="i in 50" :key="`rain-2-${i}`" class="rain-drop"></div>
          </div>
          <div class="rain-layer rain-layer-3">
            <div v-for="i in 50" :key="`rain-3-${i}`" class="rain-drop"></div>
          </div>
        </div>
        
        <!-- Lightning effects -->
        <div class="lightning-container">
          <div class="lightning-flash lightning-1"></div>
          <div class="lightning-flash lightning-2"></div>
          <div class="lightning-flash lightning-3"></div>
        </div>
        
        <!-- Rain puddles on the ground -->
        <div class="rain-puddles">
          <div v-for="i in 20" :key="`puddle-${i}`" class="puddle"></div>
        </div>
        
        <!-- Swamp mist effects -->
        <div class="mist-container">
          <div v-for="i in 8" :key="`mist-${i}`" class="mist"></div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script src="./WorldSwamps" />
<style lang="scss" src="./_WorldSwamps.scss" scoped />
<style lang="scss">
  #moon-temple{
    .fa-place-of-worship {
      --fa-primary-color: var(--xp-color-yellow);
      --fa-secondary-color: var(--xp-color-yellow);
      // --fa-secondary-opacity: 1
    }
  }
</style>
