<template>
  <ion-page>
    <ion-header :translucent="true" v-if="user.stats">
      <ion-toolbar v-if="user">
        <ion-buttons slot="start">
          <ion-menu-button color="primary"></ion-menu-button>
        </ion-buttons>
        <ion-icon :icon="accessibilityOutline" slot="icon-only" />
        <ion-title v-if="user.name">{{ user.name.nick }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="false">
      <div id="container">
        <ion-grid class="user-buffs">
          <!-- <ion-row>
            <ion-col class="ion-no-padding">
              <ion-button
                router-direction="forward"
                :router-link="`/my-tasks/${user.id}`"
                class="achievements-btn"
                color="success"
                size="large"
              >
                <ion-text size="small">
                  <ion-img :src="requireImg('./icons/achievements.svg')" />
                </ion-text>
              </ion-button>
            </ion-col>
            <ion-col class="ion-no-padding">
              <ion-button
                :router-link="`/my-inventory/${user.id}`"
                color="danger"
                size="large"
                class="abilities-btn"
              >
                <ion-text size="small">
                  <ion-img :src="requireImg('./icons/037-bandit.svg')" />
                </ion-text>
              </ion-button>
            </ion-col>
            <ion-col class="ion-no-padding">
              <ion-button
                :router-link="`/my-abilities/${user.id}`"
                :router-direction="forward"
                color="tertiary"
                size="large"
                class="abilities-btn"
              >
                <ion-text size="small">
                  <ion-img :src="requireImg('./icons/self-improvement.svg')" />
                </ion-text>
              </ion-button>
            </ion-col>
          </ion-row> -->
          <ion-row>
            <ion-col size="2">
              <ion-grid class="ion-no-padding ion-no-margin">
                <ion-row>
                  <ion-col>
                    <ion-thumbnail>
                      <img :src="requireImg('./icons/027-potion.svg')" />
                    </ion-thumbnail>
                  </ion-col>
                </ion-row>
                <ion-row>
                  <ion-col>
                    <ion-thumbnail>
                      <img :src="requireImg('./icons/031-wand-1.svg')" />
                    </ion-thumbnail>
                  </ion-col>
                </ion-row>
                <ion-row>
                  <ion-col>
                    <ion-thumbnail>
                      <img :src="requireImg('./icons/025-armor.svg')" />
                    </ion-thumbnail>
                  </ion-col>
                </ion-row>
                <ion-row>
                  <ion-col>
                    <ion-thumbnail>
                      <img :src="requireImg('./icons/002-wallet-1.svg')" />
                    </ion-thumbnail>
                  </ion-col>
                </ion-row>
              </ion-grid>
            </ion-col>
            <ion-col>
              <ion-button
                class="accessories-btn"
                color="gold"
                size="large"
                :router-link="`/my-gold-points/${user.id}/`"
              >
                <ion-text size="small">
                  <!-- Accessories -->
                </ion-text>
                <ion-img :src="requireImg('./icons/015-coin.svg')" />
              </ion-button>
              <hr />
            </ion-col>
            <ion-col size="2">
              <ion-grid class="ion-no-padding ion-no-margin">
                <ion-row>
                  <ion-col>
                    <ion-thumbnail>
                      <img :src="requireImg('./icons/032-shield.svg')" />
                    </ion-thumbnail>
                  </ion-col>
                </ion-row>
                <ion-row>
                  <ion-col>
                    <ion-thumbnail>
                      <img :src="requireImg('./icons/033-sword.svg')" />
                    </ion-thumbnail>
                  </ion-col>
                </ion-row>
                <ion-row>
                  <ion-col>
                    <ion-thumbnail>
                      <img :src="requireImg('./icons/034-sword.svg')" />
                    </ion-thumbnail>
                  </ion-col>
                </ion-row>
                <ion-row>
                  <ion-col>
                    <ion-thumbnail>
                      <img :src="requireImg('./icons/035-sword.svg')" />
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
      </div>
      <!-- fab placed in the center of the content with a list on each side -->
      <ion-fab vertical="bottom" horizontal="center" slot="fixed" @click="clickUserChip(user)">
        <ion-fab-button color="light">
            <ion-img
              class="ion-no-padding"
              :src="getUserAvatar(user)"
            ></ion-img>
          <!-- <ion-icon :icon="accessibilityOutline"></ion-icon> -->
          <!-- <i class="fad fa-2x fa-hand-holding"></i> -->
        </ion-fab-button>

        <!-- 
          <ion-fab-list side="top">
            <ion-fab-button color="success" @click.stop="clickAction('my-tasks')">
              <ion-icon :icon="medalOutline"></ion-icon>
              <ion-img :src="requireImg('./icons/achievements.svg')" />
              <i class="fad fa-2x fa-medal"></i>
            </ion-fab-button>
            Achieve
            Attack
          </ion-fab-list>
          <ion-fab-list side="bottom">
            <ion-fab-button><ion-icon :icon="bag"></ion-icon></ion-fab-button>
          </ion-fab-list>
          <ion-fab-list side="start">
            <ion-fab-button
              color="tertiary"
              @click.stop="clickAction('my-abilities')"
            >
              <ion-icon :icon="colorWandOutline"></ion-icon>
              <ion-img :src="requireImg('./icons/self-improvement.svg')" />
              <i class="fad fa-2x fa-hand-holding-magic"></i>
            </ion-fab-button>
            Magic
          </ion-fab-list>
          <ion-fab-list side="end">
            <ion-fab-button
              size="large"
              color="danger"
              @click.stop="clickAction('my-inventory')"
            >
              <ion-icon :icon="bagOutline"></ion-icon>
              <ion-img :src="requireImg('./icons/037-bandit.svg')" />
              <i class="fad fa-2x fa-hand-holding-heart"></i>
            </ion-fab-button>
            Items
          </ion-fab-list> 
        -->
      </ion-fab>
    </ion-content>
    <ion-footer>
      <ion-progress-bar color="danger" 
                        :value="user.stats.hp.now / user.stats.hp.max"
      ></ion-progress-bar>
        <ion-grid class="party">
          <ion-row>
            <ion-col
              v-for="member in users.filter((u) => u.id != user.id)"
              :key="member.id"
              class="ion-no-padding"
              size="3"
            >
              <ion-chip class="ion-no-margin" @click="clickUserChip(member)">
                <ion-avatar>
                  <img :src="getUserAvatar(member)" />
                </ion-avatar>
                <ion-grid class="ion-no-margin ion-no-padding">
                  <ion-row>
                    <ion-col>
                      <ion-progress-bar
                        color="danger"
                        :value="member.stats.hp.now / member.stats.hp.max"
                      ></ion-progress-bar>
                    </ion-col>
                  </ion-row>
                  <ion-row>
                    <ion-col>
                      <ion-progress-bar
                        color="tertiary"
                        :value="member.stats.mp.now / member.stats.mp.max"
                      ></ion-progress-bar>
                    </ion-col>
                  </ion-row>
                </ion-grid>
                <!-- <ion-label>Avatar Chip</ion-label> -->
              </ion-chip>
            </ion-col>
          </ion-row>
        </ion-grid>
    <!-- Sheet Modal -->
    <ion-modal 
      @didDismiss="didDismissUserModal"
      @willPresent="willPresent"
      :is-open="isUserModalOpen"
      v-if="isUserModalOpen"
      trigger="user-modal"
      :breakpoints="[0.12, 0.4, 0.65, .8]"
      :initialBreakpoint="initialBreakpoint"
    >
      <ion-content>
        <CardUserStats :id="isUserModalOpen" />
      </ion-content>
    </ion-modal>

      <ion-progress-bar color="success" :value="0.5"></ion-progress-bar>
    </ion-footer>
  </ion-page>
</template>

<script src="./MyDashboard.js" />
<style src="./_MyDashboard.scss" lang="scss" scoped />
