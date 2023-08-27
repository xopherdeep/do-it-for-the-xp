<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/my-portal/${userId}my-home`"></ion-back-button>
          <!-- <ion-icon :icon="fastFoodOutline" slot="icon-only" /> -->
          <i class="fad fa-hat-chef fa-lg" />
        </ion-buttons>
        <ion-title>
          Cook Foods
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="my-calendar">
      <ion-item>
        <ion-label>
          Quests
        </ion-label>
        <ion-select
          @ionChange="selectShelf"
          :value="shelves"
          :interface-options="customAlertOptions"
          interface="alert"
          placeholder="..."
          multiple
        >
          <ion-select-option value="affordable">
            Individual
          </ion-select-option>
          <ion-select-option value="out-of-budget">
            As Needed
          </ion-select-option>
          <ion-select-option value="favorites">
            Rotating
          </ion-select-option>
          <ion-select-option value="wish-list">
            Compete
          </ion-select-option>
          <ion-select-option value="purchased">
            Collaborative
          </ion-select-option>
        </ion-select>
      </ion-item>
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
        @click.stop="presentActionSheet"
      >
        <ion-fab-button>
          <!-- <ion-icon :icon="fastFoodOutline"  /> -->
          <i class="fad fa-hat-chef fa-lg" />
        </ion-fab-button>
      </ion-fab>
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
                <!-- <ion-icon :icon="chevronForward" slot="icon-only" /> -->
                <i class="fad fa-hat-chef fa-lg" />
              </ion-button>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script src="./MyFoods" />
<style lang="scss" src="./_MyFoods.scss" scoped />
