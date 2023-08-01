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
    </ion-content>
  </ion-page>
</template>

<script src="./WorldMoon" />
<style lang="scss" src="./_WorldMoon.scss" scoped />

<style lang="scss">
  #moon-temple{
    .fa-place-of-worship {
      --fa-primary-color: var(--xp-color-red);
      --fa-secondary-color: var(--xp-color-red);
      // --fa-secondary-opacity: 1
    }
  }
</style>
