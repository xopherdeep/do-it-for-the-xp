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
      <div class="world-scene-frame">
        <div class="world-scene">
          <xp-draggable-spot screen="world-ice" spot-id="ice-temple" :default-x="72" :default-y="57">
            <xp-temple-model temple-id="ice-temple" :size="95" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-ice" spot-id="snow-shack" :default-x="28" :default-y="69">
            <xp-building-model building-id="snow-shack" :size="105" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-ice" spot-id="pegasus" :default-x="58" :default-y="79">
            <xp-building-model building-id="pegasus" world="ice" :size="100" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-ice" spot-id="merchant" :default-x="44" :default-y="40">
            <xp-traveling-merchant world="ice" :size="100" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-ice" spot-id="hotel" :default-x="24" :default-y="38">
            <xp-building-model building-id="hotel" world="ice" :size="105" />
          </xp-draggable-spot>
        </div>
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
