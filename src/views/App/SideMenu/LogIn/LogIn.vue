<template>
  <ion-page
    ref="page"
    @click="play$fx('noSelect')"
    class="login-page"
  >
    <ion-content :fullscreen="true" class="content-container">
      <!-- Static background overlay that doesn't animate -->
      <div class="static-background"></div>
      
      <!-- Content container with fixed height to prevent scrolling -->
      <div class="content-wrapper">
        <ion-grid id="brand" class="bottom-aligned">

          <ion-row>
            <ion-col>
              <ion-button
                size="large"
                _id="login-button"
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
                    id="settings-button"
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
      
      <!-- Login Modal -->
      <ion-modal
        :is-open="code && !showSuccessModal"
        ref="modal"
        trigger="login-button"
        class="login"
      >
        <ion-content class="modal-content">
          <ion-grid>
            <ion-row>
              <ion-col>
                <ion-card v-if="!!code" class="animated-card">
                  <ion-card-title>
                    <ion-icon name="log-in-outline" class="login-icon"></ion-icon>
                    Logging in...
                  </ion-card-title>
                  <ion-card-content>
                    <div class="loading-container">
                      <p>Thank you for logging in! Hold tight while we load your profile.</p>
                      <ion-spinner name="dots" color="primary"></ion-spinner>
                    </div>
                  </ion-card-content>
                </ion-card>
                <ion-card v-else class="animated-card">
                  <i
                    @click="closeModal"
                    class="ion-float-right fad fa-times fa-2x close"
                  ></i>
                  <ion-card-title class="card-title">
                    <ion-icon name="key-outline" class="login-icon"></ion-icon>
                    Login @ DoIt.forTheXP.com
                  </ion-card-title>
                  <ion-card-content>
                    <p class="login-info">You must login through our site:</p>
                    <a href="https://doit.forthexp.com" target="_blank" class="site-link">doit.forthexp.com</a>
                    
                    <ion-button
                      @click="clickSignIn"
                      color="primary"
                      expand="block"
                      class="login-button"
                    >
                      <i class="fad fa-sword fa-lg"></i>
                      &nbsp; Login
                    </ion-button>
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
      
      <!-- Success Modal -->
      <successful-login-modal
        :is-open="showSuccessModal"
        @close="closeSuccessModal"
      />
      
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
                    <ion-button @click="closeModal" class="close-button">
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

<script src="./LogIn" />
<style lang="scss" src="./_LogIn.scss" scoped />
