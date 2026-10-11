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
      <div class="world-landmarks-layer">
        <xp-building-model building-id="hermits-tent" :size="105" />
        <xp-building-model building-id="pegasus" label="Travel World" sublabel="Fly to World Map" :size="105" />
        <xp-temple-model temple-id="earth-temple" :size="105" />
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
