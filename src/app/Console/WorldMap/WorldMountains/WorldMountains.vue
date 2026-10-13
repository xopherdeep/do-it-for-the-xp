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
      <WeatherFX type="mountains" :intensity="4" :sound-enabled="false" />
      <div class="world-scene-frame">
        <div class="world-scene">
          <xp-draggable-spot screen="world-mountains" spot-id="fire-temple" :default-x="30" :default-y="79">
            <xp-temple-model temple-id="fire-temple" :size="95" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-mountains" spot-id="crystal-caverns" :default-x="70" :default-y="62">
            <xp-building-model building-id="crystal-caverns" :size="100" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-mountains" spot-id="pegasus" :default-x="74" :default-y="80">
            <xp-building-model building-id="pegasus" world="mountains" :size="105" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-mountains" spot-id="merchant" :default-x="40" :default-y="58">
            <xp-traveling-merchant world="mountains" :size="100" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-mountains" spot-id="hotel" :default-x="28" :default-y="38">
            <xp-building-model building-id="hotel" world="mountains" :size="105" />
          </xp-draggable-spot>
        </div>
      </div>
      <div class="fire-container">
        <!-- Base fire layer along the bottom -->
        <div class="fire-base"></div>
        
        <!-- Original flame clusters -->
        <div class="flames-wrapper">
          <div class="flame-cluster flame-cluster1">
            <div class="flame flame-large"></div>
            <div class="flame flame-medium"></div>
            <div class="flame flame-small"></div>
          </div>
          <div class="flame-cluster flame-cluster2">
            <div class="flame flame-large"></div>
            <div class="flame flame-medium"></div>
            <div class="flame flame-small"></div>
          </div>
          <div class="flame-cluster flame-cluster3">
            <div class="flame flame-large"></div>
            <div class="flame flame-medium"></div>
            <div class="flame flame-small"></div>
          </div>
        </div>
        
        <!-- Enhanced glow effect -->
        <div class="fire-glow"></div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./WorldMountains.ts" />
<style lang="scss" src="./_WorldMountains.scss" scoped />
<style lang="scss">
  #fire-temple{
    .fa-place-of-worship {
      --fa-primary-color: var(--xp-color-red);
      --fa-secondary-color: var(--xp-color-red);
      // --fa-secondary-opacity: 1
    }
  }
</style>
