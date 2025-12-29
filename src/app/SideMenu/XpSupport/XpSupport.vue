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
          Support
        </ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content
      :fullscreen="true"
      class="bg-slide ion-padding"
    >
      <ion-grid class="max-w-5xl">
        <ion-row>
          <ion-col
            size="12"
            size-md="4"
            v-for="tile in tiles"
            :key="tile.title"
          >
            <ion-card
              @click="navigateTo(tile.src)"
              class="support-card"
            >
              <ion-card-header class="ion-text-center">
                <i
                  class="fad fa-5x"
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
