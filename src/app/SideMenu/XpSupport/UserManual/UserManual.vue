<template>
  <ion-page :class="[$options.name, 'xp-settings-page']">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <xp-back-button></xp-back-button>
        </ion-buttons>
        <ion-title>User Manual</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rpg-box bg-slide ion-padding">
      <ion-card class="max-w-2xl help-card">
        <ion-list>
          <ion-accordion-group :value="openChapter">
            <ion-accordion
              v-for="chapter in chapters"
              :key="chapter.id"
              :value="chapter.id"
              :data-cy="`manual-${chapter.id}`"
            >
              <ion-item slot="header">
                <i :class="['fad', `fa-${chapter.icon}`, 'fa-lg', 'icon-colors', 'help-icon']" slot="start"></i>
                <ion-label class="ion-text-wrap">
                  <h2>
                    {{ chapter.title }}
                    <ion-badge color="medium" class="help-audience">{{ chapter.audience }}</ion-badge>
                  </h2>
                </ion-label>
              </ion-item>
              <div slot="content" class="help-chapter">
                <p>{{ chapter.intro }}</p>
                <ol>
                  <li v-for="step in chapter.steps" :key="step">{{ step }}</li>
                </ol>
              </div>
            </ion-accordion>
          </ion-accordion-group>
        </ion-list>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script src="./UserManual.ts" lang="ts"></script>
<style lang="scss" src="./_UserManual.scss" scoped></style>
