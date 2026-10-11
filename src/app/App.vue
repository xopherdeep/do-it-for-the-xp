<template>
  <ion-app :id="rpgTheme">
    <xp-studio-splash v-if="studioSplash" @done="studioSplash = false" />
    <xp-audio-permission-modal />
    <ion-split-pane content-id="main-content" @click="clickSound">
      <xp-side-menu 
        v-show="!battleState('active')" 
        @toggleBGM="toggleBGMOnOff" 
        @changeBGM="clickBGMTrack"
      />
      <ion-router-outlet id="main-content" :animated="!sceneTransitionActive" />
    </ion-split-pane>
    <xp-global-dialog />
    <xp-scene-transition />
  </ion-app>
</template>

<script lang="ts" src="./App.ts" />
<style src="./_App.scss" lang="scss" />