<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button
            :default-href="`/my-portal/${user.id}/my-home`"
          ></ion-back-button>
          <!-- <ion-icon :icon="storefrontOutline" slot="icon-only" /> -->
          <i class="fad fa-treasure-chest fa-2x"></i>
        </ion-buttons>
        <ion-title> My Storage </ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment @ionChange="segmentChanged($event)" color="danger" scrollable value="all">
          <ion-segment-button value="all">
            <ion-icon :icon="bagOutline" color="primary"></ion-icon>
            All
          </ion-segment-button>
          <ion-segment-button value="hp">
            <ion-icon :icon="fitnessOutline" color="danger"></ion-icon>
            HP 
          </ion-segment-button>
          <ion-segment-button value="mp">
            <ion-icon :icon="colorWandOutline" color="tertiary"></ion-icon>
            MP 
          </ion-segment-button>
          <ion-segment-button value="misc">
            <ion-icon :icon="sparklesOutline" color="success"></ion-icon>
            Misc
          </ion-segment-button>
          <ion-segment-button value="key">
            <ion-icon :icon="keyOutline" color="gold"></ion-icon>
            Key 
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="accessory-shop">
      <xp-loading v-if="isLoading" />
      <ion-grid v-else>
        <ion-row>
          <!-- <ion-col size="12">
            <ion-card>
              <ion-card-title>Categories</ion-card-title>
              <ion-card-content>
                  <ion-select
                    @ionChange="selectShelf"
                    :value="boxes"
                    :interface-options="customAlertOptions"
                    interface="alert"
                    placeholder="..."
                    multiple
                  >
                    <ion-select-option value="hp-items"> HP Items </ion-select-option>
                    <ion-select-option value="mp-items"> MP Items </ion-select-option>
                    <ion-select-option value="misc-items">
                      Misc. Items
                    </ion-select-option>
                    <ion-select-option value="key-items"> Key Items </ion-select-option>
                  </ion-select>
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
        <ion-fab-button color="light">
          <!-- <ion-icon :icon="cartOutline"></ion-icon> -->
          <i class="fad fa-treasure-chest fa-2x"></i>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
    <ion-footer>
      <ion-toolbar >
        <ion-grid>
          <ion-row>
            <ion-col class="ion-no-padding">
              <ion-searchbar
                color="dark"
                @ionChange="request.params.page = 1"
                v-model="request.params.search"
                placeholder="Search Storage..."
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
    </ion-footer>
  </ion-page>
</template>

<script src="./MyStorage" />
<style lang="scss" src="./_MyStorage.scss" scoped />
