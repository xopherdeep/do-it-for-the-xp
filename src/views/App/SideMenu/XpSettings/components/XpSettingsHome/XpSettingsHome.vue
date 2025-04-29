<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-title> Settings </ion-title>
        <ion-buttons slot="start">
          <ion-menu-button
            @click="$fx.ui[$fx.theme.ui].select.play()"
          ></ion-menu-button>
          <ion-icon
            :ios="pizzaOutline"
            :md="pizzaSharp"
            class="fa-2x ml-2"
          />
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content
      :fullscreen="true"
      class="rpg-box bg-slide ion-padding"
    >
      <ion-grid class="max-w-5xl">
        <ion-row>
          <ion-col
            size="12"
            size-md="4"
            v-for="item in settingsItems"
            :key="item.id"
          >
            <ion-card
              button
              :routerLink="item.route"
              class="settings-card"
            >
              <ion-card-header class="ion-text-center">
                <ion-thumbnail class="mx-auto">
                  <ion-img :src="item.icon" />
                </ion-thumbnail>
                <ion-card-title>
                  {{ item.title }}
                </ion-card-title>
              </ion-card-header>
              <hr />
              <ion-card-content>
                {{ item.description }}
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-page>
</template>

<script src="./XpSettingsHome" />
<style lang="scss" src="./_XpSettingsHome.scss" scoped />
