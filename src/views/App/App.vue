<template>
  <ion-app :id="rpgTheme">
    <ion-split-pane content-id="main-content" @click="clickSound">
      <ion-menu v-show="!battleState('active')" content-id="main-content" type="overlay">
        <ion-content>
          <ion-list id="inbox-list">
            <ion-list-header>XP</ion-list-header>
            <ion-note> Do it for the XP </ion-note>

            <ion-menu-toggle
              auto-hide="false"
              v-for="(p, i) in getCurrentMenu()"
              :key="i"
            >
              <ion-item
                @click="
                  selectedIndex = i;
                  $fx.ui[$fx.theme.ui].select.play();
                "
                router-direction="root"
                :router-link="p.url"
                lines="none"
                detail="false"
                class="hydrated"
                :class="{ selected: selectedIndex === i }"
                button
              >
                <ion-icon
                  slot="start"
                  :ios="p.iosIcon"
                  :md="p.mdIcon"
                ></ion-icon>
                <ion-label>{{ p.title }}</ion-label>
              </ion-item>
            </ion-menu-toggle>
          </ion-list>
          <ion-list>
            <ion-note> Background Music (BGM) </ion-note>
            <ion-item>
              <i class="fad fa-music"> </i>
              <ion-buttons>
                <ion-toggle @ionChange="changeToggle" :checked="bgm.is_on"></ion-toggle>
                <ion-button @click="clickBGMTrack(-1)">
                  <i class="fad fa-step-backward"></i>
                </ion-button>
                <ion-button @click="clickBGMTrack(+1)">
                  <i class="fad fa-step-forward"></i>
                </ion-button>
              </ion-buttons>
            </ion-item>
          </ion-list>
        </ion-content>
      </ion-menu>
      <ion-router-outlet id="main-content"></ion-router-outlet>
    </ion-split-pane>
  </ion-app>
</template>

<script src="./App.js" />
<style src="./_App.scss" lang="scss" />
