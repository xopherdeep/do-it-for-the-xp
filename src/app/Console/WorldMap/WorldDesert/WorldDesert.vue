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
          <!-- The oasis under the palm, the temple on the west salt flat, Pegasus on the east flat -->
          <xp-building-model class="world-spot" style="--x: 68%; --y: 47%; --z: 47" building-id="pond-of-life" :size="95" />
          <xp-temple-model class="world-spot" style="--x: 33%; --y: 69%; --z: 69" temple-id="light-temple" :size="105" />
          <xp-building-model class="world-spot" style="--x: 68%; --y: 75%; --z: 75" building-id="pegasus" world="desert" :size="100" />
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
