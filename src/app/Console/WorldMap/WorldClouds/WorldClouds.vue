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
      <div class="world-scene-frame">
        <div class="world-scene">
          <xp-draggable-spot screen="world-clouds" spot-id="storm-temple" :default-x="66" :default-y="55">
            <xp-temple-model temple-id="storm-temple" :size="100" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-clouds" spot-id="cloud-market" :default-x="25" :default-y="68">
            <xp-building-model building-id="cloud-market" :size="105" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-clouds" spot-id="pegasus" :default-x="45" :default-y="84">
            <xp-building-model building-id="pegasus" world="clouds" :size="100" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-clouds" spot-id="merchant" :default-x="34" :default-y="46">
            <xp-traveling-merchant world="clouds" :size="100" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-clouds" spot-id="hotel" :default-x="68" :default-y="32">
            <xp-building-model building-id="hotel" world="clouds" :size="105" />
          </xp-draggable-spot>
        </div>
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