<template>
  <ion-page
    class="my-crafts"
    :class="rootClass"
    :style="rootStyle"
  >
    <ion-header>
      <ion-toolbar>
        <xp-app-header
          title="Workbench"
          icon="tools"
          :meta="metaText"
        >
          <template #start>
            <xp-back-button></xp-back-button>
          </template>
        </xp-app-header>
      </ion-toolbar>
    </ion-header>

    <ion-content class="my-crafts__content">
      <xp-loading v-if="isLoading" />
      <template v-else>
        <xp-app-section
          v-if="listItems.length"
          :label="sectionLabel"
        >
          <xp-app-row
            v-for="item in listItems"
            :key="item.id"
            :title="itemTitle(item)"
            :subtitle="itemSubtitle(item)"
            :image="itemImage(item)"
            icon="tools"
            :chevron="false"
          />
        </xp-app-section>
        <div
          v-if="listItems.length && hasNextPage"
          class="my-crafts__more"
        >
          <button
            type="button"
            class="xp-app-btn xp-app-btn--ghost"
            @click="loadMore"
          >
            More
          </button>
        </div>
        <xp-app-empty
          v-if="!listItems.length"
          icon="tools"
          :text="emptyText"
        />
      </template>

      <!-- The buildings' FAB (as in the Gold Bank): bottom center, above the search bar and the dock -->
      <ion-fab
        vertical="bottom"
        horizontal="center"
        slot="fixed"
      >
        <ion-fab-button
          class="crafts-fab"
          aria-label="Workbench options"
          @click="actionSheetOpen = true"
        >
          <i class="fad fa-tools fa-2x"></i>
        </ion-fab-button>
      </ion-fab>

      <ion-action-sheet
        v-bind="sheetAttrs"
        :is-open="actionSheetOpen"
        :header="'Workbench Options'"
        :buttons="actionSheetButtons"
        @didDismiss="actionSheetOpen = false"
      />
    </ion-content>

    <ion-footer class="crafts-footer">
      <div class="xp-app-bar">
        <label class="xp-app-search">
          <i class="fad fa-search"></i>
          <input
            type="search"
            v-model="request.params.search"
            placeholder="Search Workbench"
            aria-label="Search Workbench"
            autocomplete="off"
            @input="onSearch"
          />
        </label>
      </div>

      <xp-app-bottom-nav
        :tabs="workbenchTabs"
        v-model="activeTab"
        aria-label="Workbench Navigation"
        @change="onTabChange"
      />
    </ion-footer>
  </ion-page>
</template>

<script lang="ts" src="./MyCrafts.ts" />
<style lang="scss" src="./_MyCrafts.scss" scoped />
