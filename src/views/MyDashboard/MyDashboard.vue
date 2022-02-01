<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button color="primary"></ion-menu-button>
        </ion-buttons>
        <ion-title>{{ user.name.nick }}</ion-title>

      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="false">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">{{ $route.params.id }}</ion-title>
        </ion-toolbar>
      </ion-header>

      <div id="container">
        <CardUserStats :id="user.id" />
        <ion-grid class="user-buffs">
          <ion-row>
            <ion-col  class="ion-no-padding">
              <!-- Colors -->
              <ion-button class="achievements-btn" color="success" size="large">
                <ion-text size="small">
                  <ion-img :src="requireImg('./icons/achievements.svg')"/>
                  <!-- Achievements -->
                </ion-text>
              </ion-button>
            </ion-col>
            <ion-col  class="ion-no-padding">
              <ion-button color="danger" size="large" class="abilities-btn">
                <ion-text size="small">
                  <ion-img :src="requireImg('./icons/037-bandit.svg')"/>
                  <!-- Abilities  -->
                </ion-text>
              </ion-button>
            </ion-col>
            <ion-col  class="ion-no-padding">
              <ion-button color="tertiary" size="large" class="abilities-btn">
                <ion-text size="small">
                  <ion-img :src="requireImg('./icons/self-improvement.svg')"/>
                  <!-- Abilities  -->
                </ion-text>
              </ion-button>
            </ion-col>
          </ion-row>
          <ion-row>
            <ion-col size="2">
              <ion-grid class="ion-no-padding ion-no-margin">
                <ion-row>
                  <ion-col>
                    <ion-thumbnail>
                      <img :src="requireImg('./icons/027-potion.svg')">
                    </ion-thumbnail>
                  </ion-col>
                </ion-row>
                <ion-row>
                  <ion-col>
                    <ion-thumbnail>
                      <img :src="requireImg('./icons/031-wand-1.svg')">
                    </ion-thumbnail>
                  </ion-col>
                </ion-row>
                <ion-row>
                  <ion-col>
                    <ion-thumbnail>
                      <img :src="requireImg('./icons/025-armor.svg')">
                    </ion-thumbnail>
                  </ion-col>
                </ion-row>
                <ion-row>
                  <ion-col>
                    <ion-thumbnail>
                      <img :src="requireImg('./icons/002-wallet-1.svg')">
                    </ion-thumbnail>
                  </ion-col>
                </ion-row>
              </ion-grid>
            </ion-col>
            <ion-col>
              <ion-button class="accessories-btn" color="gold"  size="large" >
                <ion-text size="small">
                  <!-- Accessories -->
                </ion-text>
                <ion-img :src="requireImg('./icons/015-coin.svg')"/>
              </ion-button>
              <hr/>
            </ion-col>
            <ion-col size="2">
              <ion-grid class="ion-no-padding ion-no-margin">
                <ion-row>
                  <ion-col>
                    <ion-thumbnail>
                      <img :src="requireImg('./icons/032-shield.svg')">
                    </ion-thumbnail>
                  </ion-col>
                </ion-row>
                <ion-row>
                  <ion-col>
                    <ion-thumbnail>
                      <img :src="requireImg('./icons/033-sword.svg')">
                    </ion-thumbnail>
                  </ion-col>
                </ion-row>
                <ion-row>
                  <ion-col>
                    <ion-thumbnail>
                      <img :src="requireImg('./icons/034-sword.svg')">
                    </ion-thumbnail>
                  </ion-col>
                </ion-row>
                <ion-row>
                  <ion-col>
                    <ion-thumbnail>
                      <img :src="requireImg('./icons/035-sword.svg')">
                    </ion-thumbnail>
                  </ion-col>
                </ion-row>
              </ion-grid>
            </ion-col>
          </ion-row>
        </ion-grid>
          <!-- <ion-slides pager="true" :options="slideOpts">
            <ion-slide>
              <ion-grid>
                <ion-row>
                  <ion-col >
                      <ion-card class="ion-no-margin">
                        <ion-img src="https://api.lorem.space/image/house?w=150&h=150&hash=1"/>
                      </ion-card>
                  </ion-col>
                  <ion-col >
                      <ion-card class="ion-no-margin">
                        <ion-img src="https://api.lorem.space/image/house?w=150&h=150&hash=3" />
                      </ion-card>
                  </ion-col>
                  <ion-col >
                      <ion-card class="ion-no-margin">
                        <ion-img src="https://api.lorem.space/image/house?w=150&h=150&hash=2" />
                      </ion-card>
                  </ion-col>
                </ion-row>
              </ion-grid>
            </ion-slide>
            <ion-slide>
              <ion-grid>
                <ion-row>
                  <ion-col >
                      <ion-card class="ion-no-margin">
                        <ion-img src="https://api.lorem.space/image/house?w=150&h=150&hash=1"/>
                      </ion-card>
                  </ion-col>
                  <ion-col >
                      <ion-card class="ion-no-margin">
                        <ion-img src="https://api.lorem.space/image/house?w=150&h=150&hash=3" />
                      </ion-card>
                  </ion-col>
                  <ion-col >
                      <ion-card class="ion-no-margin">
                        <ion-img src="https://api.lorem.space/image/house?w=150&h=150&hash=2" />
                      </ion-card>
                  </ion-col>
                </ion-row>
              </ion-grid>
            </ion-slide>
            <ion-slide>
              <ion-grid>
                <ion-row>
                  <ion-col >
                      <ion-card class="ion-no-margin">
                        <ion-img src="https://api.lorem.space/image/house?w=150&h=150&hash=1"/>
                      </ion-card>
                  </ion-col>
                  <ion-col >
                      <ion-card class="ion-no-margin">
                        <ion-img src="https://api.lorem.space/image/house?w=150&h=150&hash=3" />
                      </ion-card>
                  </ion-col>
                  <ion-col >
                      <ion-card class="ion-no-margin">
                        <ion-img src="https://api.lorem.space/image/house?w=150&h=150&hash=2" />
                      </ion-card>
                  </ion-col>
                </ion-row>
              </ion-grid>
            </ion-slide>
          </ion-slides> -->

<!-- Use a trigger -->
<ion-button id="trigger-button">Click to open modal</ion-button>



      </div>
    </ion-content>
  </ion-page>
</template>

<script src="./MyDashboard.js" />
<style src="./_MyDashboard.scss" lang="scss" scoped />
