<template>
  <ion-page :class="[$options.name, 'xp-settings-page']">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <xp-back-button></xp-back-button>
        </ion-buttons>
        <ion-title>Feature Requests</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rpg-box bg-slide ion-padding">
      <ion-card class="max-w-2xl help-card">
        <ion-card-header>
          <ion-card-title>Shape what comes next</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p>
            Feature requests live on the Town Hall board, where every family can read them, add their own and comment.
            The developers read the board and post what ships in Updates.
          </p>
          <div class="help-actions">
            <ion-button data-cy="open-feature-requests" @click="openBoard('feature-requests')">
              <i class="fad fa-clipboard-list mr-2"></i>
              Feature Requests board
            </ion-button>
            <ion-button color="secondary" @click="openBoard('ideas-suggestions')">
              <i class="fad fa-lightbulb-on mr-2"></i>
              Ideas &amp; Suggestions
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-card class="max-w-2xl help-card">
        <ion-card-content>
          <p>
            The Town Hall needs the internet and a free account on the Town Hall site; it offers to set one up the
            first time. A hero's post waits for a Game Master to approve it.
          </p>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script src="./FeatureRequest.ts" lang="ts"></script>
<style lang="scss" src="./_FeatureRequest.scss" scoped></style>
