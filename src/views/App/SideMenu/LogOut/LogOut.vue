<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button :router-link="`/xp-profile`">
            <ion-icon :icon="arrowBack" slot="icon-only" />
          </ion-button>
        </ion-buttons>
        <ion-title>
          <ion-icon
            :ios="lockClosedOutline"
            :md="lockClosedSharp"
            class="fa-lg mr-2"
          />
          Log Out
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true"> </ion-content>
  </ion-page>
</template>

<script src="./LogOut" />
<style lang="scss" src="./_LogOut.scss" scoped />
