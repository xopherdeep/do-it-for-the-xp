<template>
  <ion-page ref="battle">
    <canvas class="battle-bg"></canvas>
    <ion-header :translucent="true" v-if="user"> </ion-header>
    <ion-content :fullscreen="false" class="battle-bg">
      <ion-buttons>
        <ion-button @click="
          bg1--;
          enterBattle();
        ">
          Prev
        </ion-button>
        {{ bg1 }}
        <ion-button @click="
          bg1++
          enterBattle();
        ">
          Next
        </ion-button>
        {{ bg2 }}
        <ion-button @click="
          bg2--;
          enterBattle();
        ">
          Prev
        </ion-button>
        <ion-button @click="
          bg2++;
          enterBattle();
        ">
          Next
        </ion-button>
      </ion-buttons>
      <ion-card>
        <ion-buttons>
          <ion-button> Achieve </ion-button>
          <ion-button> Abilities </ion-button>
          <ion-button> Goods </ion-button>
          <ion-button> Run </ion-button>
        </ion-buttons>
      </ion-card>
      <ion-grid class="battle-grid" :class="$fx.theme.rpg">
        <ion-row>
          <ion-col class="tasks">
            <ion-avatar button v-for="task in xp_achievement" :key="task.id" @click="clickTask(task)">
              <ion-img v-bind="getImgObj(task.featured_media)"></ion-img>

              <MyTask @didDismiss="activeModal = 0" :item="task" :userId="user.id" v-if="activeModal == task.id" />
            </ion-avatar>
          </ion-col>
          <ion-col size="5" class="party">
            <ion-avatar v-for="member in users" :key="member.id">
              <ion-img :src="$getUserAvatar(member)" />
            </ion-avatar>
          </ion-col>
        </ion-row>
      </ion-grid>
      <!-- fab placed in the center of the content with a list on each side -->
    </ion-content>
    <ion-footer class="text-center">
      <XpHpMpHud v-if="user" :user="user" />
    </ion-footer>
  </ion-page>
</template>

<script src="./BattleGround" />
<style src="./_BattleGround.scss" lang="scss" />
