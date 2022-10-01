<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button
            :default-href="`/my-portal/${userId}/the-city`"
          ></ion-back-button>
          <i class="fa fa-2x" :class="`fa-${shopIcon}`" />
        </ion-buttons>
        <ion-title> 
          <i class="fa fa-lg fa-user-circle" />
          My Profile
        </ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content :fullscreen="true">
      <ion-grid>
        <ion-row>
          <ion-col>
            <CardUserStats :id="userId" :hideMenu="true" />
            <XpCardMenu :actions="userActions" />
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-page>
</template>

<script src="./MyProfile" />
<style lang="scss" src="./_MyProfile.scss" scoped/>