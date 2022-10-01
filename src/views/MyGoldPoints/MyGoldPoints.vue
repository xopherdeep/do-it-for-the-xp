<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="warning">
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/my-portal/${user.id}`" ></ion-back-button>
          <!-- <ion-icon :icon="serverOutline" size="large" /> -->
          <i class="fad fa-wallet fa-lg" />
        </ion-buttons>
        <ion-title> 
          My Wallet 
        </ion-title>
      </ion-toolbar>
      <ion-item>
        <ion-label>Date Range</ion-label>
        <ion-select @ionChange="changeDate" :interface-options="customAlertOptions" interface="alert" placeholder="All Time" :v-bind="date">
          <ion-select-option value="All Time">All Time</ion-select-option>
          <ion-select-option value="today">
            Today
          </ion-select-option>
          <ion-select-option value="yesterday">
            Yesterday
          </ion-select-option>
          <ion-select-option value="thisWeek">
            This Week
          </ion-select-option>
          <ion-select-option value="last7days">
            Last 7 Days
          </ion-select-option>
          <ion-select-option value="last14days">
            Last 14 Days
          </ion-select-option>
          <ion-select-option value="olives">
            Last 30 Days
          </ion-select-option>
          <ion-select-option value="olives">
            This Month
          </ion-select-option>
          <ion-select-option value="olives">
            Last Month
          </ion-select-option>
          <ion-select-option value="olives">
            Last 2 Months
          </ion-select-option>
          <ion-select-option value="olives">
            Last 3 Months
          </ion-select-option>
          <ion-select-option value="olives">
            Last 4 Months
          </ion-select-option>
          <ion-select-option value="olives">
            Last 6 Months
          </ion-select-option>
          <ion-select-option value="olives">
            This Year
          </ion-select-option>
        </ion-select>
      </ion-item>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-card color="gold">
    <ion-card-content>
      <ion-chip>
        Earned ¤ 100,000 GP 
      </ion-chip>
      -
      <ion-chip>
        Spent ¤ 70,200 GP
      </ion-chip>
      =
    </ion-card-content>
<ion-card-header>
      <ion-card-subtitle>Total GP - {{date}}</ion-card-subtitle>
      <ion-card-title>
        <strong> ¤ 37,800 GP</strong> 
      </ion-card-title>
    </ion-card-header>
      </ion-card>
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
      <ion-toolbar color="warning">
        <ion-grid>
          <ion-row>
            <ion-col size="6">
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
            <ion-col class="ion-float-right">
              <ion-button disabled="true" color="dark" :router-link="`/my-portal/${userId}`" expand="block">
                <ion-icon :icon="chevronForward" slot="icon-only" />
              </ion-button>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script src="./MyGoldPoints" />
<style lang="scss" src="./_MyGoldPoints.scss" scoped />
