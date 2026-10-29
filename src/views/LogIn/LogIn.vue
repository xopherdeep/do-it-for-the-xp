<template>
  <ion-page
    ref="page"
    :class="$options.name"
    @click="play$fx('noSelect')"
  >
    <ion-content
      :fullscreen="true"
      class="content-container"
    >
      <!-- Static background overlay that doesn't animate -->
      <div class="static-background"></div>

      <!-- The way back to the side menu (Select Profile lives there) -->
      <ion-menu-toggle class="menu-corner">
        <ion-button fill="clear" aria-label="Open menu" @click.stop="play$fx('openMenu')">
          <i class="fad fa-bars"></i>
        </ion-button>
      </ion-menu-toggle>

      <!-- Content container with fixed height to prevent scrolling -->
      <div class="content-wrapper">
        <ion-grid
          id="brand"
          class="bottom-aligned"
        >
          <!-- id="login-button" -->
          <ion-row>
            <ion-col>
              <ion-button
                size="large"
                class="glow-button fade-in-up"
                @click.stop="play$fx('start'); pressStart()"
              >
                <span class="pixel-text">Press Start</span>

                <ion-ripple-effect></ion-ripple-effect>
              </ion-button>
            </ion-col>
          </ion-row>

          <ion-row class="hidden">
            <ion-col>
              <ion-button
                size="small"
                id="settings-button"
                class="settings-button fade-in-up"
                @click.stop="play$fx('options')"
              >
                Settings
                <i class="fad fa-cog"></i>
              </ion-button>
              <ion-menu-toggle class="menu-toggle fade-in">
                <ion-button
                  size="small"
                  id="login-button"
                  class="settings-button fade-in-up"
                >
                  Open menu
                  <i class="fad fa-bars"></i>
                </ion-button>
              </ion-menu-toggle>
            </ion-col>
          </ion-row>

          <div class="version-info">
            <span>v{{ version }}</span>
          </div>
        </ion-grid>
      </div>

      <!-- Settings Modal -->
      <ion-modal
        ref="settings"
        trigger="settings-button"
        class="settings-modal"
      >
        <ion-content class="modal-content">
          <ion-grid>
            <ion-row>
              <ion-col>
                <ion-card class="settings-card">
                  <ion-buttons class="ion-float-right">
                    <ion-button
                      @click="closeModal"
                      class="close-button"
                    >
                      <i class="fad fa-times fa-2x"></i>
                    </ion-button>
                  </ion-buttons>
                  <ion-card-title class="card-title">
                    <i class="fad fa-cog fa-spin"></i>
                    Settings
                  </ion-card-title>
                  <ion-card-content>
                    <InputSettings />
                    <ion-button
                      color="medium"
                      fill="outline"
                      expand="block"
                      @click="closeModal"
                      class="close-button"
                    >
                      Close
                    </ion-button>
                  </ion-card-content>
                </ion-card>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./LogIn.ts" />
<style lang="scss" src="./_LogIn.scss" scoped />
