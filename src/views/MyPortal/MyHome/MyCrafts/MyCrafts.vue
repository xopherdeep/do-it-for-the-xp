<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/my-portal/${user.id}/my-home`"></ion-back-button>
          <!-- <ion-icon :icon="calendarOutline" slot="icon-only" /> -->
        </ion-buttons>
        <ion-title>
          <i class="fad fa-tools" />
          My Workbench
        </ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment
          @ionChange="segmentChanged($event)"
          color="primary"
          scrollable
          value="all"
        >
          <ion-segment-button value="all">
            <ion-icon
              :icon="appsOutline"
              color="primary"
            ></ion-icon>
            All
          </ion-segment-button>
          <ion-segment-button value="hp">
            <ion-icon
              :icon="bedOutline"
              color=""
            ></ion-icon>
          </ion-segment-button>
          <ion-segment-button value="mp">
            <ion-icon
              :icon="colorWandOutline"
              color=""
            ></ion-icon>
          </ion-segment-button>
          <ion-segment-button value="misc">
            <ion-icon
              :icon="sparklesOutline"
              color=""
            ></ion-icon>
          </ion-segment-button>
          <ion-segment-button value="key">
            <ion-icon
              :icon="keyOutline"
              color=""
            ></ion-icon>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="my-calendar">
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
                <!-- <ion-card-title v-if="item.title" v-html="item.title.rendered"></ion-card-title> -->
              </ion-card-header>
              <ion-img v-bind="getImgObj(item.featured_media)"></ion-img>

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
          </ion-col>
        </ion-row>
      </ion-grid>
      <!-- fab placed to the bottom and start and on the bottom edge of the content overlapping footer with a list to the right -->
      <ion-fab
        vertical="bottom"
        horizontal="center"
        slot="fixed"
        @click="actionSheetOpen = true"
      >
        <ion-fab-button>
          <i class="fad fa-tools fa-lg" />
        </ion-fab-button>
      </ion-fab>
      <ion-action-sheet
        :is-open="actionSheetOpen"
        :header="'Workbench Options'"
        :buttons="[
          {
            text: 'Materials Inventory',
            icon: cubeOutline,
            handler: handleInventoryClick,
          },
          {
            text: 'Crafting History',
            icon: bookOutline, // You can update this with a more suitable icon
            handler: () => {
              // Navigate to Crafting History or execute related function
              // console.log('Crafting History clicked')
            },
          },
          {
            text: 'Quick Tutorials',
            icon: videocamOutline, // You can update this with a more suitable icon
            handler: () => {
              // Play or Navigate to Quick Tutorials
              // console.log('Quick Tutorials clicked')
            },
          },
          {
            text: 'Cancel',
            icon: close,
            role: 'cancel',
          }
        ]"
        @didDismiss="actionSheetOpen = false"
      />
    </ion-content>
    <ion-footer>
      <ion-toolbar color="secondary">
        <ion-grid>
          <ion-row>
            <ion-col class="ion-no-padding">
              <ion-searchbar
                color="light"
                @ionChange="request.params.page = 1"
                v-model="request.params.search"
              ></ion-searchbar>
            </ion-col>
          </ion-row>
          <ion-row>
            <ion-col>
              <ion-button
                @click="request.params.page--"
                :disabled="request.params.page == 1"
                color="light"
                expand="block"
              >
                <ion-icon
                  :icon="chevronBack"
                  slot="icon-only"
                />
              </ion-button>
            </ion-col>
          <ion-col>
            <ion-button
              @click="request.params.page++"
              :disabled="!hasNextPage"
              color="light"
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

<script src="./MyCrafts" />
<style lang="scss" src="./_MyCrafts.scss" scoped />
