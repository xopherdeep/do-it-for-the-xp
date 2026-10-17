<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar color="success">
        <ion-buttons slot="start">
          <xp-back-button />
          <i class="fad fa-medal fa-2x"></i>
          <!-- <ion-icon :icon="medalOutline" size="large" /> -->
        </ion-buttons>
        <ion-title> Discover Achievements </ion-title>
      </ion-toolbar>
      <!-- <ion-toolbar>
        <ion-segment
          @ionChange="segmentChanged"
          color="success"
          scrollable
          value="all"
        >
          <ion-segment-button value="all">
            <i class="fal fa-medal fa-2x"></i>
            <ion-icon :icon="medalOutline"></ion-icon>
            All
          </ion-segment-button>
          <ion-segment-button value="morning">
            <i class="fal fa-sun fa-2x"></i>
            <ion-icon :icon="sunnyOutline"></ion-icon>
            Morn
          </ion-segment-button>
          <ion-segment-button value="afternoon">
            <i class="fal fa-cloud-sun fa-2x"></i>
            <ion-icon :icon="partlySunnyOutline"></ion-icon>
            Noon
          </ion-segment-button>
          <ion-segment-button value="evening">
            <i class="fal fa-cloud-moon fa-2x"></i>
            <ion-icon :icon="cloudyNightOutline"></ion-icon>
            Eve
          </ion-segment-button>
          <ion-segment-button value="night">
            <i class="fal fa-moon-stars fa-2x"></i>
            <ion-icon :icon="moonOutline"></ion-icon>
            Night
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar> -->
      <!-- <ion-progress-bar color="success" :value="0.5"></ion-progress-bar> -->
    </ion-header>

    <ion-content class="my-tasks">
      <XpLoading v-if="isLoading" />
      <ion-list
        v-else
        v-for="(page, pageNum) in pages"
        :key="pageNum"
      >
        <ion-item
          v-for="(task, index) in page"
          :key="index"
          button
          detail
          @click="selectTask(task)"
        >
          <ion-avatar
            v-if="isLoading"
            slot="start"
          >
            <ion-skeleton-text
              :animated="true"
              style="width: 100%"
            ></ion-skeleton-text>
          </ion-avatar>
          <ion-avatar
            v-else
            slot="start"
          >
            <ion-img v-bind="getFeaturedImg(task?._embedded)" />
          </ion-avatar>
          <ion-label>
            <h3 v-html="sanitizeHtml(task.title.rendered)" />
            <p v-html="sanitizeHtml(task.content.rendered)" />
          </ion-label>
        </ion-item>
      </ion-list>
      <ion-infinite-scroll @ionInfinite="ionInfinite">
        <ion-infinite-scroll-content></ion-infinite-scroll-content>
      </ion-infinite-scroll>
    </ion-content>
    <ion-footer>
      <ion-toolbar color="success">
        <ion-grid>
          <ion-row>
            <ion-col class="ion-no-padding">
              <ion-searchbar
                color="light"
                @keypress="playTextSound"
                @keyUp="resetTextSound"
                @ionChange="searchChanged"
                v-model="searchText"
              ></ion-searchbar>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>
<script lang="ts" src="./XpDiscoverAchievements.ts" />
