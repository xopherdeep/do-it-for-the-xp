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

          <ion-row>
            <ion-col>
              <ion-button
                fill="clear"
                size="small"
                class="settings-link fade-in-up"
                @click.stop="play$fx('options'); openSettings()"
              >
                <i class="fad fa-cog"></i>
                <span>Settings</span>
              </ion-button>
            </ion-col>
          </ion-row>

          <div class="version-info">
            <span>v{{ version }}</span>
          </div>
        </ion-grid>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./LogIn.ts" />
<style lang="scss" src="./_LogIn.scss" scoped />
