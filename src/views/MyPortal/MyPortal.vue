<template>
  <ion-page class="ion-page" :class="$options.name" v-cloak>
    <ion-content class="bg-transparent icon-colors">
      <xp-fab-user-hud :user="user" :isUserFabOn="isUserFabOn" />
      <xp-fab-gold-points :user="user" :isUserFabOn="isUserFabOn" />
      <xp-fab-quick-draw v-if="isUserFabOn" :user="user" :equipment="equipment" @openHud="isRPGBoxOpen = true" />
      <xp-fab-page-menu v-if="isUserFabOn" :user="user" :page-name="compass.name" />
      <xp-fab-page-shortcuts v-if="isUserFabOn" :shortcuts="userActions" />

      <ion-tabs v-if="user.stats">
        <ion-router-outlet ref="outlet" :userId="user.id"></ion-router-outlet>
        <ion-badge class="xp-badge">
          <ion-progress-bar
            color="success"
            v-if="user.stats"
            :value="user.stats.xp.now / user.stats.xp.next_level"
          ></ion-progress-bar>
          <ion-badge>
            <!-- <ion-icon :icon="sparklesOutline" size="small" /> -->
            <p>
              Level {{ user.stats.level }}
            </p>
          </ion-badge>
        </ion-badge>
        <ion-tab-bar
          slot="bottom"
          v-if="user.stats && !battleState('active')"
        >
          <ion-tab-button
            color="success"
            tab="my-profile"
            :href="`/my-portal/${user.id}/my-profile`"
          >
            <ion-icon :icon="personCircle" color="success"></ion-icon>
            <ion-label v-if="user.name">
              {{ user.name.nick }}
            </ion-label>
            <ion-badge color="danger">{{ user.stats.hp.now }} HP</ion-badge>
          </ion-tab-button>
          <ion-tab-button 
            tab="my-home" 
            :href="compass.link"
          >
            <i class="fad fa-2x" :class="`fa-${compass.icon}`"></i>
            <ion-label>
              {{ compass.name }}
            </ion-label>
          </ion-tab-button>
          <ion-tab-button
            tab="my-party"
            :href="`/my-portal/${user.id}/my-party`"
          >
            <i class="fab fa-fort-awesome fa-2x"></i>
            <ion-label>Party</ion-label>
          </ion-tab-button>
          <!-- 
          To favor immersion, we're taking these out
          <ion-tab-button
            tab="home-town"
            :href="`/my-portal/${user.id}/home-town`"
          >
            <i class="fad fa-archway fa-2x"></i>
            <i class="fal fa-city fa-2x"></i>
            <ion-label>Town</ion-label>
          </ion-tab-button> -->
          <!-- <ion-tab-button
            tab="world-map"
            :disabled="false"
            :href="`/my-portal/${user.id}/world-map`"
          >
            <i class="fal fa-globe fa-2x"></i>
            <ion-label>World</ion-label>
          </ion-tab-button> -->
          <!-- <ion-tab-button tab="shop" :href="`/my-portal/${user.id}/shop`">
            <ion-icon :icon="storefrontOutline" color="secondary"></ion-icon>
            <ion-label>Shop</ion-label>
            <ion-badge color="warning"
              >¤{{ user.stats.gp.wallet }} GP</ion-badge
            >
          </ion-tab-button> 
          -->
        </ion-tab-bar>
      </ion-tabs>
    </ion-content>

    <!-- EQUIPMENT MODAL -->
    <xp-equipment-modal 
      :isOpen="isRPGBoxOpen" 
      :equipment="equipment"
      @equip="clickItem"
      @didDimiss="dismissRPGBox" 
      @close="closeModal"
    />

    <ion-modal
      ref="userProfile"
      class="user-profile"
      trigger="user-profile"
      :breakpoints="[1]"
      :initialBreakpoint="1"
    >
      <ion-content>
        <swiper @swiper="onSwiper" >
          <swiper-slide>
            <ion-grid class="ion-no-padding">
              <ion-row>
                <ion-col size="2">
                  <span></span>
                </ion-col>
                <ion-col size="6" class="ion-no-margin">
                  <ion-card>
                    {{ user.name.full }}
                    <ion-button
                      expand="block"
                      color="dark"
                      @click="clickStats"
                      size="4"
                    >
                      <i class="fad fa-2x fa-hand-holding-heart"></i>
                      Status
                    </ion-button>
                  </ion-card>
                </ion-col>
                <ion-col size="4">
                  <ion-card>
                    <ion-card-header>
                      <ion-card-subtitle> Nickname </ion-card-subtitle>
                    </ion-card-header>
                    <ion-card-content>
                      {{ user.name.nick }}
                    </ion-card-content>
                  </ion-card>
                </ion-col>
                <ion-col>
                  <ion-card>
                    <ion-card-header>
                      <ion-card-subtitle> First </ion-card-subtitle>
                    </ion-card-header>
                    <ion-card-content>
                      {{ user.name.first }}
                    </ion-card-content>
                  </ion-card>
                </ion-col>
                <ion-col>
                  <ion-card>
                    <ion-card-header>
                      <ion-card-subtitle> Middle </ion-card-subtitle>
                    </ion-card-header>
                    <ion-card-content>
                      {{ user.name.middle }}
                    </ion-card-content>
                  </ion-card>
                </ion-col>
                <ion-col>
                  <ion-card>
                    <ion-card-header>
                      <ion-card-subtitle> Last </ion-card-subtitle>
                    </ion-card-header>
                    <ion-card-content>
                      {{ user.name.last }}
                    </ion-card-content>
                  </ion-card>
                </ion-col>
                <ion-col size="6">
                  <ion-card>
                    <ion-card-header>
                      <ion-card-subtitle> Favorite Thing </ion-card-subtitle>
                    </ion-card-header>
                    <ion-card-content> Creation </ion-card-content>
                  </ion-card>
                </ion-col>
                <ion-col size="12">
                  <ion-card class="favorite-food">
                    <ion-card-header>
                      <ion-card-subtitle> Favorite Food </ion-card-subtitle>
                    </ion-card-header>
                    <ion-card-content>
                      <i class="fad fa-pizza-slice fa-3x"></i>
                      <i class="fad fa-burger-soda fa-3x"></i>
                      <i class="fad fa-cheeseburger fa-3x"></i>
                      <i class="fad fa-french-fries fa-3x"></i>
                      <i class="fad fa-popcorn fa-3x"></i>
                      <i class="fad fa-burrito fa-3x"></i>
                      <i class="fad fa-apple fa-3x"></i>
                      <i class="fad fa-carrot fa-3x"></i>
                      <i class="fad fa-candy-cane fa-3x"></i>
                      <i class="fad fa-candy-corn fa-3x"></i>
                      <i class="fad fa-cookie fa-3x"></i>
                      <i class="fad fa-corn fa-3x"></i>
                      <i class="fad fa-egg-fried fa-3x"></i>
                      <i class="fad fa-drumstick fa-3x"></i>
                      <i class="fad fa-hotdog fa-3x"></i>
                      <i class="fad fa-pie fa-3x"></i>
                      <i class="fad fa-salad fa-3x"></i>
                    </ion-card-content>
                  </ion-card>
                </ion-col>
              </ion-row>
            </ion-grid>
          </swiper-slide>
          <swiper-slide>
            <ion-grid>
              <ion-row>
                <ion-col
                  size="12"
                  v-for="(area, category) in areas"
                  :key="category"
                >
                  <ion-card>
                    <ion-accordion-group :value="category">
                      <ion-accordion :value="category">
                        <ion-item slot="header">
                          <ion-note slot="start">
                            <ion-icon
                              size="large"
                              :color="area.color"
                              :icon="area.icon"
                            ></ion-icon>
                          </ion-note>
                          <ion-label :color="area.color">
                            <strong>{{ category }}</strong>
                          </ion-label>
                        </ion-item>
                        <ion-list slot="content">
                          <ion-item
                            v-for="(desc, stat) in area.stats"
                            :key="stat"
                          >
                            <ion-label :color="area.color">
                              <strong>
                                {{ stat }}
                              </strong>
                            </ion-label>
                            <ion-note slot="end" :color="area.color">
                              <strong>
                                {{ desc }}
                                --
                                {{ user.stats[stat] }}
                              </strong>
                            </ion-note>
                          </ion-item>
                        </ion-list>
                      </ion-accordion>
                    </ion-accordion-group>
                  </ion-card>
                </ion-col>
              </ion-row>
            </ion-grid>
          </swiper-slide>
        </swiper>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script src="./MyPortal" />
<style lang="scss" src="./_MyPortal.scss" />
