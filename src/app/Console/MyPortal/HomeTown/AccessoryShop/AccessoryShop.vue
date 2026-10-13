<template>
  <ion-page class="accessory-shop">
    <ion-header>
      <ion-toolbar :color="shopColor">
        <ion-buttons slot="start">
          <xp-back-button :default-href="backHref" />
          <i :class="shopIconClass" class="shop-title-icon" />
        </ion-buttons>
        <ion-title class="shop-title">{{ shopName }}</ion-title>
        <ion-buttons slot="end">
          <button class="header-wallet-btn" title="Open ATM" @click="openATM">
            <i class="fad fa-coins" />
            <span class="wallet-amount"><xp-gp :gp="wallet" /></span>
          </button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="shop-content" :scroll-y="false" :style="dynamicShopBackground">
      <xp-loading v-if="isLoading" />
      <div v-else class="shop-floor">
        <div v-if="!isOpen" class="shop-sign rpg-box">
          <i class="fad fa-door-closed" />
          Closed. {{ opensAt }}.
        </div>
        <div v-else-if="!visibleItems.length && !walletWare" class="shop-sign rpg-box">
          <i class="fad fa-box-open" />
          <template v-if="shelf.length === 0">The shelves are bare. Ask the Game Master to stock this shop!</template>
          <template v-else>Nothing on the shelves matches. Try another search or filter.</template>
        </div>
        <shop-shelf-slider
          v-else
          ref="shelfRef"
          :items="visibleItems"
          :wallet="wallet"
          :wallet-ware="walletWare"
          @inspect="openInspect"
          @buy-wallet="buyWallet"
          @position="shelfPosition = $event"
        />
      </div>

      <!-- Talk to the clerk, like the bank manager, the nurse and the concierge -->
      <ion-fab slot="fixed" vertical="bottom" horizontal="center">
        <ion-fab-button :color="shopColor" class="clerk-fab" :aria-label="`Talk to ${shopkeeper}`" @click="talkToClerk">
          <i class="fad fa-comment-dots fa-2x" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <!-- Like the Calendar: search on top, then < the shelf filter > -->
    <ion-footer>
      <ion-toolbar :color="shopColor">
        <ion-grid>
          <ion-row>
            <ion-col class="ion-no-padding">
              <ion-searchbar v-model="search" color="light" placeholder="Search the shelves" :disabled="!isOpen" />
            </ion-col>
          </ion-row>
          <ion-row class="ion-align-items-center">
            <ion-col size="3">
              <ion-button color="light" expand="block" :disabled="!canGoBack" aria-label="Previous item" @click="shelfRef?.prev()">
                <ion-icon :icon="chevronBack" slot="icon-only" />
              </ion-button>
            </ion-col>
            <ion-col size="6">
              <!-- The picked shelves on a button; the choices rise as the game's sheet, in thumb reach -->
              <button
                type="button"
                class="shelf-filter"
                data-test="shelf-filter"
                aria-label="Which shelves"
                :disabled="!isOpen"
                @click="openShelfFilter"
              >
                <span>{{ shelfFilterLabel }}</span>
                <i class="fad fa-chevron-up" aria-hidden="true" />
              </button>
            </ion-col>
            <ion-col size="3">
              <ion-button color="light" expand="block" :disabled="!canGoForward" aria-label="Next item" @click="shelfRef?.next()">
                <ion-icon :icon="chevronForward" slot="icon-only" />
              </ion-button>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-toolbar>
    </ion-footer>

    <!-- The clerk, the wallet and the receipts speak in the game's own dialog, in the shop's colours -->
    <xp-reveal-prompt :prompt="prompt" @respond="reveal.respond" />

    <!-- Item Inspection and Purchase Modal -->
    <shop-item-modal
      :is-open="!!inspectedItem"
      :item="inspectedItem"
      :can-afford="inspectedItem ? canAfford(inspectedItem.price) : false"
      :wallet="wallet"
      :is-buying="isBuying"
      @close="closeInspect"
      @buy="buyItem"
    />

    <ATMModal
      :is-open="showAtm"
      :user="user"
      @update:isOpen="showAtm = $event"
      @deposit="clickDeposit"
      @withdraw="clickWithdraw"
      @pay-debt="clickPayDebt"
    />
  </ion-page>
</template>

<script lang="ts" src="./AccessoryShop.ts" />
<style lang="scss" src="./_AccessoryShop.scss" />
