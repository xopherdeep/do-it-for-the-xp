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
      <div class="enchanted-forest">
        <!-- Fireflies container -->
        <div class="fireflies-container">
          <div v-for="n in 30" :key="`firefly-${n}`" class="firefly"></div>
        </div>
        
        <!-- Glowing particles -->
        <div class="particles-container">
          <div v-for="n in 25" :key="`particle-${n}`" class="particle"></div>
        </div>
        
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

<script src="./WorldForest" />
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
