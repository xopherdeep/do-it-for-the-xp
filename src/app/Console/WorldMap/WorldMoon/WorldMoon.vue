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
      <WeatherFX type="moon" :intensity="5" :sound-enabled="false" />
      <div class="world-scene-frame">
        <div class="world-scene">
          <!-- Theia City on the near crater rim, the temple on the far ridge, Pegasus hovering in the starfield -->
          <xp-building-model class="world-spot" style="--x: 70%; --y: 54%; --z: 54" building-id="pegasus" world="moon" :size="90" />
          <xp-temple-model class="world-spot" style="--x: 64%; --y: 72%; --z: 72" temple-id="moon-temple" :size="95" />
          <xp-building-model class="world-spot" style="--x: 33%; --y: 78%; --z: 78" building-id="theia-city" :size="110" />
          <!-- Boobeedeedle's balloon, only on the day the traveling merchant is visiting this world -->
          <xp-traveling-merchant class="world-spot" style="--x: 36%; --y: 52%; --z: 52" world="moon" :size="100" />
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./WorldMoon.ts" />
<style lang="scss" src="./_WorldMoon.scss" scoped />

<style lang="scss">
  #moon-temple{
    .fa-place-of-worship {
      --fa-primary-color: var(--xp-color-red);
      --fa-secondary-color: var(--xp-color-red);
      // --fa-secondary-opacity: 1
    }
  }
</style>
