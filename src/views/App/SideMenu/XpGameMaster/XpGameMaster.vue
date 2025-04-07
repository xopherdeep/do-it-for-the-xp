<template>
  <ion-page :class="$options.name" class="rpg-box">
    <ion-content>
      <ion-tabs>
        <ion-router-outlet ref="outlet"></ion-router-outlet>
        <ion-tab-bar slot="bottom">
          <ion-tab-button
            tab="dashboard"
            href="/game-master"
            :selected="$route.path === '/game-master/dashboard'"
          >
            <i class="fad fa-tachometer-slowest fa-2x" />
            Dashboard
          </ion-tab-button>
          <ion-tab-button
            tab="compendium"
            href="/game-master/compendium"
            :selected="$route.path.indexOf('game-master/compendium/') >= 0"
          >
            <i class="fad fa-gamepad-alt fa-2x" />
            Compendium
          </ion-tab-button>
          <ion-tab-button
            tab="world"
            href="/game-master/temples"
            :selected="$route.path === '/game-master/temples'"
          >
            <i class="fad fa-place-of-worship fa-2x" />
            Temples
          </ion-tab-button>
        </ion-tab-bar>
      </ion-tabs>
    </ion-content>
  </ion-page>
</template>

<script src="./XpGameMaster" />
<style lang="scss" src="./_XpGameMaster.scss" scoped />
