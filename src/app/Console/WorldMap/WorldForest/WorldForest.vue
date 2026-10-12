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
          <!-- Temple in the deep meadow, the hermit camped in the glade by the path, Pegasus where the path leaves the wood -->
          <xp-temple-model class="world-spot" style="--x: 60%; --y: 42%; --z: 42" temple-id="earth-temple" :size="95" />
          <xp-building-model class="world-spot" style="--x: 30%; --y: 64%; --z: 64" building-id="hermits-tent" :size="100" />
          <xp-building-model class="world-spot" style="--x: 66%; --y: 75%; --z: 75" building-id="pegasus" world="forest" :size="105" />
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
