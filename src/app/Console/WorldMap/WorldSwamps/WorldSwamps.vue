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
          <xp-draggable-spot screen="world-swamps" spot-id="shadow-temple" :default-x="57" :default-y="57">
            <xp-temple-model temple-id="shadow-temple" :size="95" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-swamps" spot-id="witchs-hut" :default-x="25" :default-y="73">
            <xp-building-model building-id="witchs-hut" :size="105" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-swamps" spot-id="pegasus" :default-x="73" :default-y="72">
            <xp-building-model building-id="pegasus" world="swamps" :size="100" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-swamps" spot-id="merchant" :default-x="36" :default-y="44">
            <xp-traveling-merchant world="swamps" :size="100" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-swamps" spot-id="hotel" :default-x="68" :default-y="36">
            <xp-building-model building-id="hotel" world="swamps" :size="105" />
          </xp-draggable-spot>
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
