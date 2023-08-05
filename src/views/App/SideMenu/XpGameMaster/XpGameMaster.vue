<template>
  <ion-page :class="$options.name" class="rpg-box">
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button :router-link="`/switch-profile`" >
            <ion-icon :icon="arrowBack" slot="icon-only"/>
          </ion-button>
        </ion-buttons>
        <ion-title> 
          XP Game Master Settings
        </ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content :fullscreen="true">
      <ion-tabs>
        <ion-router-outlet ref="outlet"></ion-router-outlet>
        <ion-tab-bar slot="bottom">
          <ion-tab-button
            tab="dashboard"
            href="/game-master"
          >
            <ion-icon :icon="arrowBack" color="success"></ion-icon>
            Dashboard 
          </ion-tab-button>
          <ion-tab-button
            tab="general"
            href="/game-master/general"
          >
            <ion-icon :icon="arrowBack" color="success"></ion-icon>
            Achievements


          </ion-tab-button>
        </ion-tab-bar>
      </ion-tabs>
    </ion-content>
  </ion-page>
</template>

<script src="./XpGameMaster" />
<style lang="scss" src="./_XpGameMaster.scss" scoped/>