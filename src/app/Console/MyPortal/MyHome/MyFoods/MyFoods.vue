<template>
  <ion-page :class="rootClass" :style="rootStyle">
    <ion-header>
      <ion-toolbar>
        <xp-app-header title="Kitchen" icon="utensils-alt" :meta="foodsMeta">
          <template #start>
            <xp-back-button />
          </template>
        </xp-app-header>
      </ion-toolbar>
    </ion-header>

    <ion-content class="my-foods">
      <!-- The pantry as grouped list rows, one section per kind of food -->
      <xp-app-section v-for="section in foodSections" :key="section.id" :label="section.label">
        <xp-app-row
          v-for="food in section.foods"
          :key="food.id"
          :title="food.name"
          :subtitle="food.description"
          :icon="foodIcon(food)"
          :chevron="false"
        >
          <template #chips>
            <xp-app-chip kind="tag" :value="categoryLabel(food.category)" />
          </template>
          <!-- The hero's favourite food from their profile wears the star -->
          <template #trailing>
            <i v-if="isFavorite(food)" class="fad fa-star food-star" title="Your favorite" />
          </template>
        </xp-app-row>
      </xp-app-section>

      <!-- Message if no foods match filters -->
      <xp-app-empty v-if="!filteredFoods.length" icon="utensils-alt" :text="emptyText" />

      <!-- FAB button (the same one the town's buildings use) to open the kitchen actions -->
      <ion-fab vertical="bottom" horizontal="center" slot="fixed">
        <ion-fab-button color="warning" aria-label="Kitchen actions" @click="presentActionSheet">
          <i class="fad fa-hat-chef fa-2x"></i>
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <ion-footer class="foods-footer">
      <div class="xp-app-bar">
        <label class="xp-app-search">
          <i class="fad fa-search" aria-hidden="true"></i>
          <input
            v-model="searchTerm"
            type="search"
            placeholder="Search Foods..."
            aria-label="Search foods"
            autocomplete="off"
            enterkeyhint="search"
          />
        </label>
      </div>
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
