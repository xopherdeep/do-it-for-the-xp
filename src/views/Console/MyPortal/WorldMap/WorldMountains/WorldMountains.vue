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
      <div class="fire-container">
        <!-- Base fire layer along the bottom -->
        <div class="fire-base"></div>
        
        <!-- Mass ember effect -->
        <div class="embers-field">
          <div v-for="n in 80" :key="`field-ember-${n}`" class="field-ember"></div>
        </div>
        
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

<script src="./WorldMountains" />
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
