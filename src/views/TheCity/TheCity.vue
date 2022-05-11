<template>
  <ion-page :class="$options.name">
    <!-- <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button :router-link="`/my-portal/${userId}`" >
            <ion-icon :icon="arrowBack" slot="icon-only"/>
          </ion-button>
        </ion-buttons>
        <ion-title> 
        </ion-title>
      </ion-toolbar>
    </ion-header> -->

    <ion-content :fullscreen="true">
    <ion-modal trigger="adventure-time"
        :breakpoints="[.9]"
        :initialBreakpoint=".9"
    >
      <ion-card>
        <ion-card-header>
          <ion-card-title>
            <i class="fad fa-clock fa-2x ion-float-right"></i>
            Adventure Time
          </ion-card-title>
        </ion-card-header>
      </ion-card>
    </ion-modal>
    <ion-modal trigger="rest"
        :breakpoints="[.9]"
        :initialBreakpoint=".9"
    >
      <ion-card>
        <ion-card-header>
          <ion-card-title>
            <i class="fad fa-bed fa-2x ion-float-right"></i>
          Rest
          </ion-card-title>
        </ion-card-header>
      </ion-card>
    </ion-modal>
    <ion-modal trigger="cook"
        :breakpoints="[.9]"
        :initialBreakpoint=".9"
    >
      <ion-card>
        <ion-card-header>
          <ion-card-title>
            <i class="fad fa-hat-chef fa-2x ion-float-right"></i>
          Cook
          </ion-card-title>
        </ion-card-header>
      </ion-card>
    </ion-modal>
    <ion-modal trigger="craft"
        :breakpoints="[.9]"
        :initialBreakpoint=".9"
    >
      <ion-card>
        <ion-card-header>
          <ion-card-title>
            <i class="fad fa-tools fa-2x ion-float-right"></i>
          Craft
          </ion-card-title>
        </ion-card-header>
      </ion-card>
    </ion-modal>
    <ion-modal trigger="storage"
        :breakpoints="[.9]"
        :initialBreakpoint=".9"
    >
      <ion-card>
        <ion-card-header>
          <ion-card-title>
            <i class="fad fa-treasure-chest fa-2x ion-float-right"></i>
          Storage
          </ion-card-title>
        </ion-card-header>
      </ion-card>
    </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script src="./TheCity.js" />
<style lang="scss" src="./_TheCity.scss" scoped />
