<template>
  <ion-page class="hero-phone-page">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-title>{{ pageTitle }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding hero-phone-content">
      <ion-grid class="hero-phone-grid">
        <ion-row class="ion-justify-content-center">
          <ion-col size="12" size-md="8" size-lg="6">
            <!-- Unlinked screen -->
            <ion-card v-if="isUnlinked" class="unlinked-card rpg-box" data-cy="unlinked-card">
              <ion-card-content>
                <ion-text class="unlinked-text" data-cy="unlinked-text">
                  {{ unlinkedText }}
                </ion-text>
                <ion-button
                  expand="block"
                  class="start-fresh-btn"
                  data-cy="start-fresh-button"
                  @click="handleStartFresh"
                >
                  <ion-text>Start fresh</ion-text>
                </ion-button>
              </ion-card-content>
            </ion-card>

            <!-- Hero card -->
            <ion-card v-else-if="card" class="hero-card rpg-box" data-cy="hero-card">
              <ion-card-content class="model-box ion-no-padding">
                <xp-hero-model :look="card.look" animation="idle" />
              </ion-card-content>

              <ion-card-header class="ion-text-center">
                <ion-card-title class="hero-nickname" data-cy="hero-nickname">
                  {{ card.nickname }}
                </ion-card-title>
                <ion-card-subtitle class="hero-details" data-cy="hero-details">
                  Level {{ card.level }} {{ card.jobClass }}
                </ion-card-subtitle>
              </ion-card-header>

              <ion-card-content class="ion-text-center">
                <ion-text class="quests-elsewhere" data-cy="quests-elsewhere">
                  {{ questsElsewhereText }}
                </ion-text>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./HeroPhone.ts"></script>
<style scoped lang="scss" src="./_HeroPhone.scss"></style>
