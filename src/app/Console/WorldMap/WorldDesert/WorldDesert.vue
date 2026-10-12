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
      <WeatherFX type="desert" :intensity="5" :sound-enabled="false" />
      <div class="world-scene-frame">
        <div class="world-scene">
          <!-- The oasis on the flat under the palm, the temple on the west salt pan, Pegasus on the east pan -->
          <xp-building-model class="world-spot" style="--x: 70%; --y: 50%; --z: 50" building-id="pond-of-life" :size="95" />
          <xp-temple-model class="world-spot" style="--x: 27%; --y: 71%; --z: 71" temple-id="light-temple" :size="105" />
          <xp-building-model class="world-spot" style="--x: 72%; --y: 74%; --z: 74" building-id="pegasus" world="desert" :size="100" />
          <!-- Boobeedeedle's balloon, only on the day the traveling merchant is visiting this world -->
          <xp-traveling-merchant class="world-spot" style="--x: 48%; --y: 56%; --z: 56" world="desert" :size="100" />
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./WorldDesert.ts" />
<style lang="scss" src="./_WorldDesert.scss" scoped />
<style lang="scss">
  #sun-temple{
    .fa-place-of-worship {
      --fa-primary-color: var(--xp-color-yellow);
      --fa-secondary-color: var(--xp-color-orange);
      // --fa-secondary-opacity: 1
    }
  }
</style>
