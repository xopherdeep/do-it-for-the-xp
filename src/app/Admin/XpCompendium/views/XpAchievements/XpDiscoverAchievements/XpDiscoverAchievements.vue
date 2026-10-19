<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar color="success">
        <ion-buttons slot="start">
          <xp-back-button />
          <i class="fad fa-medal fa-2x"></i>
        </ion-buttons>
        <ion-title> Discover Achievements </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="my-tasks">
      <!-- The ready-made quests came from a feed that no longer answers: say so, keep the page -->
      <xp-coming-soon-card title="Discover" :items="comingSoonItems" />
    </ion-content>
  </ion-page>
</template>
<script lang="ts" src="./XpDiscoverAchievements.ts" />
