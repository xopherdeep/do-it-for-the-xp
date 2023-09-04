<template>
  <ion-page
    :class="$options.name"
    class="rpg-box"
  >
    <ion-content>
      <ion-tabs>
        <ion-router-outlet ref="outlet"></ion-router-outlet>
        <ion-tab-bar slot="bottom">
          <ion-tab-button
            tab="abilities"
            href="/game-master/abilities"
          >
            <i class="fad fa-magic fa-2x" />
            Abilities
          </ion-tab-button>
          <ion-tab-button
            tab="accessories"
            href="/game-master/accessories"
          >
            <i class="fad fa-hand-holding-box fa-2x" />
            Accessories
          </ion-tab-button>
          <ion-tab-button
            tab="dashboard"
            href="/game-master"
          >
            <i class="fad fa-tachometer-alt fa-2x" />
            Dashboard
          </ion-tab-button>
          <ion-tab-button
            tab="achievements"
            href="/game-master/achievements"
          >
            <i class="fad fa-trophy fa-2x" />
            Achievements
          </ion-tab-button>
          <ion-tab-button
            tab="bestiary"
            href="/game-master/bestiary"
          >
            <i class="fad fa-dragon fa-2x" />
            Beastiary
          </ion-tab-button>

        </ion-tab-bar>
      </ion-tabs>
    </ion-content>
  </ion-page>
</template>

<script src="./XpGameMaster" />
<style lang="scss" src="./_XpGameMaster.scss" scoped />
