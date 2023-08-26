<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>
          Support
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-grid>
        <ion-row>
          <ion-col
            size="6"
            v-for="tile in tiles"
            :key="tile.title"
          >
            <ion-card>
              <ion-card-header class="ion-text-center">
                <i
                  class="fad fa-5x"
                  :class="tile.icon"
                ></i>
                <ion-card-title>
                  {{ tile.title }}
                </ion-card-title>
                <!-- <ion-card-title>
                      {{tile.title}}
                    </ion-card-title> -->
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

<script src="./XpSupport" lang="ts" />
<style lang="scss" src="./_XpSupport.scss" scoped/>