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
      <div class="world-landmarks-layer">
        <xp-temple-model temple-id="ice-temple" :size="115" />
        <xp-building-model building-id="snow-shack" :size="115" />
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
