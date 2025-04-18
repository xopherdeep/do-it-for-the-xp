<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/my-portal/${userId}/home-town`"></ion-back-button>
          <i class="fad fa-2x fa-place-of-worship" />
        </ion-buttons>
        <ion-title v-html="temple.replace('-', ' ')" />
        <ion-buttons slot="end">
          <ion-button color="none" :disabled="true" v-if="hasCompass">
            {{ currentPosition }}
            <i class="fad fa-walking fa-2x ml-2" />
          </ion-button>
          <ion-button v-if="hasCompass">
            <i class="fad fa-compass fa-2x" />
          </ion-button>
          <ion-button v-if="hasMap" @click="clickMap">
            <i class="fad fa-map fa-2x" :class="{
              'fa-map': !hasCompass,
              'fa-map-marked': hasCompass,
            }" />
          </ion-button>
          <ion-button>
            <i class="fad fa-key-skeleton m-0 mr-2 fa-2x ion-float-right" />
            {{ playerKeys }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content :style="{
      // background: `url('${templeBgImage}')`,
      // backgroundSize: 'cover',
      // backgroundPosition: 'center',
      overflow: 'hidden',
      position: 'relative',
    }" id="game-area">
      <ion-grid id="background-container" class="ion-no-padding">
        <ion-img v-for="xy in validRoomCoords" :key="xy" :src="getBgImage(xy)" class="background-tile" />
      </ion-grid>

      <ion-fab vertical="bottom" horizontal="start" v-if="hasMap">
        <ion-fab-button @click="clickMap">
          <i class="fad fa-2x" :class="{ 'fa-map': !hasCompass, 'fa-map-marked': hasCompass }" />
        </ion-fab-button>
        <ion-modal :isOpen="isMapOpen" @didDismiss="dismissMap">
          <ion-card class="maze-container icon-colors">
            <ion-grid>
              <ion-row v-for="(row, rowIndex) in maze" :key="rowIndex" class="maze-row">
                <ion-col v-for="(cell, colIndex) in row" :key="colIndex" :class="[
                  'maze-cell ion-text-center',
                  // getRoomClass(cell, rooms[cell].visited),
                ]">
                  <template v-if="rooms[cell].type === 'wall' || rooms[cell].visited">
                    <i v-if="isCurrentRoom(rowIndex, colIndex) && hasCompass" class="fad fa-2x fa-walking"
                      :class="{ 'opacity-20': rooms[cell].type === 'wall' }" />
                    <i v-else :class="{
                      'opacity-20': rooms[cell].type === 'wall',
                      [ROOM_ICONS[rooms[cell].type]]: true,
                    }" class="fad fa-2x"></i>
                  </template>
                  <template v-else>
                    <i class="fad fa-2x fa-question"></i>
                  </template>
                </ion-col>
              </ion-row>
            </ion-grid>
            <ion-buttons>
              <ion-button @click="dismissMap" class="rounded">
                Close Map
              </ion-button>
            </ion-buttons>
          </ion-card>
        </ion-modal>
      </ion-fab>

      <ion-fab v-if="canMoveRight" vertical="center" horizontal="end">
        <ion-fab-button @click.stop="move('east')">
          <i class="fad fa-2x" :class="isDoorLocked(currentPosition[0], currentPosition[1] + 1)
            ? 'fa-lock'
            : 'fa-arrow-right'
            " />
        </ion-fab-button>
      </ion-fab>

      <ion-fab v-if="canMoveLeft" vertical="center" horizontal="start">
        <ion-fab-button @click.stop="move('west')">
          <i class="fad fa-2x" :class="isDoorLocked(currentPosition[0], currentPosition[1] - 1)
            ? 'fa-lock'
            : ' fa-arrow-left'
            " />
        </ion-fab-button>
      </ion-fab>

      <ion-fab v-if="canMoveDown" vertical="bottom" horizontal="center">
        <ion-fab-button @click="move('south')">
          <i class="fad fa-2x" :class="isDoorLocked(currentPosition[0] + 1, currentPosition[1])
            ? 'fa-lock'
            : 'fa-arrow-down'
            " />
        </ion-fab-button>
      </ion-fab>

      <ion-fab v-if="canMoveUp" vertical="top" horizontal="center">
        <ion-fab-button @click="move('north')">
          <i class="fad fa-2x" :class="isDoorLocked(currentPosition[0] - 1, currentPosition[1])
            ? 'fa-lock'
            : ' fa-arrow-up'
            " />
        </ion-fab-button>
      </ion-fab>

      <ion-fab vertical="center" horizontal="center" id="room-action" @click="showRoomActions">
        <ion-fab-button :color="currentRoom.content ? actionColor : 'none'">
          <i class="fad fa-2x" :class="ROOM_ICONS[currentRoom.type]" />
        </ion-fab-button>
      </ion-fab>

      <!-- 
        <ion-fab vertical="bottom" horizontal="center" class="mb-14">
          <ion-fab-button>
            <i class="fad fa-2x fa-arrows" />
          </ion-fab-button>
        </ion-fab> 
      -->
    </ion-content>
    <ion-footer>
      <!-- <ion-card>
        <ion-card-content>
          <i
            class="fad fa-2x ion-float-right"
            :class="ROOM_ICONS[currentRoom.type]"
          />
          You are at position: <br />
          Room content:
          {{ currentRoom }}
          <ion-buttons slot="end">
            <ion-button
              size="large"
              v-for="(button, index) in roomActions.buttons"
              :key="index"
              @click="button.handler"
            >
              {{ button.text }}
            </ion-button>
          </ion-buttons>
        </ion-card-content>
      </ion-card> -->
      <ion-toolbar>
        <ion-item-sliding>
          <ion-item-options side="start">
            <ion-item-option> Left Handed </ion-item-option>
          </ion-item-options>
          <ion-item-options side="end">
            <ion-item-option> Right Handed </ion-item-option>
          </ion-item-options>
          <ion-item>
            <ion-avatar slot="start" v-if="user">
              <ion-img :src="$getUserAvatar(user)" />
            </ion-avatar>
            <ion-label slot="start">
              <i class="fad fa-heart ion-float-right" />
              HP
              <ion-progress-bar color="danger" />
              <p class="pt-2">
                <i class="fad fa-magic ion-float-right" />
                MP
                <ion-progress-bar color="secondary" />
              </p>
            </ion-label>
            <ion-buttons class="icon-colors">
              <ion-button @click="$router.push(`/my-abilities/${userId}`)">
                <i class="fad fa-book-spells fa-2x" />
              </ion-button>
              <ion-button @click="$router.push(`/my-inventory/${userId}`)">
                <i class="fad fa-backpack fa-2x" />
              </ion-button>
              <ion-button @click="$router.push(`/my-tasks/${userId}`)">
                <i class="fad fa-medal fa-2x" />
              </ion-button>
              <ion-button @click="$router.push(`/my-gold-points/${userId}`)">
                <i class="fad fa-wallet fa-2x" />
              </ion-button>
            </ion-buttons>
            <i class="fad fa-grip-vertical text-xs m-0" slot="end" />
          </ion-item>
        </ion-item-sliding>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>
<script lang="ts" src="./TempleGrounds" />
<style lang="scss" src="./_TempleGrounds.scss" />
