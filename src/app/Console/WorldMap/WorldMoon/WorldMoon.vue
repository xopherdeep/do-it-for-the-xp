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
      <div class="world-scene-frame">
        <div class="world-scene">
          <xp-draggable-spot screen="the-moon" spot-id="pegasus" :default-x="70" :default-y="54">
            <xp-building-model building-id="pegasus" world="moon" :size="90" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="the-moon" spot-id="moon-temple" :default-x="64" :default-y="72">
            <xp-temple-model temple-id="moon-temple" :size="95" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="the-moon" spot-id="theia-city" :default-x="30" :default-y="80">
            <xp-building-model building-id="theia-city" :size="110" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="the-moon" spot-id="merchant" :default-x="36" :default-y="52">
            <xp-traveling-merchant world="moon" :size="100" />
          </xp-draggable-spot>
        </div>
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
