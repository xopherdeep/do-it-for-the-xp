<template>
  <ion-page v-if="user">
    <ion-header>
      <ion-toolbar
        color="tertiary"
        v-if="user.stats"
      >
        <ion-buttons slot="start">
          <ion-back-button
            :default-href="`/my-portal/${userId}`"
            :icon="arrowBack"
          ></ion-back-button>
          <!-- <ion-icon :icon="colorWand" size="large" /> -->
          <i class="fad fa-book-spells fa-lg" />
        </ion-buttons>
        <ion-title> My Powers </ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment
          @ionChange="segmentChanged($event)"
          color="tertiary"
          scrollable
          value="all"
        >
          <ion-segment-button value="all">
            <ion-icon :icon="colorWandOutline"></ion-icon>
            All
          </ion-segment-button>
          <ion-segment-button value="">
            <ion-icon :icon="accessibilityOutline"></ion-icon>
            Now
          </ion-segment-button>
          <ion-segment-button value="unlocked">
            <ion-icon :icon="lockOpenOutline"></ion-icon>
            Ready
          </ion-segment-button>
          <ion-segment-button value="locked">
            <ion-icon :icon="lockClosedOutline"></ion-icon>
            Next
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>

      <!-- <ion-progress-bar
        v-if="user.stats"
        color="tertiary"
        :value="user.stats.mp.now / user.stats.mp.max"
      ></ion-progress-bar> -->
    </ion-header>

    <ion-content class="my-abilities">
      <XpLoading v-if="isLoading" />
      <xp-swiper-gallery
        v-else
        :nTotalPages="nTotalPages"
        :nTotal="nTotal"
        :items="items"
        :isFetching="isFetching"
        params
        @next="slideNext"
        @prev="slidePrev"
        @changePage="changePage"
      />
      <!-- <ion-grid v-else >
        <ion-row>
          <ion-col size="6" size-lg="3" v-for="item in items" :key="item.id" class="ion-no-padding">
            <ion-card class="item ion-no-padding" >
              <ion-card-title v-if="item.title" v-html="item.title.rendered"></ion-card-title>
              <ion-img v-bind="getImgObj(item.featured_media)"></ion-img>

              <ion-card-content class="ion-no-margin ion-no-padding">
                <ion-badge color="warning">
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
                </ion-badge>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
      <ion-tabs @ionTabsWillChange="beforeTabChange" @ionTabsDidChange="afterTabChange">
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
      <ion-toolbar color="tertiary">
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
                Viewing: {{ pageNumbers?.min }} - {{ pageNumbers?.max }} of {{ nTotal }}
              </ion-text>
              <ion-text>
                <small>
                  Page: {{ page }} of {{ nTotalPages }}
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
        <!-- <ion-grid >
          <ion-row>
            <ion-col class="ion-no-padding">
              <ion-searchbar color="light" @ionChange="request.params.page = 1" v-model="request.params.search"></ion-searchbar>
            </ion-col>
          </ion-row>
          <ion-row>
            <ion-col>
              <ion-button
                @click="request.params.page--"
                :disabled="request.params.page == 1"
                color="dark"
                expand="block"
              >
                <ion-icon :icon="chevronBack" slot="icon-only" />
              </ion-button>
            </ion-col>
            <ion-col>
              <ion-button
                @click="request.params.page++"
                :disabled="!hasNextPage"
                color="dark"
                expand="block"
              >
                <ion-icon :icon="chevronForward" slot="icon-only" />
              </ion-button>
            </ion-col>
          </ion-row>
        </ion-grid> -->
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script src="./MyAbilities" />
<style lang="scss" src="./_MyAbilities.scss" scoped />
