<template>
  <ion-modal ref="modal" :is-open="true" :class="$options.name" :backdropDismiss="false" @willPresent="willPresent"
    @willDismiss="willDismiss" @didPresent="didPresent" @didDismiss="$emit('didDismiss')">
    <transition name="fade">
      <ion-header v-if="debug">
        <ion-toolbar>
          <ion-segment color="success" @ionChange="segmentChanged" :value="segment">
            <ion-segment-button value="0" color="danger">
              <ion-label v-if="item.title">
                <i class="fad fa-medal fa-3x"></i>
              </ion-label>
            </ion-segment-button>
            <ion-segment-button value="1" color="success">
              <ion-label>
                <i class="fad fa-shield-check fa-3x"></i>
                <!-- XP -->
              </ion-label>
            </ion-segment-button>
            <ion-segment-button value="2" color="warning">
              <ion-label>
                <i class="fad fa-hand-holding-box fa-3x"></i>
              </ion-label>
            </ion-segment-button>
          </ion-segment>
        </ion-toolbar>
      </ion-header>
    </transition>

    <swiper v-if="user" @slideChange="slideChanged" ref="slides" class="swiper-no-swiping" :modules="modules"
      @swiper="setControlledSwiper">
      <swiper-slide class="task">
        <ion-card color="success">
          <ion-card-title v-if="item"
            v-html="sanitizeHtml(formatQuestName(item.achievementName || item.title?.rendered || 'Untitled Quest'))"></ion-card-title>
          <ion-grid>
            <ion-row>
              <ion-col>
                <ion-chip v-if="rewards.ap" color="tertiary" class="ion-float-right ion-no-margin">
                  <ion-text class="ion-float-right">
                    <strong>
                      +{{ rewards.ap }} AP
                      <i class="fad fa-hand-holding-medical fa-lg" />
                    </strong>
                  </ion-text>
                </ion-chip>
              </ion-col>
            </ion-row>
            <ion-row>
              <ion-col size="5" v-if="questImage">
                <ion-img v-bind="questImage"></ion-img>
              </ion-col>
              <ion-col :size="questImage ? 7 : 12">
                <ion-card-content>
                  <vue3-flip-countdown v-if="deadline" :deadline="deadline" labelColor="#e7e6b3" mainColor="#e7e6b3"
                    :showDays="false" />
                  <p v-if="isPending">
                    <i class="fad fa-hourglass-half" /> Your claim is waiting for the Game Master. The rewards arrive once it is approved.
                  </p>
                  <p v-else-if="item?.requiresApproval">
                    <i class="fad fa-user-shield" /> The Game Master approves this one before you get your rewards.
                  </p>
                </ion-card-content>
              </ion-col>
            </ion-row>
            <ion-row v-if="dueLabel">
              <ion-col>
                <ion-card-subtitle> Due @ {{ dueLabel }} </ion-card-subtitle>
              </ion-col>
            </ion-row>
            <ion-row class="week" v-if="weekDays.length">
              <ion-col v-for="(day, index) in weekDays" :key="index">
                <ion-chip color="light" :class="{ off: !day.active }"> {{ day.letter }} </ion-chip>
              </ion-col>
            </ion-row>
          </ion-grid>
          <ion-toolbar class="points ion-no-margin ion-no-padding">
            <ion-grid class="ion-no-padding">
              <ion-row>
                <ion-col>
                  <ion-chip v-if="rewards.xp" color="success">
                    <ion-text>
                      <strong>
                        +{{ rewards.xp }} XP
                        <i class="fad fa-hand-holding-seedling fa-lg" />
                      </strong>
                    </ion-text>
                  </ion-chip>
                  <ion-chip v-if="rewards.gp" color="warning">
                    <ion-text class="ion-float-right">
                      <strong>
                        +{{ rewards.gp }} GP
                        <i class="fad fa-hand-holding-usd fa-lg" />
                      </strong>
                    </ion-text>
                  </ion-chip>
                </ion-col>
                <ion-col v-if="difficultyLabel" size="auto">
                  <ion-chip color="danger" class="ion-float-right">
                    <ion-text>
                      <strong>
                        <i class="fad fa-dice-d8 fa-lg" />
                        {{ difficultyLabel }}
                      </strong>
                    </ion-text>
                  </ion-chip>
                </ion-col>
              </ion-row>
            </ion-grid>
          </ion-toolbar>
        </ion-card>

        <ion-fab :activated="userMenuActive" vertical="bottom" horizontal="center" slot="fixed" @click="focusUserMenu">
          <ion-fab-button color="light">
            <ion-img class="ion-no-padding" :src="$getUserAvatar(user)"></ion-img>
          </ion-fab-button>
          <ion-fab-list side="top"> </ion-fab-list>
          <ion-fab-list side="bottom"> </ion-fab-list>
          <ion-fab-list side="start">
            <ion-button color="tertiary" @click="clickMagic" size-md="">
              <i class="fad fa-hand-holding-magic fa-lg" />
              Magic
            </ion-button>
            <ion-button :color="isPending ? 'warning' : 'success'" size="" :disabled="!canClaim" @click="clickClaim">
              <i :class="primaryIcon" />
              {{ primaryLabel }}
            </ion-button>
          </ion-fab-list>
          <ion-fab-list side="end">
            <ion-button color="danger" size="" @click="clickInventory">
              <i class="fad fa-hand-holding-box fa-lg" />
              Goods
            </ion-button>
            <ion-button color="dark" size="" @click="clickRun">
              Run
              <i class="fad fa-portal-enter fa-lg" />
            </ion-button>
          </ion-fab-list>
        </ion-fab>
      </swiper-slide>
      <swiper-slide class="complete">
        <ion-grid>
          <ion-row class="points">
            <ion-col v-if="awaitingApproval" size="12">
              <ion-card color="warning" class="claim-pending">
                <ion-card-header>
                  <ion-card-title>
                    <i class="fad fa-2x fa-hourglass-half ion-float-right"></i>
                    Waiting for the Game Master
                  </ion-card-title>
                  <ion-card-subtitle>Your claim has been sent for approval</ion-card-subtitle>
                </ion-card-header>
                <ion-card-content>
                  You will receive +{{ rewards.xp }} XP, +{{ rewards.gp }} GP and +{{ rewards.ap }} AP once it is approved.
                </ion-card-content>
              </ion-card>
            </ion-col>
            <ion-col v-if="!awaitingApproval" size="12" size-sm="6">
              <ion-card color="primary">
                <ion-card-header>
                  <ion-card-title color="success">
                    <i class="fad fa-2x fa-hand-holding-medical ion-float-right"></i>
                    Ability Points
                  </ion-card-title>
                </ion-card-header>
                <ion-chip color="light">
                  <i class="fad fa-angle-up fa-2x"></i>
                  <h4>
                    <vue3-autocounter ref="countAPGained" :startAmount="0" :endAmount="rewards.ap" :duration="4" suffix="AP"
                      separator="," :autoinit="false" />
                  </h4>
                </ion-chip>
              </ion-card>
            </ion-col>
            <ion-col v-if="!awaitingApproval">
              <ion-card color="success">
                <ion-card-header>
                  <ion-card-title color="primary">
                    <i class="fad fa-2x fa-hand-holding-seedling ion-float-right"></i>
                    Experience Points
                  </ion-card-title>
                </ion-card-header>
                <ion-chip color="light">
                  <i class="fad fa-2x fa-angle-double-up"></i>
                  &nbsp;
                  <h4 class="ion-float-right">
                    <vue3-autocounter ref="countXPGained" :startAmount="0" :endAmount="rewards.xp" :duration="3.9" suffix="XP"
                      separator="," :autoinit="false" @finished="finishedCounting" />
                  </h4>
                </ion-chip>
              </ion-card>
            </ion-col>
            <ion-col size="12">
              <CardUserStats ref="userCard" :hideMenu="true" :id="user.id" />
            </ion-col>
          </ion-row>
          <!-- <ion-row>
            <ion-col>
              <ion-button color="warning" @click="clickLoot">20
                <i class="fad fa-treasure-chest fa-2x"></i>
                &nbsp; Check Loot
              </ion-button>
            </ion-col>
          </ion-row> -->
        </ion-grid>
        <ion-fab v-if="awaitingApproval" vertical="bottom" horizontal="center" slot="fixed">
          <ion-fab-button color="light" @click.stop="closeModal">
            <i class="fad fa-times fa-4x"></i>
          </ion-fab-button>
        </ion-fab>
        <ion-fab v-else class="click-loot" vertical="bottom" horizontal="center" slot="fixed" @click="clickLoot">
          <ion-fab-button color="light">
            <i class="fad fa-treasure-chest fa-4x"></i>
          </ion-fab-button>
        </ion-fab>
      </swiper-slide>
      <swiper-slide class="loot">
        <ion-grid>
          <ion-row>
            <ion-col size="12" class="ion-no-padding">
              <ion-card color="gold">
                <ion-card-header>
                  <ion-card-title color="gold">
                    <i class="fad fa-2x fa-hand-holding-usd ion-float-right"></i>
                    Gold Points
                  </ion-card-title>
                </ion-card-header>
                <ion-chip color="gold" class="gp-gained">
                  <i class="fad fa-angle-double-up fa-2x"></i>
                  &nbsp;
                  <h4 class="ion-float-right">
                    <i class="fad fa-coin"></i>
                    <!-- <animated-number
                                :number="temp.gp.gained"
                              /> -->
                    &nbsp;
                    <vue3-autocounter ref="countGPGained" :startAmount="0" :endAmount="rewards.gp" :duration="3.9" suffix="GP"
                      separator="," :autoinit="false" />
                  </h4>
                </ion-chip>
                <ion-chip color="gold">
                  <ion-progress-bar color="gold" :value="gpBar"></ion-progress-bar>
                  <ion-label class="ion-float-right">
                    <br />
                    <i class="fa fa-equals"></i>
                    &nbsp;
                    <i class="fad fa-coins"></i>
                    &nbsp;
                    <strong>
                      <vue3-autocounter ref="countWallet" :startAmount="walletBefore"
                        :endAmount="user.stats.gp.wallet" :duration="3.9" prefix="¤" suffix="GP" separator=","
                        :autoinit="false" />
                    </strong>
                    /
                    <i class="fad fa-wallet"></i>
                    <strong> ¤{{ user.stats.gp.limit }}GP </strong>
                  </ion-label>
                </ion-chip>
              </ion-card>
            </ion-col>
            <ion-col size="12" class="ion-no-padding">
              <ion-card color="danger">
                <ion-card-header>
                  <ion-card-title color="danger">
                    <i class="fad fa-2x fa-treasure-chest ion-float-right"></i>
                    Loot
                  </ion-card-title>
                  <ion-card-subtitle color="danger">
                    Move desired items to your Inventory
                  </ion-card-subtitle>
                </ion-card-header>
                <ion-card-content color="warning">
                  <ion-grid class="ion-no-margin items-dropped">
                    <ion-row>
                      <ion-col size="6">
                        <ion-list>
                          <ion-item-sliding v-for="item in itemsDropped" :key="item.id">
                            <ion-item color="light">
                              <ion-label v-html="sanitizeHtml(getItemLabel(item))" />
                            </ion-item>
                            <ion-item-options side="end">
                              <ion-item-option @click="slideLootItem(item)" color="danger">
                                &nbsp; Loot &nbsp;
                                <i class="fad fa-hand-holding-box"></i>
                              </ion-item-option>
                            </ion-item-options>
                          </ion-item-sliding>
                        </ion-list>
                      </ion-col>
                      <ion-col size="6">
                        <ion-list>
                          <ion-item-sliding v-for="item in itemsLooted" :key="item.id">
                            <ion-item color="danger">
                              <ion-label v-html="sanitizeHtml(getItemLabel(item))" />
                            </ion-item>
                            <ion-item-options side="end">
                              <ion-item-option @click="slideDropItem(item)" color="light">
                                &nbsp; Drop &nbsp;
                                <i class="fad fa-hand-holding"></i>
                              </ion-item-option>
                            </ion-item-options>
                          </ion-item-sliding>
                        </ion-list>
                      </ion-col>
                    </ion-row>
                  </ion-grid>
                </ion-card-content>
                <ion-toolbar color="dark">
                  <ion-grid>
                    <ion-row>
                      <ion-col size="6" class="ion-padding">
                        <ion-button :disabled="itemsDropped.length < 1" @click="clickLootAll" color="danger"
                          expand="block">
                          <i class="fad fa-hand-holding-box"></i>
                          &nbsp; Loot All &nbsp;
                          <i class="fad fa-arrow-right ion-float-right"></i>
                        </ion-button>
                      </ion-col>
                      <ion-col size="6" class="ion-padding">
                        <ion-button :disabled="itemsLooted.length < 1" @click="clickDropAll" color="light"
                          expand="block">
                          <i class="fad fa-arrow-left"></i>
                          &nbsp; Drop All &nbsp;
                          <i class="fad fa-hand-holding"></i>
                        </ion-button>
                      </ion-col>
                    </ion-row>
                  </ion-grid>
                </ion-toolbar>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>
        <!-- fab placed to the (vertical) center and start -->
        <ion-fab vertical="bottom" horizontal="center" slot="fixed">
          <ion-fab-button color="light" @click.stop="closeModal">
            <i class="fad fa-times fa-4x"></i>
          </ion-fab-button>
        </ion-fab>
      </swiper-slide>
    </swiper>
    <ion-content>
      <!-- fab placed in the center of the content with a list on each side -->
      <!-- <ion-fab vertical="bottom" horizontal="end" slot="fixed">
          <ion-progress-bar color="danger" value="100"></ion-progress-bar>
          <ion-progress-bar color="tertiary" value="100"></ion-progress-bar>
        </ion-fab> -->
    </ion-content>
  </ion-modal>
</template>

<script lang="ts" src="./MyTask.ts" />
<style lang="scss" src="./_MyTask.scss" scoped />
