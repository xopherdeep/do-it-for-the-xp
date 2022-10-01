<template>
  <ion-page ref="battle">
    <canvas class="battle-bg"></canvas>
    <ion-header :translucent="true" v-if="user.stats">

    </ion-header>
    <ion-content :fullscreen="false" class="battle-bg">
      <ion-grid class="battle-grid" :class="$fx.theme.rpg">
        <ion-row>
          <ion-col class="tasks">
            <ion-avatar
              button
              v-for="task in xp_achievement"
              :key="task.id"
              @click="clickTask(task)"
            >
              <ion-img v-bind="getImgObj(task.featured_media)"></ion-img>

              <MyTask
                @didDismiss="activeModal = 0"
                :item="task"
                :userId="user.id"
                v-if="activeModal == task.id"
              />
            </ion-avatar>
          </ion-col>
          <ion-col size="5" class="party">
            <ion-avatar v-for="member in users" :key="member.id">
              <ion-img :src="getUserAvatar(member)" />
            </ion-avatar>
          </ion-col>
        </ion-row>
      </ion-grid>
      <!-- fab placed in the center of the content with a list on each side -->
      <ion-fab
        vertical="bottom"
        horizontal="center"
        slot="fixed"
        v-if="!activeModal"
        @click="clickUserChip(user)"
      >
        <ion-fab-button color="light" v-if="user.avatar">
          <ion-img class="ion-no-padding" :src="getUserAvatar(user)"></ion-img>
          <!-- <ion-icon :icon="accessibilityOutline"></ion-icon> -->
          <!-- <i class="fad fa-2x fa-hand-holding"></i> -->
        </ion-fab-button>
        <!-- <ion-badge color="danger">
          {{user.stats.hp.now}}HP
        </ion-badge>
        <ion-badge color="primary">
          {{user.stats.hp.now}}MP
        </ion-badge> -->
      </ion-fab>
    </ion-content>
    <ion-footer>
      <ion-progress-bar
        color="danger"
        :value="user.stats.hp.now / user.stats.hp.max"
      ></ion-progress-bar>
      <ion-grid class="party" v-if="!activeModal">
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
        class="rpg-box"
        @didDismiss="didDismissUserModal"
        @willPresent="willPresent"
        :is-open="isUserModalOpen"
        v-if="isUserModalOpen"
        trigger="user-modal"
        :breakpoints="[0.12, 0.4, 0.65]"
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

<script src="./BattleGround.js" />
<style src="./_BattleGround.scss" lang="scss" />
