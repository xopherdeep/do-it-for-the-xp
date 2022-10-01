<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="warning">
        <ion-buttons slot="start">
          <ion-back-button
            :default-href="`/my-portal/${user.id}/the-city`"
          ></ion-back-button>
          <!-- <ion-icon :icon="storefrontOutline" slot="icon-only" /> -->
          <i class="fa fa-piggy-bank fa-2x"></i>
        </ion-buttons>
        <ion-title> Gold Bank </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="accessory-shop">
      <xp-loading v-if="isLoading" />
      <ion-grid v-else>
        <ion-row>
          <ion-col size="4">
            <ion-card>
              <ion-title>Shopkeeper</ion-title>
              <ion-card-content>
                Welcome, come in, take a look around!
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
        <ion-fab-button color="warning">
          <i class="fad fa-piggy-bank fa-2x"></i>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script src="./GoldBank" />
<style lang="scss" src="./_GoldBank.scss" scoped />
