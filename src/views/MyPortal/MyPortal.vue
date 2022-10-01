<template>
  <ion-page class="ion-page" :class="$options.name" v-cloak>
    <ion-content>
      <xp-fab-user-hud :user="user" :isUserFabOn="isUserFabOn" />
      <xp-fab-gold-points :user="user" :isUserFabOn="isUserFabOn" />
      <xp-fab-quick-draw v-if="isUserFabOn" :user="user" :equipment="equipment" @openHud="isRPGBoxOpen = true" />
      <xp-fab-page-menu v-if="isUserFabOn" :user="user" :page-name="compass.name" />
      <xp-fab-page-shortcuts v-if="isUserFabOn" :shortcuts="userActions"/>

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
            tab="the-city"
            :href="`/my-portal/${user.id}/the-city`"
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

    <ion-modal
      trigger="talk-to"
      :breakpoints="[.9]"
      :initialBreakpoint=".9"
      >
      <ion-card>
        <ion-card-title>
          Talk
        </ion-card-title>
        <ion-card-header>
          <ion-card-subtitle>
            What do you want to say?
          </ion-card-subtitle>
          <ion-card-content>

          </ion-card-content>
        </ion-card-header>
      </ion-card>
    </ion-modal>

    <!-- EQUIPMENT MODAL -->
    <ion-modal
      class="rpg-box"
      :is-open="isRPGBoxOpen"
      trigger="toolbox"
      :breakpoints="[1]"
      :initialBreakpoint="1"
      :fullscreen="true"
      @didDismiss="didDismissRPGBox"
    >
      <ion-header>
        <ion-buttons>
          <ion-button class="ion-float-right" size="large" @click="closeModal">
            <i class="fad fa-times fa-2x"></i>
          </ion-button>
        </ion-buttons>
      </ion-header>
      <ion-content>
        <ion-grid>
          <ion-row>
            <ion-col size="7">
              <ion-card class="items">
                <ion-card-title> Equipment </ion-card-title>
                <ion-card-content class="ion-no-padding">
                  <ion-buttons slot="end"> </ion-buttons>
                  <ion-buttons>
                    <ion-button
                      @mouseover="displayInfo(item)"
                      v-for="item in specialItems"
                      :key="item.faIcon"
                      @click="clickItem(item)"
                      size=""
                      expand="block"
                    >
                      <i
                        class="ion-float-left fad fa-2x"
                        :class="`fa-${item.faIcon}`"
                        :style="item.style || {}"
                      ></i>
                    </ion-button>
                  </ion-buttons>
                </ion-card-content>
              </ion-card>
              <ion-card class="status">
                <ion-card-title> Status </ion-card-title>
                <ion-card-content class="content">
                  <i class="fad fa-2x fa-dice-d4"></i>
                  <i class="fad fa-2x fa-dice-d6"></i>
                  <i class="fad fa-2x fa-dice-d8"></i>
                  <i class="fad fa-2x fa-dice-d10"></i>
                  <i class="fad fa-2x fa-dice-d12"></i>
                  <i class="fad fa-2x fa-dice-d20"></i>
                </ion-card-content>
              </ion-card>
            </ion-col>
            <ion-col size="5">
              <ion-card class="todays-achievements">
                <ion-card-title> Achievements </ion-card-title>
                <ion-button @click="changeBG" size="" expand="block">
                  <i class="fad fa-ankh fa-2x"></i>
                </ion-button>
                <i class="fad fa-diamond fa-lg"></i>
                <i class="fad fa-diamond fa-lg"></i>
                <i class="fad fa-diamond fa-lg"></i>
                <i class="fad fa-diamond fa-lg"></i>
                <i class="fad fa-diamond fa-lg"></i>
                <i class="fad fa-diamond fa-lg"></i>
                <i class="fad fa-diamond fa-lg"></i>
                <!-- <i class="fad fa-ankh fa-lg"></i>
                <i class="fad fa-ankh fa-lg"></i>
                <i class="fad fa-ankh fa-lg"></i> -->
              </ion-card>
              <ion-card class="equipment">
                <ion-card-title> Equipped </ion-card-title>
                <i
                  v-for="item in equipment"
                  :key="item.faIcon"
                  :class="`fa-${item.faIcon}`"
                  class="fad fa-2x"
                ></i>
              </ion-card>
              <ion-card class="info">
                <ion-card-title v-if="info"> {{ info.name }} </ion-card-title>
                <i
                  class="fad fa-2x"
                  :class="`fa-${info.faIcon}`"
                  :style="info.style || {}"
                ></i>
                {{ info.desc }}
                <ion-grid>
                  <ion-row>
                    <ion-col size="6">
                      <ion-button
                        expand="block"
                        color="dark"
                      >
                        Use 
                      </ion-button>
                    </ion-col>
                    <ion-col size="6">
                      <ion-button
                        expand="block"
                        color="dark"
                        @click="clickAction(info)"
                      >
                        Equip
                      </ion-button>
                    </ion-col>
                  </ion-row>
                </ion-grid>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-content>
      <ion-toolbar class="rpg-box"> </ion-toolbar>
    </ion-modal>

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
<style lang="scss" src="./_MyPortal.scss" scoped />
