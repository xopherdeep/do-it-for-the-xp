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
      <WeatherFX type="moon" :intensity="5" :sound-enabled="false" />
      <div class="world-landmarks-layer">
        <xp-temple-model temple-id="moon-temple" :size="115" />
        <xp-building-model building-id="theia-city" :size="115" />
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./WorldMoon.ts" />
<style lang="scss" src="./_WorldMoon.scss" scoped />

<style lang="scss">
  #moon-temple{
    .fa-place-of-worship {
      --fa-primary-color: var(--xp-color-red);
      --fa-secondary-color: var(--xp-color-red);
      // --fa-secondary-opacity: 1
    }
  }
</style>
