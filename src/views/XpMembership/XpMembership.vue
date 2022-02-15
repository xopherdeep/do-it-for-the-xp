<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title> 
          Membership
        </ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content :fullscreen="true">
 <ion-card >
    <ion-card-header>
      <ion-card-subtitle>Your Active Plan</ion-card-subtitle>
      <ion-card-title>
        Premium
      </ion-card-title>
      <ion-card-title>
        $49.99
      <ion-chip color="light">
        Paid Yearly
      </ion-chip>
      </ion-card-title>
    </ion-card-header>

    <ion-card-content>
      Next payment:
      <b>
        Friday, 12 August 2022
      </b> 
      <ion-button  expand="block">
        Change plan
      </ion-button>
    </ion-card-content>
  </ion-card>
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

<script src="./XpMembership.js" />
<style lang="scss" src="./_XpMembership.scss" scoped/>