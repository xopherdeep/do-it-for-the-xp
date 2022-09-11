<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="danger">
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/my-portal/${user.id}`">
          </ion-back-button>
          <ion-icon :icon="backpack" size="large" />
        </ion-buttons>
        <ion-title> 
        My Goods
        </ion-title>
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

    <ion-content class="ion-padding">
      <!-- <ion-tabs @ionTabsWillChange="beforeTabChange" @ionTabsDidChange="afterTabChange">
        <ion-router-outlet></ion-router-outlet>
        <ion-tab-bar slot="bottom">
          <ion-tab-button tab="my-home" :router-link="`/my-portal/${user.id}`">
            <ion-icon :icon="chevronBack"></ion-icon>
          </ion-tab-button>

          <ion-tab-button color="success" tab="speakers" :href="`/my-portal/${user.id}/deeds`">
            <ion-icon :icon="medalOutline" color="success"></ion-icon>
            <ion-label>Advents</ion-label>
          </ion-tab-button>

          <ion-tab-button tab="my-party" :href="`/my-portal/${user.id}/inventory`">
            <ion-icon :icon="colorWandOutline" color="ternary"></ion-icon>
          </ion-tab-button>

          <ion-tab-button tab="my-party" :href="`/my-portal/${user.id}/my-party`">
            <ion-icon :icon="peopleCircle" color="ternary"></ion-icon>
            <ion-label>Party</ion-label>
          </ion-tab-button>

          <ion-tab-button tab="my-home" :href="`/my-portal/${user.id}`">
            <ion-icon :icon="chevronForward"></ion-icon>
          </ion-tab-button>

        </ion-tab-bar>
      </ion-tabs> -->
    </ion-content>
    <ion-footer>
      <ion-toolbar color="danger">
        <ion-grid>
          <ion-row>
            <ion-col class="ion-no-padding">
              <ion-searchbar color="light"></ion-searchbar>
            </ion-col>
          </ion-row>
          <ion-row>
            <ion-col>
              <ion-button color="dark" :router-link="`/my-portal/${userId}`" expand="block">
                <ion-icon :icon="chevronBack" slot="icon-only" />
              </ion-button>
            </ion-col>
            <!-- <ion-col>
              <ion-button :router-link="`/my-portal/${userId}`" expand="block">
                <ion-icon :icon="pause" slot="icon-only" />
              </ion-button>
            </ion-col>
            <ion-col>
              <ion-button :router-link="`/my-portal/${userId}`" expand="block">
                <ion-icon :icon="play" slot="icon-only" />
              </ion-button>
            </ion-col>
            <ion-col>
              <ion-button :router-link="`/my-portal/${userId}`" expand="block">
                <ion-icon :icon="stop" slot="icon-only" />
              </ion-button>
            </ion-col> -->
            <ion-col>
              <ion-button color="dark" :router-link="`/my-portal/${userId}`" expand="block">
                <ion-icon :icon="chevronForward" slot="icon-only" />
              </ion-button>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script src="./MyInventory.js" />
<style lang="scss" src="./_MyInventory.scss" scoped />
