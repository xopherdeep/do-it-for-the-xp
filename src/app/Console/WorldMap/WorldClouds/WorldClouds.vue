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
      <WeatherFX type="cloudy" :intensity="5" :sound-enabled="false" />
      <div class="world-scene-frame">
        <div class="world-scene">
          <!-- Temple on the high east cloudbank, the market on the west cloud, Pegasus on the low cloud road -->
          <xp-temple-model class="world-spot" style="--x: 64%; --y: 52%; --z: 52" temple-id="storm-temple" :size="100" />
          <xp-building-model class="world-spot" style="--x: 28%; --y: 65%; --z: 65" building-id="cloud-market" :size="105" />
          <xp-building-model class="world-spot" style="--x: 52%; --y: 83%; --z: 83" building-id="pegasus" world="clouds" :size="100" />
          <!-- Boobeedeedle's balloon, only on the day the traveling merchant is visiting this world -->
          <xp-traveling-merchant class="world-spot" style="--x: 40%; --y: 44%; --z: 44" world="clouds" :size="100" />
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./WorldClouds.ts" />
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