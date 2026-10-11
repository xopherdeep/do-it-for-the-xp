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
      <div class="world-landmarks-layer">
        <xp-building-model building-id="witchs-hut" :size="105" />
        <xp-building-model building-id="pegasus" label="Travel World" sublabel="Fly to World Map" :size="105" />
        <xp-temple-model temple-id="shadow-temple" :size="105" />
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
