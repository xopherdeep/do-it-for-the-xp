<template>
  <ion-page
    class="my-storage"
    :class="rootClass"
    :style="rootStyle"
  >
    <ion-header>
      <ion-toolbar>
        <xp-app-header
          title="Storage"
          icon="treasure-chest"
          :meta="metaText"
        >
          <template #start>
            <xp-back-button></xp-back-button>
          </template>
        </xp-app-header>
      </ion-toolbar>
    </ion-header>

    <ion-content class="accessory-shop">
      <xp-app-section
        v-if="!isLocked && listItems.length"
        :label="sectionLabel"
      >
        <xp-app-row
          v-for="entry in listItems"
          :key="entry.id"
          :title="entry.name"
          :subtitle="subtitleOf(entry)"
          :icon="entry.faIcon || 'box'"
          :chevron="false"
        >
          <template #chips>
            <xp-app-chip
              kind="qty"
              :value="entry.qty"
            />
          </template>
          <template
            v-if="entry.kind !== 'key'"
            #trailing
          >
            <button
              type="button"
              class="xp-app-btn"
              @click="take(entry)"
            >
              Take
            </button>
          </template>
        </xp-app-row>
      </xp-app-section>
      <xp-app-empty
        v-else
        :icon="emptyIcon"
        :text="emptyText"
      >
        <button
          v-if="isLocked"
          type="button"
          class="xp-app-btn"
          @click="goToBank"
        >
          Visit the Gold Bank
        </button>
      </xp-app-empty>

      <!-- The buildings' FAB (as in the Gold Bank): bottom center, above the search bar and the dock -->
      <ion-fab
        vertical="bottom"
        horizontal="center"
        slot="fixed"
      >
        <ion-fab-button
          class="storage-fab"
          aria-label="Storage options"
          @click="presentActionSheet"
        >
          <i class="fad fa-treasure-chest fa-2x"></i>
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <ion-footer class="storage-footer">
      <div
        v-if="!isLocked"
        class="xp-app-bar"
      >
        <label class="xp-app-search">
          <i class="fad fa-search"></i>
          <input
            type="search"
            v-model="search"
            placeholder="Search Storage..."
            aria-label="Search Storage"
            autocomplete="off"
          />
        </label>
      </div>

      <xp-app-bottom-nav
        :tabs="storageTabs"
        v-model="activeShelf"
        aria-label="Storage Navigation"
        @change="onShelfChange"
      />
    </ion-footer>

    <xp-inventory-modal
      :is-open="goodsOpen"
      :user-id="heroId"
      @close="goodsOpen = false"
    />
  </ion-page>
</template>

<script lang="ts" src="./MyStorage.ts" />
<style lang="scss" src="./_MyStorage.scss" />
