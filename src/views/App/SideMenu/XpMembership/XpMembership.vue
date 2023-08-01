<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title> 
          Membership
        </ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content :fullscreen="true">
      <ion-grid>
        <ion-row>
          <ion-col>
            <ion-card >
              <ion-card-title>
                Your Active Plan
              </ion-card-title>
              <ion-card-header>
                <ion-text>
                  <h1>
                    $49.99
                    <ion-chip color="light">
                      Paid Annually 
                    </ion-chip>
                  <ion-badge color="warning">
                    Premium
                  </ion-badge>
                  </h1>
                </ion-text>
              </ion-card-header>

              <ion-card-content class="">
                <ion-text class="ion-float-right">
                  Next payment:
                  <b>
                    Friday, 12 August 2022
                  </b> 
                </ion-text>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
        <ion-row>
          <ion-col>
            <ion-card>
              <ion-card-title>
                Plan Benefits
              </ion-card-title>
              <ion-card-content>
                <ion-list>
                  <ion-item v-for="(benefit, index) in benefits" :key="index">
                    <ion-icon :icon="checkmarkCircle" color="primary" slot="start" />
                    {{ benefit }}
                  </ion-item>
                </ion-list>
                <ion-button expand="block" color="primary">
                  Cancel Membership 
                  <ion-icon :icon="stopCircle"  slot="end" size="small" />
                </ion-button>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
      <div class="night">
        <div class="shooting_star"></div>
        <div class="shooting_star"></div>
        <div class="shooting_star"></div>
        <div class="shooting_star"></div>
        <div class="shooting_star"></div>
        <div class="shooting_star"></div>
        <div class="shooting_star"></div>
        <div class="shooting_star"></div>
        <div class="shooting_star"></div>
        <div class="shooting_star"></div>
        <div class="shooting_star"></div>
        <div class="shooting_star"></div>
        <div class="shooting_star"></div>
        <div class="shooting_star"></div>
        <div class="shooting_star"></div>
        <div class="shooting_star"></div>
        <div class="shooting_star"></div>
        <div class="shooting_star"></div>
        <div class="shooting_star"></div>
        <div class="shooting_star"></div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script src="./XpMembership" />
<style lang="scss" src="./_XpMembership.scss" scoped/>