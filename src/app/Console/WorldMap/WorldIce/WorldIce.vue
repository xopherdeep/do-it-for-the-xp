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
      <WeatherFX type="snowy" :intensity="6" :sound-enabled="false" />
      <div class="world-scene-frame">
        <div class="world-scene">
          <!-- Temple among the north pines, the shack on the frozen lake's shore, Pegasus on the snowfield -->
          <xp-temple-model class="world-spot" style="--x: 62%; --y: 44%; --z: 44" temple-id="ice-temple" :size="95" />
          <xp-building-model class="world-spot" style="--x: 30%; --y: 70%; --z: 70" building-id="snow-shack" :size="105" />
          <xp-building-model class="world-spot" style="--x: 67%; --y: 76%; --z: 76" building-id="pegasus" world="ice" :size="100" />
          <!-- Boobeedeedle's balloon, only on the day the traveling merchant is visiting this world -->
          <xp-traveling-merchant class="world-spot" style="--x: 46%; --y: 58%; --z: 58" world="ice" :size="100" />
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./WorldIce.ts" />
<style lang="scss" src="./_WorldIce.scss" scoped />
<style lang="scss">
  #frozen-fortress{
    .fa-place-of-worship {
      --fa-primary-color: var(--xp-color-blue);
      --fa-secondary-color: var(--xp-color-blue);
      // --fa-secondary-opacity: 1
    }
  }
</style>
