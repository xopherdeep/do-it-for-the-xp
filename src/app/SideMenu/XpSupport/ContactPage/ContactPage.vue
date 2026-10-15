<template>
  <ion-page :class="[$options.name, 'xp-settings-page']">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <xp-back-button></xp-back-button>
        </ion-buttons>
        <ion-title>Ask the Developers</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rpg-box bg-slide ion-padding">
      <ion-card class="max-w-2xl help-card">
        <ion-card-header>
          <ion-card-title>Write to us</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p>
            Questions, bugs and feedback go on the Town Hall board, where the developers answer. Say what you were
            doing, what you expected and what happened, and include the version below.
          </p>
          <div class="help-actions">
            <ion-button data-cy="open-feedback-board" @click="openBoard('comments-feedback')">
              <i class="fad fa-comments mr-2"></i>
              Comments &amp; Feedback
            </ion-button>
            <ion-button color="secondary" @click="openBoard('suggestion-box')">
              <i class="fad fa-inbox-in mr-2"></i>
              Suggestion Box
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-card class="max-w-2xl help-card">
        <ion-list>
          <ion-item-divider>
            <ion-label>Before you write</ion-label>
          </ion-item-divider>
          <ion-item button router-link="/support/faq">
            <i class="fad fa-question-circle fa-lg icon-colors help-icon" slot="start"></i>
            <ion-label>
              <h2>F.A.Q.</h2>
              <p>The questions families ask most</p>
            </ion-label>
          </ion-item>
          <ion-item button router-link="/support/user-manual" lines="none">
            <i class="fad fa-book fa-lg icon-colors help-icon" slot="start"></i>
            <ion-label>
              <h2>User Manual</h2>
              <p>How every part of the game works</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </ion-card>

      <ion-card class="max-w-2xl help-card">
        <ion-list>
          <ion-item-divider>
            <ion-label>This app</ion-label>
          </ion-item-divider>
          <ion-item button :detail="false" lines="none" data-cy="app-version" @click="copyVersion">
            <i class="fad fa-code-branch fa-lg icon-colors help-icon" slot="start"></i>
            <ion-label>
              <h2>Version {{ version }}</h2>
              <p>Tap to copy it for your post</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script src="./ContactPage.ts" lang="ts"></script>
<style lang="scss" src="./_ContactPage.scss" scoped></style>
