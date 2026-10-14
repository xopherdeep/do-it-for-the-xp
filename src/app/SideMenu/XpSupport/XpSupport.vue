<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-menu-button />
          <ion-button
            @click="onHelpIconClick"
            color="rpg"
          >
            <ion-icon
              :ios="helpOutline"
              :md="helpSharp"
              class="fa-2x"
              color="rpg"
            />
          </ion-button>
        </ion-buttons>
        <ion-title>
          Help Desk
        </ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content
      :fullscreen="true"
      class="rpg-box bg-slide ion-padding"
    >
      <ion-grid class="max-w-5xl">
        <ion-row>
          <ion-col
            v-for="(tile, index) in tiles"
            :size="index === tiles.length - 1 && tiles.length % 2 === 1 ? '12' : '6'"
            :class="{ 'full-row': index === tiles.length - 1 && tiles.length % 2 === 1 }"
            :key="tile.title"
          >
            <ion-card
              button
              @click="navigateTo(tile.src)"
              class="support-card"
            >
              <ion-card-header class="ion-text-center">
                <i
                  class="fad fa-3x"
                  :class="tile.icon"
                  style="color: var(--ion-color-rpg)"
                ></i>
                <ion-card-title>
                  {{ tile.title }}
                </ion-card-title>
              </ion-card-header>
              <hr />
              <ion-card-content>
                {{ tile.desc }}
                <div
                  v-if="tile.version"
                  class="version-info"
                >
                  v{{ tile.version }}
                </div>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-page>
</template>

<script src="./XpSupport.ts" lang="ts"></script>
<style lang="scss" src="./_XpSupport.scss" scoped></style>
