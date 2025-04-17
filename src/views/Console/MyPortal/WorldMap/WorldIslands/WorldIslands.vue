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
      <div class="tropical-effects">
        <!-- Sunrays -->
        <div class="sunrays-container">
          <div class="sunray sunray1" style="--start-rotation: 20deg"></div>
          <div class="sunray sunray2" style="--start-rotation: 10deg"></div>
          <div class="sunray sunray3" style="--start-rotation: 0deg"></div>
          <div class="sunray sunray4" style="--start-rotation: -10deg"></div>
          <div class="sunray sunray5" style="--start-rotation: -20deg"></div>
        </div>
        
        <!-- Flying birds -->
        <div class="birds-container">
          <!-- Individual birds that land and take off -->
          <div class="bird bird1">
            <div class="bird-body"></div>
            <div class="wing wing-left"></div>
            <div class="wing wing-right"></div>
          </div>
          <div class="bird bird2">
            <div class="bird-body"></div>
            <div class="wing wing-left"></div>
            <div class="wing wing-right"></div>
          </div>
          <div class="bird bird3">
            <div class="bird-body"></div>
            <div class="wing wing-left"></div>
            <div class="wing wing-right"></div>
          </div>
          <div class="bird bird4">
            <div class="bird-body"></div>
            <div class="wing wing-left"></div>
            <div class="wing wing-right"></div>
          </div>
          <div class="bird bird5">
            <div class="bird-body"></div>
            <div class="wing wing-left"></div>
            <div class="wing wing-right"></div>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script src="./WorldIslands" />
<style lang="scss" src="./_WorldIslands.scss"/>
<style lang="scss">
  #water-temple{
    .fa-place-of-worship {
      --fa-primary-color: var(--xp-color-blue);
      --fa-secondary-color: var(--xp-color-blue);
      // --fa-secondary-opacity: 1
    }
  }
</style>
