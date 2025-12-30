<template>
  <ion-page
    :class="$options.name"
    class="rpg-box"
  >
    <ion-content class="bg-slide bg-slide-dark">
      <ion-tabs>
        <ion-router-outlet
          :key="route.path.split('/')[2] || 'dashboard'"
          ref="outlet"
        ></ion-router-outlet>
        <ion-tab-bar
          slot="bottom"
          class="icon-colors"
        >
          <ion-tab-button
            tab="compendium"
            href="/game-master/compendium/setup"
            :selected="$route.path.indexOf('game-master/compendium/') >= 0"
          >
            <i class="fad fa-game-console-handheld fa-2x" />
            Setup XP
          </ion-tab-button>
          <ion-tab-button
            tab="dashboard"
            href="/game-master/dashboard"
            :selected="$route.path === '/game-master/dashboard'"
          >
            <i class="fad fa-heartbeat fa-2x" />
            Compendium
          </ion-tab-button>
          <ion-tab-button
            tab="chat"
            href="/game-master/chat"
            :selected="$route.path === '/game-master/chat'"
          >
            <i class="fad fa-comments fa-2x" />
            Chat
          </ion-tab-button>
        </ion-tab-bar>
      </ion-tabs>
    </ion-content>
  </ion-page>
</template>

<script src="./XpGameMaster" />
<style lang="scss" src="./_XpGameMaster.scss" scoped />
