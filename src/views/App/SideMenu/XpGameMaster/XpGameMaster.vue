<template>
  <ion-page :class="$options.name" class="rpg-box">
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/switch-profile" />
        </ion-buttons>
        <ion-title> XP Game Master Settings </ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-tabs>
        <ion-router-outlet ref="outlet"></ion-router-outlet>
        <ion-tab-bar slot="bottom">
          <ion-tab-button tab="achievements" href="/game-master/achievements">
            <ion-icon :ios="trophyOutline" :md="trophySharp" />
            Achievements
          </ion-tab-button>
          <ion-tab-button tab="dashboard" href="/game-master">
            <ion-icon :ios="speedometerOutline" :md="speedometerSharp" />
            Dashboard
          </ion-tab-button>
          <ion-tab-button tab="beastiary" href="/game-master/beastiary">
            <ion-icon :ios="pawOutline" :md="pawSharp" />
            Beastiary
          </ion-tab-button>
        </ion-tab-bar>
      </ion-tabs>
    </ion-content>
  </ion-page>
</template>

<script src="./XpGameMaster" />
<style lang="scss" src="./_XpGameMaster.scss" scoped />
