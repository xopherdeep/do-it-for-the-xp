<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar>
        <!-- <ion-buttons slot="start">
          <ion-button :router-link="`/my-portal/${userId}`" >
            <ion-icon :icon="arrowBack" slot="icon-only"/>
          </ion-button>
        </ion-buttons> -->
        <ion-title> 
          My Profile
        </ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content :fullscreen="true">
      <CardUserStats :id="userId" :hideMenu="true" />
    </ion-content>
  </ion-page>
</template>

<script src="./MyProfile.js" />
<style lang="scss" src="./_MyProfile.scss" scoped/>