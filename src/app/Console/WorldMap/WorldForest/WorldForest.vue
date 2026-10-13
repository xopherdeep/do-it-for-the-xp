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
      <div class="world-scene-frame">
        <div class="world-scene">
          <xp-draggable-spot screen="world-forest" spot-id="earth-temple" :default-x="29" :default-y="48">
            <xp-temple-model temple-id="earth-temple" :size="95" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-forest" spot-id="hermits-tent" :default-x="47" :default-y="74">
            <xp-building-model building-id="hermits-tent" :size="100" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-forest" spot-id="pegasus" :default-x="70" :default-y="66">
            <xp-building-model building-id="pegasus" world="forest" :size="105" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-forest" spot-id="merchant" :default-x="64" :default-y="40">
            <xp-traveling-merchant world="forest" :size="100" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-forest" spot-id="hotel" :default-x="46" :default-y="28">
            <xp-building-model building-id="hotel" world="forest" :size="105" />
          </xp-draggable-spot>
        </div>
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
