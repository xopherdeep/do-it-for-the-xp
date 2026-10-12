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
          <!-- Temple sunk among the north pools, the witch on the west mud bank, Pegasus on the east bank -->
          <xp-temple-model class="world-spot" style="--x: 64%; --y: 45%; --z: 45" temple-id="shadow-temple" :size="95" />
          <xp-building-model class="world-spot" style="--x: 28%; --y: 73%; --z: 73" building-id="witchs-hut" :size="105" />
          <xp-building-model class="world-spot" style="--x: 70%; --y: 76%; --z: 76" building-id="pegasus" world="swamps" :size="100" />
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
