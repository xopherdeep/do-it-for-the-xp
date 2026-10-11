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
      <WeatherFX type="cloudy" :intensity="5" :sound-enabled="false" />
      <div class="world-landmarks-layer">
        <xp-temple-model temple-id="storm-temple" :size="115" />
        <xp-building-model building-id="cloud-market" :size="115" />
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./WorldClouds.ts" />
<style lang="scss" src="./_WorldClouds.scss" scoped />
<style lang="scss">
  #sky-temple{
    .fa-place-of-worship {
      --fa-primary-color: var(--xp-color-white);
      --fa-secondary-color: var(--xp-color-skyblue);
      // --fa-secondary-opacity: 1
    }
  }
</style>