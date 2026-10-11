<template>
  <ion-page class="accessory-shop">
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/my-portal/${userId}/home-town`"></ion-back-button>
          <i :class="shopIconClass" />
        </ion-buttons>
        <ion-title>
          {{ shopName }}
        </ion-title>
        <ion-buttons slot="end">
          <ion-button @click="openATM" color="rpg">
            <i class="fad fa-hand-holding-usd fa-2x"></i>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :style="dynamicShopBackground" >
      <xp-loading v-if="isLoading" />
      <ion-grid v-else>
        <ion-card>
          <ion-card-title>
            {{ shopkeeper }}
          </ion-card-title>
          <ion-card-content class="rpg-box">
            <!-- Welcome! What shelves can I interest you looking at today? -->
            <template v-if="isOpen">
              {{ shopGreeting }}
            </template>
            <!-- The Game Master's hours say the doors are shut: the clerk says when they open -->
            <template v-else>
              <span class="shop-closed-sign">
                <i class="fad fa-door-closed" />
                Closed
              </span>
              {{ closedLine }}
            </template>
            <p class="shop-wallet">
              <i class="fa fa-coins" />
              Your wallet: <xp-gp :gp="wallet" />
            </p>
            <p v-if="isOpen && charismaDiscount" class="shop-wallet shop-charisma">
              <i class="fad fa-comment-smile" />
              Your charisma gets you {{ charismaDiscount }} everything on the shelf.
            </p>
            <!-- Filters -->
            <ion-item v-if="isOpen">
              <ion-label> Shelves </ion-label>
              <ion-select
                @ionChange="selectShelf"
                :value="shelves"
                :interface-options="customAlertOptions"
                interface="alert"
                placeholder="..."
                multiple
              >
                <ion-select-option
                  value="out-of-budget"
                  checked
                >
                  Can't Afford
                </ion-select-option>
                <ion-select-option value="wish-list">
                  Wish List
                </ion-select-option>
                <ion-select-option
                  value="affordable"
                  selected
                >
                  Can Afford
                </ion-select-option>
                <ion-select-option value="purchased">
                  Purchased
                </ion-select-option>
                <ion-select-option value="favorites">
                  Favorites
                </ion-select-option>
              </ion-select>
            </ion-item>
          </ion-card-content>
        </ion-card>
        <!-- The shop's own ware: the next wallet size, Majora's Mask style. Not on the Game Master's shelf. -->
        <ion-card
          v-if="isOpen && walletWare"
          class="shop-wallet-ware rpg-box"
          :class="`is-${walletWare.status}`"
          button
          :disabled="isBuying"
          @click="buyWallet"
        >
          <ion-card-title>
            <i class="fad fa-wallet" />
            {{ walletWare.name }}
          </ion-card-title>
          <ion-card-content>
            <p class="shop-wallet-ware__blurb">{{ walletWare.blurb }}</p>
            <ion-badge :color="walletWare.status === 'for-sale' ? 'warning' : 'medium'">
              <i class="fa fa-coins" />
              {{ walletWare.price }}
              <strong>GP</strong>
            </ion-badge>
            <p class="shop-wallet-ware__note">
              <i v-if="walletWare.status === 'locked'" class="fa fa-lock" />
              {{ walletWare.note }}
            </p>
          </ion-card-content>
        </ion-card>
        <!-- Nothing to show -->
        <ion-card v-if="isOpen && pagedItems.length === 0" class="shop-empty-shelf">
          <ion-card-content class="rpg-box">
            <template v-if="shelf.length === 0">
              The shelves are bare right now. Ask the Game Master to stock this shop!
            </template>
            <template v-else>
              Nothing on the shelves matches. Try another search or shelf.
            </template>
          </ion-card-content>
        </ion-card>
        <!-- Hero -->
        <ion-row v-if="isOpen">
          <ion-col
            size-md="3"
            size="6"
            v-for="item in pagedItems"
            :key="`${shopIcon}-${item.id}`"
            class="ion-no-padding"
          >
            <ion-modal
              :ref="`modal-${item.id}`"
              :trigger="`${shopIcon}-${item.id}`"
            >
              <ion-card>
                <ion-card-title>{{ item.name }}</ion-card-title>
                <ion-grid>
                  <ion-row>
                    <ion-col size="6">
                      <ion-img
                        v-if="item.photo"
                        :src="item.photo"
                        :alt="item.name"
                        class="featured-media"
                      ></ion-img>
                      <!-- No photo: the item's own duotone icon in its colours, or a gift when it has none -->
                      <span v-else class="icon-colors shop-item-icon" :class="{ 'is-placeholder': !item.icon }">
                        <i :class="[itemIconClass(item.icon), 'fa-5x']" />
                      </span>
                    </ion-col>
                    <ion-col>
                      <ion-card-content>
                        {{ item.description || "A fine find, if you can afford it." }}
                      </ion-card-content>
                    </ion-col>
                  </ion-row>
                  <hr />
                  <ion-row>
                    <ion-col size="12">
                      <ion-card-title>
                        Would you like to buy this?
                        <ion-badge color="warning">
                          <i class="fa fa-coins" />
                          {{ item.price }}
                          <strong>GP</strong>
                        </ion-badge>
                      </ion-card-title>
                      <p v-if="!canAfford(item.price)" class="shop-short-on-gp">
                        Not enough GP! You have {{ wallet }} and need
                        {{ item.price - wallet }} more.
                      </p>
                    </ion-col>
                  </ion-row>
                  <ion-row>
                    <ion-col>
                      <ion-button
                        @click.stop="buyItem(item)"
                        :disabled="isBuying"
                        color="success"
                        expand="block"
                      >
                        Yes
                        <i class="fa fad fa-lg fa-thumbs-up" />
                      </ion-button>
                    </ion-col>
                    <ion-col>
                      <ion-button
                        @click.stop="closeModal(item.id)"
                        color="danger"
                        expand="block"
                      >
                        <i class="fa fad fa-lg fa-thumbs-down" />
                        No
                      </ion-button>
                    </ion-col>
                  </ion-row>
                </ion-grid>
              </ion-card>
            </ion-modal>
            <ion-card
              class="item ion-no-padding"
              :id="`${shopIcon}-${item.id}`"
            >
              <ion-card-title>{{ item.name }}</ion-card-title>
              <ion-card-content class="ion-no-margin ion-no-padding">
                <ion-img
                  v-if="item.photo"
                  :src="item.photo"
                  :alt="item.name"
                  class="featured-media"
                ></ion-img>
                <!-- No photo: the item's own duotone icon in its colours, or a gift when it has none -->
                <span v-else class="icon-colors shop-item-icon" :class="{ 'is-placeholder': !item.icon }">
                  <i :class="[itemIconClass(item.icon), 'fa-5x']" />
                </span>
              </ion-card-content>
              <ion-button
                size="large"
                expand="fill"
              >
                <i class="fa fa-lg fa-eye" />
                &nbsp; Look Closer
              </ion-button>
              <ion-badge :color="canAfford(item.price) ? 'warning' : 'medium'">
                <i class="fa fa-coins" />
                {{ item.price }}
                <strong>GP</strong>
              </ion-badge>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
      
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
    
    <ion-footer v-if="isOpen">
      <ion-toolbar>
        <ion-grid>
          <ion-row>
            <ion-col class="ion-no-padding">
              <ion-searchbar
                color="dark"
                v-model="search"
              ></ion-searchbar>
            </ion-col>
          </ion-row>
          <ion-row>
            <ion-col>
              <ion-button
                @click="prevPage"
                :disabled="page == 1"
                color="dark"
                expand="block"
              >
                <ion-icon
                  :icon="chevronBack"
                  slot="icon-only"
                />
              </ion-button>
            </ion-col>
            <ion-col>
              <ion-button
                @click="nextPage"
                :disabled="!hasNextPage"
                color="dark"
                expand="block"
              >
                <ion-icon
                  :icon="chevronForward"
                  slot="icon-only"
                />
              </ion-button>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script lang="ts" src="./AccessoryShop.ts" />
<style lang="scss" src="./_AccessoryShop.scss" />
