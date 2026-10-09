<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="success">
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/my-portal/${userId}`">
          </ion-back-button>
          <i class="fad fa-book-dead fa-2x"></i>
          <!-- <ion-icon :icon="medalOutline" size="large" /> -->
        </ion-buttons>
        <ion-title> Quest Log </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="my-tasks">
      <XpLoading v-if="isLoading" />
      <swiper :navigation="swiperNavigation" :modules="modules" ref="slides" @slidePrevTransitionStart="slidePrev"
        @slideNextTransitionStart="slideNext" @swiper="setControlledSwiper">
        <swiper-slide v-for="page in nTotalPages" pager="true" :key="page" :data-page="page">
          <ion-grid>
            <ion-row>
              <ion-col size="6" size-md="3" v-for="{ quest: item, status, pending } in getTasksForPage(page)"
                :key="`${page}-${item.id}`" class="ion-no-padding">
                <ion-card @click="clickItem(item)" button class="item ion-no-padding"
                  :class="{ 'is-tamed': status === 'done' && !pending, 'is-pending': status === 'done' && pending }"
                  :id="item.id">
                  <!-- :router-link="`/my-tasks/${userId}/task/${item.id}`" -->
                  <!-- A used-up quest whose claim still waits for the Game Master is Pending, not Tamed -->
                  <div v-if="status === 'done' && pending" class="pending-ribbon">
                    <ion-icon :icon="hourglassOutline" /> Pending
                  </div>
                  <div v-else-if="status === 'done'" class="tamed-ribbon">
                    <ion-icon :icon="checkmarkDone" /> Tamed
                  </div>
                  <ion-card-title v-if="isLoading">
                    <ion-skeleton-text :animated="true" style="width: 100px;"></ion-skeleton-text>
                  </ion-card-title>
                  <ion-card-title v-else
                    v-html="formatQuestName(item.achievementName || item.title?.rendered || 'Untitled Quest')"></ion-card-title>

                  <ion-thumbnail v-if="isLoading">
                    <ion-skeleton-text :animated="true" style="width: 100%;"></ion-skeleton-text>
                  </ion-thumbnail>
                  <ion-img v-else-if="item.localImage || item.imageUrl" v-bind="getFeaturedImg(item)" />

                  <ion-button v-if="isLoading" expand="block">
                    <ion-skeleton-text :animated="true" style="width: 100%;"></ion-skeleton-text>
                  </ion-button>

                  <ion-button v-else-if="status === 'done' && pending" color="warning">Pending</ion-button>
                  <ion-button v-else :color="status === 'done' ? 'medium' : 'primary'">
                    {{ status === 'done' ? 'Tamed' : 'View Quest' }}
                  </ion-button>

                  <ion-card-content class="quest-rewards ion-no-margin ion-no-padding">
                    <ion-badge v-if="item.xp" color="success">
                      {{ item.xp }}
                      &nbsp;
                      <strong>XP</strong>
                    </ion-badge>
                    <ion-badge v-if="item.gp" color="warning">
                      {{ item.gp }}
                      &nbsp;
                      <strong>GP</strong>
                    </ion-badge>
                    <ion-badge v-if="item.ap" color="tertiary">
                      {{ item.ap }}
                      &nbsp;
                      <strong>AP</strong>
                    </ion-badge>
                  </ion-card-content>
                </ion-card>
                <MyTask @didDismiss="onTaskDismissed" :item="item" :boardStatus="status" :pending="pending"
                  :userId="userId" v-if="activeModal == item.id" />
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
              <ion-searchbar color="light" @keypress="playTextSound" @keyUp="resetTextSound" @ionChange="searchChanged"
                v-model="searchText"></ion-searchbar>
            </ion-col>
          </ion-row>
          <ion-row>
            <ion-col>
              <ion-button id="swiper-back" :disabled="page == 1" color="dark" expand="block">
                <ion-icon :icon="chevronBack" slot="icon-only" />
              </ion-button>
            </ion-col>
            <ion-col class="total-pages" v-if="isLoading">
              <ion-skeleton-text :animated="true" style="width: 60%;"></ion-skeleton-text>
              <ion-skeleton-text :animated="true" style="width: 20%"></ion-skeleton-text>
            </ion-col>
            <ion-col class="total-pages" v-else>
              <ion-text class="ion-text-align-center">
                Viewing Quests: {{ pageNumbers.min }} - {{ pageNumbers.max }} of {{ nTotalTasks }}
              </ion-text>
              <ion-text>
                <small>
                  Page: {{ page }} of
                  {{ nTotalPages }}
                </small>
              </ion-text>
            </ion-col>
            <ion-col>
              <ion-button id="swiper-forward" :disabled="!hasNextPage" color="dark" expand="block">
                <ion-icon :icon="chevronForward" slot="icon-only" />
              </ion-button>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-toolbar>
    </ion-footer>
  </ion-page></template>

<script lang="ts" src="./MyQuests.ts" />
<style lang="scss" src="./_MyQuests.scss" scoped />
