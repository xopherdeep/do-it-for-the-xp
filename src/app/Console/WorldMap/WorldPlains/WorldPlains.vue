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
          <xp-draggable-spot screen="world-plains" spot-id="pegasus-ranch" :default-x="26" :default-y="40">
            <xp-building-model building-id="pegasus-ranch" :size="100" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-plains" spot-id="wind-temple" :default-x="69" :default-y="41">
            <xp-temple-model temple-id="wind-temple" :size="100" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-plains" spot-id="pegasus" :default-x="69" :default-y="67">
            <xp-building-model building-id="pegasus" world="plains" :size="105" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-plains" spot-id="home-town" :default-x="25" :default-y="69">
            <xp-building-model building-id="home-town" label="Hometown" sublabel="Return home" :size="105" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-plains" spot-id="merchant" :default-x="47" :default-y="56">
            <xp-traveling-merchant world="plains" :size="100" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-plains" spot-id="hotel" :default-x="48" :default-y="26">
            <xp-building-model building-id="hotel" world="plains" :size="105" />
          </xp-draggable-spot>
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
      <svg width="0" height="0" class="svg-filter-hidden">
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
