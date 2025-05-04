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
      <div class="plains-weather-container">
        <!-- Heat haze mirage effect -->
        <div class="heat-haze-container">
          <div class="heat-haze"></div>
        </div>
        
        <!-- Waving grass effect -->
        <div class="grass-container">
          <div v-for="n in 60" :key="n" class="grass-blade"></div>
        </div>
      </div>
      
      <!-- SVG filters -->
      <svg width="0" height="0" style="position: absolute;">
        <defs>
          <filter id="heat-distortion">
            <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="3" result="noise" seed="0" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="30" xChannelSelector="R" yChannelSelector="G" />
            <animate attributeName="seed" from="0" to="100" dur="15s" repeatCount="indefinite" />
          </filter>
        </defs>
      </svg>
    </ion-content>
  </ion-page>
</template>

<script src="./WorldPlains" />
<style lang="scss" src="./_WorldPlains.scss" scoped />
<style lang="scss">
  #wind-temple{
    .fa-place-of-worship {
      --fa-primary-color: var(--xp-color-white);
      --fa-secondary-color: var(--xp-color-white);
      // --fa-secondary-opacity: 1
    }
  }
</style>
