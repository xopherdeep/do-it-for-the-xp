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
      <WeatherFX type="plains" :intensity="4" :sound-enabled="false" />
      <div class="world-scene-frame">
        <div class="world-scene">
          <!-- Ranch on the north-west clearing, the spire on the north-east rise, Pegasus on the south-east
               clearing, and the Hometown gate where the path leaves the plains -->
          <xp-building-model class="world-spot" style="--x: 29%; --y: 41%; --z: 41" building-id="pegasus-ranch" :size="100" />
          <xp-temple-model class="world-spot" style="--x: 70%; --y: 43%; --z: 43" temple-id="wind-temple" :size="100" />
          <xp-building-model class="world-spot" style="--x: 68%; --y: 66%; --z: 66" building-id="pegasus" world="plains" :size="105" />
          <xp-building-model class="world-spot" style="--x: 38%; --y: 82%; --z: 82" building-id="home-town" label="Hometown" sublabel="Return home" :size="105" />
          <!-- Boobeedeedle's balloon, only on the day the traveling merchant is visiting this world -->
          <xp-traveling-merchant class="world-spot" style="--x: 48%; --y: 58%; --z: 58" world="plains" :size="100" />
        </div>
      </div>
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

<script lang="ts" src="./WorldPlains.ts" />
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
