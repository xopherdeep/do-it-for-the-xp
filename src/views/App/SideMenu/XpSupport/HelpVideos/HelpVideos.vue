<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button default-href="/support"></ion-back-button>
        </ion-buttons>
        <ion-title>
          Help Videos
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-grid>
        <ion-row>
          <ion-col size="12" size-md="6" v-for="(video, index) in videos" :key="index">
            <ion-card>
              <div class="video-container">
                <img :src="video.thumbnail" :alt="video.title" class="video-thumbnail" />
                <div class="play-button" @click="playVideo(video)">
                  <i class="fad fa-play-circle fa-3x"></i>
                </div>
              </div>
              <ion-card-header>
                <ion-card-title>{{ video.title }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p>{{ video.description }}</p>
                <p class="video-duration"><i class="fad fa-clock"></i> {{ video.duration }}</p>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>

      <ion-modal :is-open="isModalOpen" @didDismiss="closeModal">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ selectedVideo?.title }}</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeModal">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <div class="video-player-container">
            <!-- Placeholder for video player -->
            <div class="video-player">
              <img :src="selectedVideo?.thumbnail" alt="Video" class="full-video-thumbnail" />
              <div class="video-overlay">
                <p>Video player would be implemented here</p>
              </div>
            </div>
          </div>
          <div class="video-info">
            <h2>{{ selectedVideo?.title }}</h2>
            <p>{{ selectedVideo?.description }}</p>
          </div>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script src="./HelpVideos" lang="ts" />
<style lang="scss" src="./_HelpVideos.scss" scoped/>
