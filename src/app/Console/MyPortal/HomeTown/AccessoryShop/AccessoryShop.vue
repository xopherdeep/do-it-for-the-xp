<template>
  <ion-page class="accessory-shop">
    <ion-header>
      <ion-toolbar class="shop-header-toolbar">
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/my-portal/${userId}/home-town`" />
        </ion-buttons>

        <ion-title class="shop-title">
          <div class="shop-title-wrap">
            <i :class="shopIconClass" class="shop-title-icon" />
            <span class="shop-title-text">{{ shopName }}</span>
          </div>
        </ion-title>

        <ion-buttons slot="end">
          <button class="header-wallet-btn" @click="openATM" title="Open ATM">
            <i class="fa fa-coins" />
            <span class="wallet-amount"><xp-gp :gp="wallet" /></span>
          </button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="shop-content" :style="dynamicShopBackground">
      <xp-loading v-if="isLoading" />
      <div v-else class="shop-body">
        <!-- Shopkeeper Stage and Speech -->
        <shop-clerk-stage
          :shopkeeper="shopkeeper"
          :shop-greeting="shopGreeting"
          :is-open="isOpen"
          :closed-line="closedLine"
          :charisma-discount="charismaDiscount"
          :background-image="shopBackgroundUrl"
        />

        <!-- Shelves Content Area -->
        <div class="shop-shelves-wrap">
          <!-- Shelf Controls: Filter Chips and Search -->
          <div v-if="isOpen" class="shop-controls-bar">
            <div class="shop-filters-row">
              <button
                class="shop-filter-chip"
                :class="{ 'is-active': shelfFilter === 'all' }"
                @click="setShelfFilter('all')"
              >
                All Items
              </button>
              <button
                class="shop-filter-chip"
                :class="{ 'is-active': shelfFilter === 'affordable' }"
                @click="setShelfFilter('affordable')"
              >
                Can Afford
              </button>
              <button
                class="shop-filter-chip"
                :class="{ 'is-active': shelfFilter === 'out-of-budget' }"
                @click="setShelfFilter('out-of-budget')"
              >
                Can't Afford
              </button>
            </div>

            <div class="shop-search-wrap">
              <i class="fa fa-search search-icon" />
              <input
                type="text"
                v-model="search"
                placeholder="Search shelves..."
                class="shop-search-input"
              />
            </div>
          </div>

          <!-- Featured Wallet Upgrade Ware -->
          <shop-wallet-ware
            v-if="isOpen && walletWare"
            :wallet-ware="walletWare"
            :is-buying="isBuying"
            @buy="buyWallet"
          />

          <!-- Empty Shelf State -->
          <div v-if="isOpen && pagedItems.length === 0" class="shop-empty-shelf">
            <i class="fad fa-box-open empty-icon" />
            <p v-if="shelf.length === 0">
              The shelves are bare right now. Ask the Game Master to stock this shop!
            </p>
            <p v-else>
              Nothing on the shelves matches. Try another search or filter.
            </p>
          </div>

          <!-- Items Grid -->
          <div v-else-if="isOpen" class="shop-items-grid">
            <shop-item-card
              v-for="item in pagedItems"
              :key="`${shopIcon}-${item.id}`"
              :item="item"
              :can-afford="canAfford(item.price)"
              :wallet="wallet"
              @inspect="openInspect"
            />
          </div>

          <!-- Pagination Bar -->
          <div v-if="isOpen && totalPages > 1" class="shop-pagination-bar">
            <button
              class="page-nav-btn"
              :disabled="page === 1"
              @click="prevPage"
            >
              <i class="fa fa-chevron-left" />
            </button>
            <span class="page-indicator">
              Page {{ page }} of {{ totalPages }}
            </span>
            <button
              class="page-nav-btn"
              :disabled="!hasNextPage"
              @click="nextPage"
            >
              <i class="fa fa-chevron-right" />
            </button>
          </div>
        </div>
      </div>

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

      <!-- ATM Modal -->
      <ATMModal
        :is-open="showAtm"
        :user="user"
        @update:isOpen="showAtm = $event"
        @deposit="clickDeposit"
        @withdraw="clickWithdraw"
        @pay-debt="clickPayDebt"
      />
    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./AccessoryShop.ts" />
<style lang="scss" src="./_AccessoryShop.scss" />
