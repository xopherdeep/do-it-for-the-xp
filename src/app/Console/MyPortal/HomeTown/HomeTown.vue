<template>
  <ion-page :class="$options.name">
    <!-- <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button :router-link="`/my-portal/${userId}`" >
            <ion-icon :icon="arrowBack" slot="icon-only"/>
          </ion-button>
        </ion-buttons>
        <ion-title> 
        </ion-title>
      </ion-toolbar>
    </ion-header> -->

    <ion-content :fullscreen="true">
      <div class="hometown-plaza">
        <!-- North: Town Hall and Gold Bank -->
        <div class="plaza-row plaza-top">
          <xp-building-model building-id="town-hall" label="Town Hall" :size="115" />
          <xp-building-model building-id="bank" label="Gold Bank" :size="115" />
        </div>

        <!-- East/West flank: Market, The Plains, and Hospital -->
        <div class="plaza-row plaza-middle">
          <xp-building-model building-id="shop" label="Market" :size="105" />
          <xp-stage-model stage-id="world-plains" label="The Plains" sublabel="Leave town" :size="105" />
          <xp-building-model building-id="hospital" label="Hospital" :size="105" />
        </div>

        <!-- South: Hero's Home and Hotel -->
        <div class="plaza-row plaza-bottom">
          <xp-building-model building-id="hero-home" label="Hero's Home" :size="115" />
          <xp-building-model building-id="hotel" label="Hotel" :size="115" />
        </div>
      </div>

      <ion-modal trigger="adventure-time"
        :breakpoints="[.9]"
        :initialBreakpoint=".9"
    >
      <ion-card>
        <ion-card-header>
          <ion-card-title>
            <i class="fad fa-clock fa-2x ion-float-right"></i>
            Adventure Time
          </ion-card-title>
        </ion-card-header>
      </ion-card>
    </ion-modal>
    <ion-modal trigger="rest"
        :breakpoints="[.9]"
        :initialBreakpoint=".9"
    >
      <ion-card>
        <ion-card-header>
          <ion-card-title>
            <i class="fad fa-bed fa-2x ion-float-right"></i>
          Rest
          </ion-card-title>
        </ion-card-header>
      </ion-card>
    </ion-modal>
    <ion-modal trigger="cook"
        :breakpoints="[.9]"
        :initialBreakpoint=".9"
    >
      <ion-card>
        <ion-card-header>
          <ion-card-title>
            <i class="fad fa-hat-chef fa-2x ion-float-right"></i>
          Cook
          </ion-card-title>
        </ion-card-header>
      </ion-card>
    </ion-modal>
    <ion-modal trigger="craft"
        :breakpoints="[.9]"
        :initialBreakpoint=".9"
    >
      <ion-card>
        <ion-card-header>
          <ion-card-title>
            <i class="fad fa-tools fa-2x ion-float-right"></i>
          Craft
          </ion-card-title>
        </ion-card-header>
      </ion-card>
    </ion-modal>
    <ion-modal trigger="storage"
        :breakpoints="[.9]"
        :initialBreakpoint=".9"
    >
      <ion-card>
        <ion-card-header>
          <ion-card-title>
            <i class="fad fa-treasure-chest fa-2x ion-float-right"></i>
          Storage
          </ion-card-title>
        </ion-card-header>
      </ion-card>
    </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./HomeTown.ts" />
<style lang="scss" src="./_HomeTown.scss" scoped />
