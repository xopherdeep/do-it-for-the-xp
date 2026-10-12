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
      <WeatherFX type="swamp" :intensity="5" :sound-enabled="false" />
      <div class="world-scene-frame">
        <div class="world-scene">
          <!-- Temple on the reed islet in the pools, the witch on the west mud bank, Pegasus on the east bank -->
          <xp-temple-model class="world-spot" style="--x: 57%; --y: 57%; --z: 57" temple-id="shadow-temple" :size="95" />
          <xp-building-model class="world-spot" style="--x: 25%; --y: 73%; --z: 73" building-id="witchs-hut" :size="105" />
          <xp-building-model class="world-spot" style="--x: 73%; --y: 72%; --z: 72" building-id="pegasus" world="swamps" :size="100" />
          <!-- Boobeedeedle's balloon, only on the day the traveling merchant is visiting this world -->
          <xp-traveling-merchant class="world-spot" style="--x: 36%; --y: 44%; --z: 44" world="swamps" :size="100" />
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./WorldSwamps.ts" />
<style lang="scss" src="./_WorldSwamps.scss" scoped />
<style lang="scss">
  #shadow-temple{
    .fa-place-of-worship {
      --fa-primary-color: var(--xp-color-yellow);
      --fa-secondary-color: var(--xp-color-yellow);
      // --fa-secondary-opacity: 1
    }
  }
</style>
