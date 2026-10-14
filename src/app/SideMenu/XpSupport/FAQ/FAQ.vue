<template>
  <ion-page :class="[$options.name, 'xp-settings-page']">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <xp-back-button></xp-back-button>
        </ion-buttons>
        <ion-title>F.A.Q.</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true" class="rpg-box bg-slide ion-padding">
      <ion-card v-for="group in groups" :key="group.title" class="max-w-2xl help-card">
        <ion-list>
          <ion-item-divider>
            <ion-label>{{ group.title }}</ion-label>
          </ion-item-divider>
          <ion-accordion-group>
            <ion-accordion
              v-for="entry in group.entries"
              :key="entry.question"
              :value="entry.question"
            >
              <ion-item slot="header">
                <ion-label class="ion-text-wrap">
                  <h2>{{ entry.question }}</h2>
                </ion-label>
              </ion-item>
              <div slot="content" class="help-answer">
                {{ entry.answer }}
              </div>
            </ion-accordion>
          </ion-accordion-group>
        </ion-list>
      </ion-card>

      <ion-card class="max-w-2xl help-card">
        <ion-card-content class="help-more">
          <p>Didn't find it?</p>
          <div class="help-actions">
            <ion-button size="small" router-link="/support/user-manual">Read the manual</ion-button>
            <ion-button size="small" router-link="/support/contact">Ask the developers</ion-button>
          </div>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script src="./FAQ.ts" lang="ts"></script>
<style lang="scss" src="./_FAQ.scss" scoped></style>
