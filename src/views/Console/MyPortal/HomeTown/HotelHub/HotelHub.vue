<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar color="danger">
        <ion-buttons slot="start">
          <ion-back-button
           :default-href="`/my-portal/${userId}/my-home`"
           />
          <i class="fad fa-2x fa-hotel"
          />
        </ion-buttons>
        <ion-title>
          Hotel
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <xp-loading v-if="isLoading" />
      <ion-grid v-else>
        <ion-row>
          <ion-col
            size="6"
            v-for="item in items"
            :key="item.id"
            class="ion-no-padding"
          >
            <ion-card class="item ion-no-padding">
              <ion-card-header>
                <ion-card-subtitle
                  v-if="item.title"
                  v-html="item.title.rendered"
                />
              </ion-card-header>
              <ion-img v-bind="getImgObj(item.featured_media)"></ion-img>

              <ion-card-content class="ion-no-margin ion-no-padding">
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
      
      <!-- fab button to trigger dialog -->
      <ion-fab
        vertical="bottom"
        horizontal="center"
        slot="fixed"
      >
        <ion-fab-button color="danger" @click="showHotelDialog">
          <i class="fad fa-concierge-bell fa-2x"></i>
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <!-- Custom Concierge Dialog (RPG style) -->
    <div class="concierge-dialog-overlay" v-if="isDialogVisible" @click="advanceDialog">
      <ion-card class="concierge-dialog-box">
        <ion-card-title class="dialog-header">
          <i class="fad fa-concierge-bell fa-lg mr-2"></i>
          <span>Hotel Concierge</span>
        </ion-card-title>
        <div class="dialog-content">
          <xp-typing-text
            ref="conciergeDialogText"
            :text="currentDialogText"
            :speed="30"
            :auto-start="true"
            :sound-theme="$fx.theme.rpg"
            sound-type="text"
            @typing-complete="onTypingComplete"
            class="concierge-text"
            :has-more-text="hasMoreDialog"
          />
        </div>
        <div v-if="hasMoreDialog" class="dialog-indicator">
          <i class="fad fa-chevron-down blink"></i>
        </div>
      </ion-card>
    </div>
  </ion-page>
</template>

<script src="./HotelHub" />
<style lang="scss" src="./_HotelHub.scss" />