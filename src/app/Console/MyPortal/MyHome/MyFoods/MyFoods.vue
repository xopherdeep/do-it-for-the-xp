<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <xp-back-button></xp-back-button>
          <!-- <ion-icon :icon="fastFoodOutline" slot="icon-only" /> -->
          <!-- Using FontAwesome icon -->
          <i class="fad fa-utensils-alt fa-lg" />
        </ion-buttons>
        <ion-title> My Kitchen </ion-title>
      </ion-toolbar>
      <ion-toolbar color="secondary">
        <ion-searchbar
          color="light"
          placeholder="Search Foods..."
          v-model="searchTerm"
          :debounce="300"
        />
      </ion-toolbar>
    </ion-header>

    <ion-content class="my-foods">

      <!-- Display Filtered Foods -->
      <ion-grid>
        <ion-row>
          <!-- Message if no foods match filters -->
           <ion-col size="12" v-if="!filteredFoods.length" class="ion-text-center ion-padding-top">
             <ion-text color="medium">
               <p>No food items found matching your criteria.</p>
               <p v-if="selectedCategory === 'favorites' && !userFavoriteFood">You haven't set a favorite food in your profile!</p>
             </ion-text>
           </ion-col>

          <!-- Food Item Cards -->
          <ion-col
            size="6"
            v-for="food in filteredFoods"
            :key="food.id"
            class="ion-no-padding"
          >
            <ion-card class="item ion-no-padding">
              <ion-card-header class="ion-no-padding ion-padding-horizontal ion-padding-top">
                 <!-- Use food.name directly -->
                <ion-card-subtitle>{{ food.name }}</ion-card-subtitle>
                <!-- Optional: Add title if needed -->
                <!-- <ion-card-title>{{ food.name }}</ion-card-title> -->
              </ion-card-header>
               <!-- Use standard img tag with src -->
              <ion-img :src="getFoodImageUrl(food.imageUrl)" :alt="food.name"></ion-img>

              <ion-card-content class="ion-padding-horizontal ion-padding-bottom">
                 <!-- Display food description or other details -->
                 <p class="ion-text-wrap ion-font-size-small">{{ food.description }}</p>
                 <!-- Example Badges (replace with actual data/logic if needed) -->
                <!-- <ion-badge color="primary" class="ion-margin-end">
                  {{ food.category }}
                </ion-badge> -->
                 <!-- Add other info like cooking time, etc. -->
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
        <ion-fab-button color="primary">
           <!-- Use Ionicons or FontAwesome -->
           <ion-icon :icon="fastFoodOutline" />
           <!-- <i class="fad fa-utensils-alt fa-lg" /> -->
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <ion-footer class="foods-footer">
      <xp-app-bottom-nav
        :tabs="foodTabs"
        v-model="selectedCategory"
        aria-label="Kitchen Navigation"
      />
    </ion-footer>
  </ion-page>
</template>

<script lang="ts" src="./MyFoods.ts" />
<style lang="scss" src="./_MyFoods.scss" scoped />
