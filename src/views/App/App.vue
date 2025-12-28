<template>
  <ion-app :id="rpgTheme">
    <xp-audio-permission-modal />
    <ion-split-pane content-id="main-content" @click="clickSound">
      <xp-side-menu 
        v-show="!battleState('active')" 
        @toggleBGM="toggleBGMOnOff" 
        @changeBGM="clickBGMTrack"
      />
      <ion-router-outlet id="main-content" />
    </ion-split-pane>
    <xp-global-dialog />
  </ion-app>
</template>

<script src="./App" />
<style src="./_App.scss" lang="scss" />