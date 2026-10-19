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
        >
          <template #start>
            <xp-back-button></xp-back-button>
          </template>
        </xp-app-header>
      </ion-toolbar>
    </ion-header>

    <ion-content class="my-crafts__content">
      <!-- Nothing to craft from yet: the game's Coming soon card says so in the workbench's words -->
      <xp-coming-soon-card
        title="On the bench"
        :items="comingSoonItems"
      />

      <!-- The buildings' FAB (as in the Gold Bank): bottom center, above the dock -->
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
      <xp-app-bottom-nav
        :tabs="workbenchTabs"
        v-model="activeTab"
        aria-label="Workbench Navigation"
      />
    </ion-footer>
  </ion-page>
</template>

<script lang="ts" src="./MyCrafts.ts" />
<style lang="scss" src="./_MyCrafts.scss" scoped />
