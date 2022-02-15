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
 <ion-list>
    <ion-list-header>
      <ion-label>
        Sound FX Settings
      </ion-label>
    </ion-list-header>

    <ion-item>
      <ion-label>User Interface (UI)</ion-label>
      <ion-select @ionChange="changeUISound" :value="$fx.theme.ui" placeholder="Select One">
        <ion-select-option value="nintendo">Nintendo</ion-select-option>
        <ion-select-option value="sony">Playstation</ion-select-option>
      </ion-select>
    </ion-item>

    <ion-item>
      <ion-label>Role Playing Game (RPG)</ion-label>
      <ion-select  @ionChange="changeRPGSound" :value="$fx.theme.rpg" ok-text="Okay" cancel-text="Dismiss">
        <ion-select-option value="earthbound">Children of Earth</ion-select-option>
        <ion-select-option value="chronoTrigger">Timeless Contention</ion-select-option>
        <ion-select-option value="finalFantasy">Last of the Dreams</ion-select-option>
      </ion-select>
    </ion-item>

  </ion-list>
    </ion-content>
  </ion-page>
</template>

<script src="./XpSettings.js" />
<style lang="scss" src="./_XpSettings.scss" scoped/>