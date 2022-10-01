<template>
  <ion-page ref="page" @click="play$fx('noSelect')">
    <!-- <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button :router-link="`/login`" >
            <ion-icon :icon="arrowBack" slot="icon-only"/>
          </ion-button>
        </ion-buttons>
        <ion-title> 
        </ion-title>
      </ion-toolbar>
    </ion-header> -->

    <ion-content :fullscreen="true">
      <ion-grid id="brand">
        <ion-row>
          <ion-col>
            <h1>
              <small>
              </small>
               <br/>
              DO IT FOR THE XP
            </h1>
          </ion-col>
        </ion-row>
        <ion-row>
          <ion-col>
            <div>
              <img class="filter-green" :src="requireImg('./level.svg')" />
            </div>
          </ion-col>
        </ion-row>

        <ion-row>
          <ion-col>
            <ion-button
              size="large"
              id="login-button"
              @click.stop="play$fx('alert')"
            >
              <i class="fad fa-sparkles"></i>
              START XP
              <i class="fad fa-sparkles"></i>
            </ion-button>
          </ion-col>
        </ion-row>
        <ion-row>
          <ion-col>
            <ion-button
              size=""
              id="settings-button"
              @click.stop="play$fx('options')"
            >
              Settings
              <i class="fad fa-tools"></i>
            </ion-button>
          </ion-col>
        </ion-row>
      </ion-grid>
      <ion-modal :is-open="code" ref="modal" trigger="login-button" class="login">
        <ion-content>
          <ion-grid>
            <ion-row>
              <ion-col>
                <ion-card v-if="!!code">
                  <ion-card-title>
                    Logging in...
                  </ion-card-title>
                  <ion-card-content>
                    Thank you for logging in! Hold tight while we load your profile.
                  </ion-card-content>
                </ion-card>
                <ion-card v-else>
                    <i @click="closeModal" class="ion-float-right fad fa-times fa-3x close"></i>
                    <ion-card-title>
                      Login @ DoIt.forTheXP.com
                    </ion-card-title>
                  <ion-card-content>
                      You must login through our site:
                      https://doit.forthexp.com
                    <!-- Input with placeholder -->
                    <!-- <ion-input
                      placeholder="Enter Username or Email"
                      :class="{ error: error }"
                      clear-input
                      v-model="username"
                    ></ion-input> -->

                    <!-- Input with clear button when there is a value -->
                    <!-- <ion-input
                      clear-input
                      :class="{ error: error }"
                      placeholder="Enter Password"
                      type="password"
                      v-model="password"
                    ></ion-input> -->
                    <ion-button
                      @click="clickSignIn"
                      color="light"
                      expand="block"
                      fill="outline"
                    >
                      <i class="fad fa-sword fa-lg"> </i>
                      &nbsp; Login 
                    </ion-button>
                  </ion-card-content>
                </ion-card>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-content>
      </ion-modal>
      <ion-modal ref="settings" trigger="settings-button">
        <ion-content>
          <ion-grid>
            <ion-row>
              <ion-col>
                <ion-card>
                    <ion-buttons class="ion-float-right">
                      <ion-button @click="closeModal">
                        <i class="fad fa-times fa-2x"></i>
                      </ion-button>
                    </ion-buttons>
                    <ion-card-title>
                      Settings
                    </ion-card-title>
                  <ion-card-header>
                  </ion-card-header>
                  <ion-card-content>
                    <InputSettings />
                  </ion-card-content>
                </ion-card>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-content>
      </ion-modal>
      <footer>
        <p align="center">
          <a href="https://twitter.com/xopherdeep" class="btn-twtr" target="_b"
            >Follow me on Twitter</a
          >
        </p>
      </footer>
    </ion-content>
  </ion-page>
</template>

<script src="./LogIn" />
<style lang="scss" src="./_LogIn.scss" scoped />
