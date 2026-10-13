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
      <WeatherFX type="desert" :intensity="5" :sound-enabled="false" />
      <div class="world-scene-frame">
        <div class="world-scene">
          <xp-draggable-spot screen="world-sands" spot-id="pond-of-life" :default-x="70" :default-y="50">
            <xp-building-model building-id="pond-of-life" :size="95" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-sands" spot-id="light-temple" :default-x="27" :default-y="71">
            <xp-temple-model temple-id="light-temple" :size="105" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-sands" spot-id="pegasus" :default-x="72" :default-y="74">
            <xp-building-model building-id="pegasus" world="desert" :size="100" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-sands" spot-id="merchant" :default-x="48" :default-y="56">
            <xp-traveling-merchant world="desert" :size="100" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-sands" spot-id="hotel" :default-x="28" :default-y="38">
            <xp-building-model building-id="hotel" world="desert" :size="105" />
          </xp-draggable-spot>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./WorldDesert.ts" />
<style lang="scss" src="./_WorldDesert.scss" scoped />
<style lang="scss">
  #sun-temple{
    .fa-place-of-worship {
      --fa-primary-color: var(--xp-color-yellow);
      --fa-secondary-color: var(--xp-color-orange);
      // --fa-secondary-opacity: 1
    }
  }
</style>
