<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="success">
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/my-portal/${userId}`">
          </ion-back-button>
          <i class="fad fa-medal fa-2x"></i>
          <!-- <ion-icon :icon="medalOutline" size="large" /> -->
        </ion-buttons>
        <ion-title> My Quests </ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment
          @ionChange="segmentChanged"
          color="success"
          scrollable
          value="all"
        >
          <ion-segment-button value="all">
            <i class="fal fa-medal fa-2x"></i>
            <!-- <ion-icon :icon="medalOutline"></ion-icon> -->
            All
          </ion-segment-button>
          <ion-segment-button value="morning">
            <i class="fal fa-sun fa-2x"></i>
            <!-- <ion-icon :icon="sunnyOutline"></ion-icon> -->
            Morn
          </ion-segment-button>
          <ion-segment-button value="afternoon">
            <i class="fal fa-cloud-sun fa-2x"></i>
            <!-- <ion-icon :icon="partlySunnyOutline"></ion-icon> -->
            Noon
          </ion-segment-button>
          <ion-segment-button value="evening">
            <i class="fal fa-cloud-moon fa-2x"></i>
            <!-- <ion-icon :icon="cloudyNightOutline"></ion-icon> -->
            Eve
          </ion-segment-button>
          <ion-segment-button value="night">
            <i class="fal fa-moon-stars fa-2x"></i>
            <!-- <ion-icon :icon="moonOutline"></ion-icon> -->
            Night
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
      <!-- <ion-progress-bar color="success" :value="0.5"></ion-progress-bar> -->
    </ion-header>

    <ion-content class="my-tasks">
      <XpLoading v-if="isLoading" />
      <swiper
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
                v-for="item in tasks"
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
                      style="width: 100px;"
                    ></ion-skeleton-text>
                  </ion-card-title>
                  <ion-card-title
                    v-else
                    v-html="item.title.rendered"
                  ></ion-card-title>

                  <ion-thumbnail v-if="isFetching">
                    <ion-skeleton-text
                      :animated="true"
                      style="width: 100%;"
                    ></ion-skeleton-text>
                  </ion-thumbnail>
                  <ion-img
                    v-else-if="item._embedded"
                    v-bind="getFeaturedImg(item._embedded)"
                  />

                  <ion-button
                    v-if="isFetching"
                    expand="block"
                  >
                    <ion-skeleton-text
                      :animated="true"
                      style="width: 100%;"
                    ></ion-skeleton-text>
                  </ion-button>

                  <ion-button
                    v-else
                    color="primary"
                  >
                    View Quest
                  </ion-button>

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

      <!-- <ion-tabs @ionTabsWillChange="beforeTabChange" @ionTabsDidChange="afterTabChange">
        <ion-router-outlet></ion-router-outlet>
        <ion-tab-bar slot="bottom">
          <ion-tab-button tab="my-home" :router-link="`/my-portal/${userId}`">
            <ion-icon :icon="chevronBack"></ion-icon>
          </ion-tab-button>

          <ion-tab-button color="success" tab="speakers" :href="`/my-portal/${userId}/deeds`">
            <ion-icon :icon="medalOutline" color="success"></ion-icon>
            <ion-label>Advents</ion-label>
          </ion-tab-button>

          <ion-tab-button tab="my-party" :href="`/my-portal/${userId}/inventory`">
            <ion-icon :icon="colorWandOutline" color="ternary"></ion-icon>
          </ion-tab-button>

          <ion-tab-button tab="my-party" :href="`/my-portal/${userId}/my-party`">
            <ion-icon :icon="peopleCircle" color="ternary"></ion-icon>
            <ion-label>Party</ion-label>
          </ion-tab-button>

          <ion-tab-button tab="my-home" :href="`/my-portal/${userId}`">
            <ion-icon :icon="chevronForward"></ion-icon>
          </ion-tab-button>

        </ion-tab-bar>
      </ion-tabs> -->
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
          <ion-row>
            <ion-col>
              <ion-button
                id="swiper-back"
                :disabled="page == 1"
                color="dark"
                expand="block"
              >
                <ion-icon
                  :icon="chevronBack"
                  slot="icon-only"
                />
              </ion-button>
            </ion-col>
            <ion-col
              class="total-pages"
              v-if="isLoading"
            >
              <ion-skeleton-text
                :animated="true"
                style="width: 60%;"
              ></ion-skeleton-text>
              <ion-skeleton-text
                :animated="true"
                style="width: 20%"
              ></ion-skeleton-text>
            </ion-col>
            <ion-col
            class="total-pages"
            v-else
          >
            <ion-text class="ion-text-align-center">
              Viewing Quests: {{ pageNumbers.min }} - {{ pageNumbers.max }} of {{ nTotalTasks }}
            </ion-text>
            <ion-text>
              <small>
                Page: {{ page }} of
                {{nTotalPages}}
              </small>
            </ion-text>
          </ion-col>
          <ion-col>
            <ion-button
              id="swiper-forward"
              :disabled="!hasNextPage"
              color="dark"
              expand="block"
            >
              <ion-icon
                :icon="chevronForward"
                slot="icon-only"
              />
            </ion-button>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-toolbar>
  </ion-footer>
</ion-page></template>

<script src="./MyQuests" />
<style lang="scss" src="./_MyQuests.scss" scoped />
