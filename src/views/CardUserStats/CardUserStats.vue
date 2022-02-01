<template>
        <ion-card class="user-stats">
          <ion-card-header class="ion-no-padding">
            <ion-grid class="ion-no-padding">
              <ion-row>
                <ion-col class="ion-col-avatar">
                  <ion-avatar>
                    <img :src="getUserAvatar(user)" />
                  </ion-avatar>

                  <!-- GP -->
                  <ion-chip color="warning" >
                    <ion-icon :icon="icons.server"></ion-icon>
                    <ion-label class="full-width">
                      <ion-text class="ion-float-left">
                        <strong> ¤{{ user.stats.gp.wallet }}</strong> 
                      </ion-text>
                      <ion-text class="ion-float-right">
                        GP
                      </ion-text>
                    </ion-label>
                  </ion-chip>
                </ion-col>
                <ion-col size="8" class="ion-no-padding">
                  <ion-grid class="ion-no-padding">
                    <ion-row>
                      <ion-col class="ion-no-padding">
                        <!-- USER LEVEL & XP Bar -->
                        <ion-chip color="green">
                          <ion-icon :icon="icons.sparkles"></ion-icon>
                          <ion-label class="full-width">
                            <ion-text class="ion-float-left"> XP </ion-text>
                            <ion-text class="ion-float-right">
                              Level
                              {{ user.stats.level }}
                              -
                              <b> 100/200 </b>
                            </ion-text>
                            <ion-progress-bar
                              color="green"
                              value="0.5"
                            ></ion-progress-bar>
                          </ion-label>
                        </ion-chip>
                      </ion-col>
                    </ion-row>
                    <ion-row>
                      <ion-col class="ion-no-padding">
                        <!-- HP -->
                        <ion-chip color="danger" class="ion-no-margin" @click="clickHP">
                          <ion-icon
                            :icon="icons.fitnessOutline"
                            color="danger"
                          ></ion-icon>
                          <ion-label class="full-width">
                            <ion-text class="ion-float-left"> HP </ion-text>
                            <ion-text class="ion-float-right">
                              <b>
                                {{ user.stats.hp.now }}/{{ user.stats.hp.max }}
                              </b>
                            </ion-text>
                            <ion-progress-bar
                              color="danger"
                              :value="user.stats.hp.now / user.stats.hp.max"
                            ></ion-progress-bar>
                          </ion-label>
                        </ion-chip>
                      </ion-col>
                    </ion-row>
                    <ion-row>
                      <ion-col class="ion-no-padding">
                        <!-- MP -->
                        <ion-chip color="tertiary">
                          <ion-icon
                            :icon="icons.colorWand"
                            color="tertiary"
                          ></ion-icon>
                          <ion-label class="full-width">
                            <ion-text class="ion-float-left"> MP </ion-text>
                            <ion-text class="ion-float-right">
                              <b>
                                {{ user.stats.mp.now }}/{{ user.stats.mp.max }}
                              </b>
                            </ion-text>
                            <ion-progress-bar
                              color="tertiary"
                              :value="user.stats.mp.now / user.stats.mp.max"
                            ></ion-progress-bar>
                          </ion-label>
                        </ion-chip>
                      </ion-col>
                    </ion-row>
                  </ion-grid>
                  <!-- <ion-card-title>
                  {{ user.name.nick }}
                </ion-card-title>
                <ion-card-subtitle>
                  {{ user.name.first }}
                  {{ user.name.middle }}
                  {{ user.name.last }}
                </ion-card-subtitle> -->
                </ion-col>
              </ion-row>
            </ion-grid>
          </ion-card-header>
          <ion-card-content class="ion-no-padding">
            <ion-grid class="ion-no-margin ion-no-padding">
              <ion-row>
                <ion-col class="ion-no-padding ion-no-margin">

                  <ion-chip color="primary" class="chip-ap ion-no-margin">
                    <ion-icon :icon="icons.medal"></ion-icon>
                    <ion-label class="full-width">
                      <ion-text class="ion-float-left"> AP </ion-text>
                      <ion-text class="ion-float-right">
2000 
                      </ion-text>
                    </ion-label>
                  </ion-chip>
                </ion-col>
                <ion-col size="8">

                  <ion-chip color="primary" class="chip-ap ion-no-margin">
                    <!-- <ion-icon :icon="icons.medal"></ion-icon> -->
                    <ion-label class="full-width">
                      <!-- <ion-text class="ion-float-left"> AP 2000 </ion-text> -->
                      <ion-text class="ion-float-right">
                        <b> 10d / 89w / 300m / 1000y </b>
                      </ion-text>
                    </ion-label>
                  </ion-chip>
                </ion-col>
              </ion-row>
            </ion-grid>
          </ion-card-content>
        </ion-card>
</template>

<script src="./CardUserStats.js" />
<style src="./_CardUserStats.scss" lang="scss" />
