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
      <div class="sandstorm-container">
        <div class="sand-overlay"></div>
        <div class="sand-particles">
          <div v-for="n in 30" :key="n" class="sand-particle"></div>
        </div>
        <div class="dust-cloud dust-cloud1"></div>
        <div class="dust-cloud dust-cloud2"></div>
        <div class="dust-cloud dust-cloud3"></div>
        <div class="dust-cloud dust-cloud4"></div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script src="./WorldDesert" />
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
