<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button color="primary" @click="$fx.ui[$fx.theme.ui].select.play()"></ion-menu-button>
        </ion-buttons>
        <ion-title> 
          Settings
        </ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <InputSettings />
    </ion-content>
  </ion-page>
</template>

<script src="./XpSettings.js" />
<style lang="scss" src="./_XpSettings.scss" scoped/>