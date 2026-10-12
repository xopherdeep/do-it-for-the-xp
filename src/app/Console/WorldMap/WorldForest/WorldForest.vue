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
      <WeatherFX type="forest" :intensity="5" :sound-enabled="false" />
      <div class="world-scene-frame">
        <div class="world-scene">
          <!-- Temple in the sunlit west meadow, the hermit in the bright south glade, Pegasus in the east clearing -->
          <xp-temple-model class="world-spot" style="--x: 29%; --y: 48%; --z: 48" temple-id="earth-temple" :size="95" />
          <xp-building-model class="world-spot" style="--x: 47%; --y: 74%; --z: 74" building-id="hermits-tent" :size="100" />
          <xp-building-model class="world-spot" style="--x: 70%; --y: 66%; --z: 66" building-id="pegasus" world="forest" :size="105" />
          <!-- Boobeedeedle's balloon, only on the day the traveling merchant is visiting this world -->
          <xp-traveling-merchant class="world-spot" style="--x: 64%; --y: 40%; --z: 40" world="forest" :size="100" />
        </div>
      </div>
      <div class="enchanted-forest">
        <!-- Magical forest mist -->
        <div class="mist-container">
          <div class="mist mist-1"></div>
          <div class="mist mist-2"></div>
          <div class="mist mist-3"></div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./WorldForest.ts" />
<style lang="scss" src="./_WorldForest.scss" />
<style lang="scss">
  .fa- {
    &place-of-worship, &trees, &store {
      --fa-primary-color: var(--xp-color-green);
      --fa-secondary-color: var(--xp-color-green);
      // --fa-secondary-opacity: 1
    }
  }

</style>
