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
      <WeatherFX type="mountains" :intensity="4" :sound-enabled="false" />
      <div class="world-scene-frame">
        <div class="world-scene">
          <!-- Temple up the switchback trail, the caverns at the cave mouth, Pegasus in the valley camp -->
          <xp-temple-model class="world-spot" style="--x: 56%; --y: 54%; --z: 54" temple-id="fire-temple" :size="95" />
          <xp-building-model class="world-spot" style="--x: 74%; --y: 64%; --z: 64" building-id="crystal-caverns" :size="100" />
          <xp-building-model class="world-spot" style="--x: 27%; --y: 69%; --z: 69" building-id="pegasus" world="mountains" :size="105" />
          <!-- Boobeedeedle's balloon, only on the day the traveling merchant is visiting this world -->
          <xp-traveling-merchant class="world-spot" style="--x: 42%; --y: 63%; --z: 63" world="mountains" :size="100" />
        </div>
      </div>
      <div class="fire-container">
        <!-- Base fire layer along the bottom -->
        <div class="fire-base"></div>
        
        <!-- Original flame clusters -->
        <div class="flames-wrapper">
          <div class="flame-cluster flame-cluster1">
            <div class="flame flame-large"></div>
            <div class="flame flame-medium"></div>
            <div class="flame flame-small"></div>
          </div>
          <div class="flame-cluster flame-cluster2">
            <div class="flame flame-large"></div>
            <div class="flame flame-medium"></div>
            <div class="flame flame-small"></div>
          </div>
          <div class="flame-cluster flame-cluster3">
            <div class="flame flame-large"></div>
            <div class="flame flame-medium"></div>
            <div class="flame flame-small"></div>
          </div>
        </div>
        
        <!-- Enhanced glow effect -->
        <div class="fire-glow"></div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./WorldMountains.ts" />
<style lang="scss" src="./_WorldMountains.scss" scoped />
<style lang="scss">
  #fire-temple{
    .fa-place-of-worship {
      --fa-primary-color: var(--xp-color-red);
      --fa-secondary-color: var(--xp-color-red);
      // --fa-secondary-opacity: 1
    }
  }
</style>
