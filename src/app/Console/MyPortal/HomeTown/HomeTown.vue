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
        <xp-draggable-spot screen="home-town" spot-id="town-hall" :default-x="20" :default-y="24">
          <xp-building-model building-id="town-hall" label="Town Hall" :size="105" />
        </xp-draggable-spot>

        <xp-draggable-spot screen="home-town" spot-id="world-plains" :default-x="50" :default-y="20">
          <xp-stage-model stage-id="world-plains" label="The Plains" sublabel="Leave town" :size="105" />
        </xp-draggable-spot>

        <xp-draggable-spot screen="home-town" spot-id="bank" :default-x="80" :default-y="24">
          <xp-building-model building-id="bank" label="Gold Bank" :size="105" />
        </xp-draggable-spot>

        <xp-draggable-spot screen="home-town" spot-id="shop" :default-x="22" :default-y="48">
          <xp-building-model building-id="shop" label="Market" :size="115" />
        </xp-draggable-spot>

        <xp-draggable-spot screen="home-town" spot-id="hospital" :default-x="78" :default-y="48">
          <xp-building-model building-id="hospital" label="Hospital" :size="115" />
        </xp-draggable-spot>

        <xp-draggable-spot screen="home-town" spot-id="hero-home" :default-x="24" :default-y="74">
          <xp-building-model building-id="hero-home" label="Hero's Home" :size="115" />
        </xp-draggable-spot>

        <xp-draggable-spot v-if="hasOldHouse" screen="home-town" spot-id="old-house" :default-x="50" :default-y="72">
          <xp-building-model building-id="old-house" label="The Old House" sublabel="Fight the packing" :size="100" @click="enterOldHouse" />
        </xp-draggable-spot>

        <xp-draggable-spot screen="home-town" spot-id="hotel" :default-x="76" :default-y="74">
          <xp-building-model building-id="hotel" label="Hotel" :size="115" />
        </xp-draggable-spot>
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
