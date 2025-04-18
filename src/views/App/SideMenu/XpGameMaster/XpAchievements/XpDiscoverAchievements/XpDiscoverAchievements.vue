<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar color="success">
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/game-master/achievements`" />
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
            <h3 v-html="task.title.rendered" />
            <p v-html="task.content.rendered" />
          </ion-label>
        </ion-item>
      </ion-list>
      <ion-infinite-scroll @ionInfinite="ionInfinite">
        <ion-infinite-scroll-content></ion-infinite-scroll-content>
      </ion-infinite-scroll>
      <swiper
        v-if="false"
        :navigation="swiperNavigation"
        :modules="modules"
        ref="slides"
        @slidePrevTransitionStart="slidePrev"
        @slideNextTransitionStart="slideNext"
        @swiper="setControlledSwiper"
      >
        <swiper-slide
          v-for="page in nTotalPages"
          pager="true"
          :key="page"
          :data-page="page"
        >
          <ion-grid>
            <ion-row>
              <ion-col
                size="6"
                size-md="3"
                v-for="item in pages"
                :key="`${page}-${item.id}`"
                class="ion-no-padding"
              >

                <ion-card
                  @click="clickItem(item)"
                  button
                  class="item ion-no-padding"
                  :id="item.id"
                >
                  <!-- :router-link="`/my-tasks/${userId}/task/${item.id}`" -->
                  <ion-card-title v-if="isFetching">
                    <ion-skeleton-text
                      :animated="true"
                      style="width: 100px"
                    ></ion-skeleton-text>
                  </ion-card-title>
                  <ion-card-title
                    v-else
                    v-html="item.title.rendered"
                  ></ion-card-title>

                  <ion-avatar v-if="isFetching">
                    <ion-skeleton-text
                      :animated="true"
                      style="width: 100%"
                    ></ion-skeleton-text>
                  </ion-avatar>
                  <ion-avatar v-else>
                    <ion-img v-bind="getFeaturedImg(item._embedded)" />
                  </ion-avatar>

                  <ion-button
                    v-if="isFetching"
                    expand="block"
                  >
                    <ion-skeleton-text
                      :animated="true"
                      style="width: 100%"
                    ></ion-skeleton-text>
                  </ion-button>

                  <ion-button
                    v-else
                    color="primary"
                  > View Quest </ion-button>

                  <ion-card-content class="ion-no-margin ion-no-padding">
                    <!-- <ion-badge color="warning">
                      {{item.meta._xp_achievement_gp}}
                      &nbsp;
                      <strong>GP</strong>
                    </ion-badge>
                    <ion-badge color="tertiary">
                      {{item.meta._xp_achievement_ap}}
                      &nbsp;
                      <strong>AP</strong>
                    </ion-badge>
                    <ion-badge color="success">
                      {{item.meta._xp_achievement_xp}}
                      &nbsp;
                      <strong>XP</strong>
                    </ion-badge> -->
                  </ion-card-content>
                </ion-card>
                <MyTask
                  @didDismiss="activeModal = 0"
                  :item="item"
                  :user="user"
                  v-if="activeModal == item.id"
                />
              </ion-col>
            </ion-row>
          </ion-grid>
        </swiper-slide>
      </swiper>
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
<script lang="ts" src="./XpDiscoverAchievements" />
