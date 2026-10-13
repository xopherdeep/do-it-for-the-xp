<template>
  <ion-card
    class="user-stats"
    v-if="user"
  >
    <ion-card-title v-if="user.name">
      {{ user.name.nick }}
    </ion-card-title>
    <ion-toolbar
      style="--background: transparent"
      v-if="!hideMenu"
      class="ion-no-margin"
    >
      <ion-grid class="ion-no-padding">
        <ion-row>
          <ion-col
            size="6"
            size-sm="3"
          >
            <ion-button
              expand="block"
              color="success"
              @click.stop="clickAction('my-tasks')"
            >
              <i class="fad fa-2x fa-hand-holding-seedling"></i>
              Quest
            </ion-button>
          </ion-col>
          <ion-col
            size="6"
            size-sm="3"
          >
            <ion-button
              expand="block"
              color="tertiary"
              @click.stop="clickAction('my-abilities')"
            >
              <i class="fad fa-2x fa-hand-holding-medical"></i>
              Abilities
            </ion-button>
          </ion-col>
          <ion-col
            size="6"
            size-sm="3"
          >
            <ion-button
              expand="block"
              color="danger"
              @click.stop="clickAction('my-inventory')"
            >
              <i class="fad fa-2x fa-hand-holding-box"></i>
              Goods
            </ion-button>
          </ion-col>
          <ion-col
            size="6"
            size-sm="3"
          >
            <ion-button
              expand="block"
              color="gold"
              :router-link="`/my-gold-points/${user.id}/`"
            >
              <i class="fad fa-2x fa-hand-holding-usd"></i>
              Wallet
            </ion-button>
          </ion-col>
          <ion-col size="4">
            <ion-button
              expand="block"
              color="dark"
              @click.stop="clickAction('my-tasks')"
            >
              <i class="fad fa-2x fa-comment"></i>
              Talk
            </ion-button>
          </ion-col>
          <ion-col size="4">
            <ion-button
              expand="block"
              color="dark"
              :router-link="`/user/${user.id}`"
              size="4"
              router-direction="forward"
            >
              <i class="fad fa-2x fa-axe-battle"></i>
              Equip
            </ion-button>
          </ion-col>
          <ion-col size="4">
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-toolbar>
    <ion-card-header class="ion-no-padding">
      <ion-grid class="ion-no-padding">
        <ion-row class=" ion-justify-content-center ion-align-items-center">
          <ion-col class="ion-col-avatar">
            <IonImg
              v-if="user.avatar"
              :router-link="`/user/${user.id}`"
              router-direction="forward"
              :src="$getUserAvatar(user)"
            />
          </ion-col>
          <ion-col
            size="9"
            class="ion-no-padding"
          >
            <ion-grid
              class="ion-no-padding"
              v-if="user.stats"
            >
              <ion-row>
                <ion-col class="ion-no-padding">
                  <!-- HP -->
                  <ion-badge class="xp-badge-bar">
                    <ion-progress-bar
                      color="danger"
                      :value="user.stats.hp.now / user.stats.hp.max"
                    ></ion-progress-bar>
                    <ion-badge>
                      <ion-text class="ion-float-left">
                        <i class="fad fa-hand-holding-heart fa-lg"></i>
                      </ion-text>
                      <ion-text class="ion-float-right"> HP </ion-text>
                      <ion-text class="ion-float-right">
                        <b> {{ user.stats.hp.now }}/{{ user.stats.hp.max }} </b>
                      </ion-text>
                    </ion-badge>
                  </ion-badge>
                </ion-col>
              </ion-row>
              <ion-row>
                <ion-col class="ion-no-padding">
                  <!-- MP -->
                  <ion-badge class="mp-badge">
                    <ion-progress-bar
                      color="tertiary"
                      :value="user.stats.mp.now / user.stats.mp.max"
                    ></ion-progress-bar>
                    <ion-badge>
                      <ion-text class="ion-float-left">
                        <i class="fad fa-hand-holding-magic fa-lg"></i>
                      </ion-text>
                      <ion-text class="ion-float-right">
                        MP
                      </ion-text>
                      <ion-text class="ion-float-right">
                        <b> {{ user.stats.mp.now }}/{{ user.stats.mp.max }} </b>
                      </ion-text>
                    </ion-badge>
                  </ion-badge>
                </ion-col>
              </ion-row>
              <ion-row>
                <ion-col class="ion-no-padding">
                  <!-- GP -->
                  <ion-badge class="xp-badge-bar">
                    <ion-progress-bar
                      color="warning"
                      :value="user.stats.gp.wallet / user.stats.gp.limit"
                    ></ion-progress-bar>
                    <ion-badge>
                      <ion-text class="ion-float-left">
                        <i class="fad fa-hand-holding-usd fa-lg"></i>
                      </ion-text>
                      <ion-text class="ion-float-right"> GP </ion-text>
                      <ion-text class="ion-float-right">
                        <b>
                          <i class="fad fa-coin"></i>
                          ¤{{ user.stats.gp.wallet }}
                          /
                          <i class="fad fa-wallet"></i>
                          ¤{{ user.stats.gp.limit }}
                        </b>
                      </ion-text>
                    </ion-badge>
                  </ion-badge>
                </ion-col>
              </ion-row>
              <ion-row>
                <ion-col class="ion-no-padding">
                  <!-- USER LEVEL & XP Bar -->
                  <ion-badge class="xp-badge-bar">
                    <ion-progress-bar
                      color="green"
                      :value="getCounterXPCurrentAmount()"
                    ></ion-progress-bar>
                    <ion-badge>
                      <ion-text class="ion-float-left">
                        <i class="fad fa-hand-holding-seedling fa-lg"></i>
                      </ion-text>
                      <ion-text class="ion-float-right"> XP </ion-text>
                      <ion-text class="ion-float-right">
                        Level
                        {{ user.stats.level }}
                        -
                        <b>
                          <vue3-autocounter
                            ref="countXPTotal"
                            :startAmount="0"
                            :endAmount="xpNow"
                            :duration="4"
                            suffix="XP"
                            separator=","
                            :autoinit="false"
                          />
                          /

                          <i class="fad fa-level-up"></i>
                          {{ xpNext }}
                        </b>
                      </ion-text>
                    </ion-badge>
                  </ion-badge>
                </ion-col>
              </ion-row>
            </ion-grid>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-card-header>
    <ion-card-content
      class="ion-no-padding"
      v-if="user.stats"
    >
      <ion-grid class="ion-no-margin ion-no-padding">
        <ion-row class="ap-breakdown">
          <ion-col size="12">
          </ion-col>
        </ion-row>
        <ion-row>
          <ion-col size="12">
            <!-- AP -->
            <ion-chip
              color="light"
              class="chip-ap ion-no-margin"
            >
              <ion-label class="full-width">
                <i class="fad fa-hand-holding-medical fa-2x"></i>
                <ion-text class="ion-float-left"> AP </ion-text>
                <ion-text class="ion-float-right">
                  <ion-badge color="danger">
                    <vue3-autocounter
                      ref="countAPTotal"
                      :startAmount="0"
                      :endAmount="apWindows.total"
                      :duration="4"
                      separator=","
                      :autoinit="false"
                    />
                    AP
                  </ion-badge>
                  [
                  <ion-badge
                    size="small"
                    color="warning"
                  > {{ apWindows.daily }}d </ion-badge>
                  <ion-badge color="warning"> {{ apWindows.weekly }}w </ion-badge>
                  <ion-badge color="success"> {{ apWindows.monthly }}m </ion-badge>
                  <ion-badge color="success">
                    {{ apWindows.yearly }}y
                  </ion-badge>
                  ]
                </ion-text>
              </ion-label>
            </ion-chip>
          </ion-col>
        </ion-row>
      </ion-grid>

      <ion-button
        expand="full"
        color="primary"
        :router-link="`/user/${user.id}`"
      >
        View Stats
      </ion-button>
    </ion-card-content>
  </ion-card>
</template>

<script src="./CardUserStats.ts" lang="ts" />
<style src="./_CardUserStats.scss" lang="scss" />
