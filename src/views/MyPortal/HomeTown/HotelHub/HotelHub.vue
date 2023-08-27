<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar color="danger">
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/my-portal/${userId}/my-home`"></ion-back-button>
          <ion-icon
            :icon="bedOutline"
            slot="icon-only"
          />
        </ion-buttons>
        <ion-title>
          Hotel Hub
        </ion-title>
      </ion-toolbar>
      <!-- <ion-item>
        <ion-label> Shelves </ion-label>
        <ion-select
          @ionChange="selectShelf"
          :value="shelves"
          :interface-options="customAlertOptions"
          interface="alert"
          placeholder="..."
          multiple
        >
          <ion-select-option value="affordable" selected>
            Can Afford
          </ion-select-option>
          <ion-select-option value="out-of-budget" checked>
            Can't Afford
          </ion-select-option>
          <ion-select-option value="favorites"> Favorites </ion-select-option>
          <ion-select-option value="wish-list"> Wish List </ion-select-option>
          <ion-select-option value="purchased"> Purchased </ion-select-option>
        </ion-select>
      </ion-item> -->
    </ion-header>

    <ion-content>
      <xp-loading v-if="isLoading" />
      <ion-grid v-else>
        <ion-row>
          <!-- <ion-col size="4">
            <ion-card>
              <ion-title>Bell Hop</ion-title>
              <ion-card-content>
                Welcome, are you interested in a room?
              </ion-card-content>
            </ion-card>
          </ion-col> -->
        </ion-row>
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
        @click.stop="presentActionSheet"
      >
        <ion-fab-button color="danger">
          <!-- <ion-icon :icon="cartOutline"></ion-icon> -->
          <i class="fad fa-concierge-bell fa-2x"></i>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
    <!-- <ion-footer>
      <ion-toolbar color="danger">
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
                <ion-icon :icon="chevronBack" slot="icon-only" />
              </ion-button>
            </ion-col>
            <ion-col>
              <ion-button
                @click="request.params.page++"
                :disabled="!hasNextPage"
                color="light"
                expand="block"
              >
                <ion-icon :icon="chevronForward" slot="icon-only" />
              </ion-button>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-toolbar>
    </ion-footer> -->
  </ion-page>
</template>

<script src="./HotelHub" />
<style lang="scss" src="./_HotelHub.scss" />