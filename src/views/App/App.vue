<template>
  <ion-app >
    <ion-split-pane content-id="main-content" @click="clickSound">
      <ion-menu content-id="main-content" type="overlay">
        <ion-content>
          <ion-list id="inbox-list">
            <ion-list-header>XP</ion-list-header>
            <ion-note>
              Do it for the XP
            </ion-note>

            <ion-menu-toggle
              auto-hide="false"
              v-for="(p, i) in getCurrentMenu()"
              :key="i"
            >
              <ion-item
                @click="selectedIndex = i; $fx.ui[$fx.theme.ui].select.play()"
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

          <ion-list id="labels-list" v-if="bookmarks">
            <ion-list-header>Labels</ion-list-header>
            <ion-item
              v-for="(label, index) in labels"
              lines="none"
              :key="index"
            >
              <ion-icon
                slot="start"
                :ios="bookmarkOutline"
                :md="bookmarkSharp"
              ></ion-icon>
              <ion-label>{{ label }}</ion-label>
            </ion-item>
          </ion-list>
        </ion-content>
      </ion-menu>
      <ion-router-outlet id="main-content"></ion-router-outlet>
    </ion-split-pane>
  </ion-app>
</template>

<script lang="ts" src="./App.ts" />
<style scoped src="./_App.scss" lang="scss"/>
