<template>
  <ion-page class="accessory-shop">
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button
            :default-href="`/my-portal/${user.id}/the-city`"
          ></ion-back-button>
          <i class="fa fa-2x" :class="`fa-${shopIcon}`" />
        </ion-buttons>
        <ion-title>
          {{ shopName }}
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <xp-loading v-if="isLoading" />
      <ion-grid v-else>
        <ion-card>
          <ion-card-title>
            {{ shopkeeper }}
          </ion-card-title>
          <ion-toast
            :is-open="isThankYouOpenRef"
            @didDismiss="setThankYouOpen(false)"
            message="Thank you for your purchase!"
            :duration="1500"
          ></ion-toast>
          <ion-card-content>
            <!-- Welcome! What shelves can I interest you looking at today? -->
            {{ shopGreeting }}
            <!-- Filters -->
            <ion-item>
              <ion-label> Shelves </ion-label>
              <ion-select
                @ionChange="selectShelf"
                :value="shelves"
                :interface-options="customAlertOptions"
                interface="alert"
                placeholder="..."
                multiple
              >
                <ion-select-option value="out-of-budget" checked>
                  Can't Afford
                </ion-select-option>
                <ion-select-option value="wish-list">
                  Wish List
                </ion-select-option>
                <ion-select-option value="affordable" selected>
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
        <!-- Hero -->
        <ion-row>
          <ion-col
            size-md="3"
            size="6"
            v-for="item in items"
            :key="`${shopIcon}-${item.id}`"
            class="ion-no-padding"
          >
            <ion-modal :ref="`modal-${item.id}`" :trigger="`${shopIcon}-${item.id}`">
              <ion-card>
                <ion-card-title
                  v-if="item.title"
                  v-html="item.title.rendered"
                ></ion-card-title>
                <ion-grid>
                  <ion-row>
                    <ion-col size="6">
                      <ion-img
                        v-bind="getImgObj(item.featured_media)"
                        class="featured-media"
                      ></ion-img>
                    </ion-col>
                    <ion-col>
                      <ion-card-content>
                        {{item.content.rendered}}
                        Lorem ipsum dolor sit amet, persequeris mediocritatem vel ut. Qui et officiis salutandi sadipscing. At placerat invidunt duo, vis quem sale adipisci an, impetus electram incorrupte vix ne. Ad ipsum inani accommodare cum, adhuc timeam et cum. Consequat intellegebat ius ea. In eam utamur malorum maluisset.
                      </ion-card-content>
                    </ion-col>
                  </ion-row>
                  <hr/>
                  <ion-row>
                    <ion-col size="12">
                      <ion-card-title>
                        Would you like to buy this?
                      <ion-badge color="warning">
                        <i class="fa fa-coins" />
                        {{ item.meta._xp_achievement_gp }}
                        100
                        <strong>GP</strong>
                      </ion-badge>
                      </ion-card-title>
                    </ion-col>
                  </ion-row>
                  <ion-row>
                    <ion-col>
                      <ion-button
                        @click="buyItem(item.id)"
                        color="success"
                        expand="block"
                      >
                        Yes 
                        <i class="fa fad fa-lg fa-thumbs-up" />
                      </ion-button>
                    </ion-col>
                    <ion-col>
                      <ion-button
                        @click="closeModal(item.id)"
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
              <ion-card-title
                v-if="item.title"
                v-html="item.title.rendered"
              ></ion-card-title>
              <ion-card-content class="ion-no-margin ion-no-padding">
                <ion-img
                  v-bind="getImgObj(item.featured_media)"
                  class="featured-media"
                ></ion-img>
              </ion-card-content>
              <ion-button size="large" expand="fill">
                <i class="fa fa-lg fa-eye" />
                &nbsp; Look Closer
              </ion-button>
              <ion-badge color="warning">
                <i class="fa fa-coins" />
                {{ item.meta._xp_achievement_gp }}
                100
                <strong>GP</strong>
              </ion-badge>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
      <!-- fab placed to the bottom and start and on the bottom edge of the content overlapping footer with a list to the right -->
      <!-- <ion-fab vertical="bottom" horizontal="center" slot="fixed">
        <ion-fab-button color="secondary">
          <ion-icon :icon="cartOutline"></ion-icon>
        </ion-fab-button>
        <ion-fab-list side="start">
          <ion-fab-button>
            <ion-icon :icon="banOutline"></ion-icon>
          </ion-fab-button>
          Empty
        </ion-fab-list>
      </ion-fab> -->
    </ion-content>
    <ion-footer>
      <ion-toolbar>
        <ion-grid>
          <ion-row>
            <ion-col class="ion-no-padding">
              <ion-searchbar
                color="dark"
                @ionChange="request.params.page = 1"
                v-model="request.params.search"
              ></ion-searchbar>
            </ion-col>
          </ion-row>
          <ion-row>
            <ion-col>
              <ion-button
                @click="request.params.page--"
                :disabled="request.params.page == 1"
                color="dark"
                expand="block"
              >
                <ion-icon :icon="chevronBack" slot="icon-only" />
              </ion-button>
            </ion-col>
            <ion-col>
              <ion-button
                @click="request.params.page++"
                :disabled="!hasNextPage"
                color="dark"
                expand="block"
              >
                <ion-icon :icon="chevronForward" slot="icon-only" />
              </ion-button>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script src="./AccessoryShop.js" />
<style lang="scss" src="./_AccessoryShop.scss" />
