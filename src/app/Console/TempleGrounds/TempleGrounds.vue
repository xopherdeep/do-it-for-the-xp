<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar class="rpg-box icon-colors">
        <ion-buttons slot="end">
          <ion-button color="rpg">
            <i class="fad fa-key-skeleton m-0 mr-2 fa-2x ion-float-right" />
            {{ playerKeys }}
          </ion-button>
        </ion-buttons>
        <!-- <ion-buttons slot="start">
          <ion-back-button :default-href="`/my-portal/${userId}/home-town`"></ion-back-button>
          <i class="fad fa-2x fa-place-of-worship" />
        </ion-buttons> -->
        <!-- <ion-title v-html="templeName" /> -->
        <ion-buttons slot="start">

          <ion-button
            v-if="hasMap"
            @click="openMap"
            color="rpg"
          >
            <i
              class="fad fa-2x"
              :class="{
                'fa-map': !hasCompass,
                'fa-map-marked': hasCompass,
}"
            />
          </ion-button>
          <ion-button
            v-if="hasCompass"
            color="rpg"
          >
            <i class="fad fa-compass fa-2x" />
          </ion-button>


          <ion-button
            color="rpg"
            :disabled="true"
            v-if="hasCompass"
          >
            <i class="fad fa-walking fa-2x mr-2" />
            <ion-title>x{{ currentPosition[1] + 1 }} y{{ currentPosition[0] + 1 }}</ion-title>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content
      :style="{
        overflow: 'hidden',
  position: 'relative'
}"
      id="game-area"
      :class="{ 'temple-shake': isShaking }"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <!-- Lantern light breathing over the room, dust in the air -->
      <weather-fx type="temple" :intensity="4" :sound-enabled="false" />

      <!-- Background grid container with all rooms -->
      <div
        id="background-container"
        class="background-container"
        :style="{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          transform: `translate(${backgroundPosition.x}px, ${backgroundPosition.y}px)`,
          transition: 'transform 0.65s ease-in-out'
        }"
      >
        <!-- Create background cells -->
        <template
          v-for="(row, rowIndex) in maze"
          :key="`row-${rowIndex}`"
        >
          <div
            v-for="(cell, colIndex) in row"
            :key="`cell-${rowIndex}-${colIndex}`"
            :style="{
              position: 'absolute',
              top: `${rowIndex * tileHeight}px`,
              left: `${colIndex * tileWidth}px`,
              width: `${tileWidth}px`,
              height: `${tileHeight}px`,
              backgroundImage: `url(${getBgImage(`[${rowIndex},${colIndex}]`)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }"
          >
            <!-- Each room carries its own walls, doors and gates, so they scroll with the floor -->
            <temple-walls
              v-if="isNearHero(rowIndex, colIndex)"
              :exits="exitsAt(rowIndex, colIndex)"
              :element="templeElement"
            />
          </div>
        </template>
      </div>

      <ion-fab
        vertical="center"
        horizontal="center"
        id="room-action"
        @click="showRoomActions"
      >
        <ion-fab-button :color="actionColor">
          <i
            class="fad fa-2x"
            :class="currentRoom ? ROOM_ICONS[currentRoom.type] : ''"
          />
        </ion-fab-button>
        <!-- The beasts in this room have been beaten -->
        <i
          v-if="isCombatRoomCleared"
          class="fas fa-check-circle cleared-mark"
          title="Cleared"
        />
      </ion-fab>

      <!-- Navigation buttons and other UI components -->
      <ion-fab
        vertical="bottom"
        horizontal="start"
        v-if="hasMap"
      >
        <ion-fab-button @click="openMap">
          <i
            class="fad fa-2x"
            :class="{ 'fa-map': !hasCompass, 'fa-map-marked': hasCompass }"
          />
        </ion-fab-button>
        <ion-modal
          :isOpen="isMapOpen"
          @didDismiss="closeMap"
          backdropDismiss="true"
          class="temple-map-modal"
        >
          <ion-card class="maze-container temple-map icon-colors">
            <div class="temple-map__title">
              <span class="temple-map__name">{{ templeName }}</span>
              <span class="temple-map__floor">{{ currentLevel }}</span>
              <i class="fad fa-compass temple-map__rose" aria-hidden="true"></i>
            </div>
            <ion-grid class="temple-map__grid">
              <ion-row
                v-for="(row, rowIndex) in maze"
                :key="rowIndex"
                class="maze-row"
              >
                <ion-col
                  v-for="(cell, colIndex) in row"
                  :key="colIndex"
                  :class="getMapTileClass(rowIndex, colIndex)"
                >
                  <!-- Show appropriate content based on map/compass state -->
                  <template v-if="getRoomVisibility(rowIndex, colIndex) !== 'none'">
                    <!-- Current position always shows the player icon when we have a map -->
                    <i
                      v-if="isCurrentRoom(rowIndex, colIndex)"
                      class="fad fa-2x fa-walking"
                      :class="{ 'pulse-animation': true }"
                    />
                    <!-- Walls are always visible with the map, using the thematic icon with increased dimness -->
                    <i
                      v-else-if="rooms[cell]?.type === 'wall'"
                      class="fad fa-2x"
                      :class="{
                        [ROOM_ICONS.wall]: true,
                        'opacity-10': true
                      }"
                    ></i>
                    <!-- Show room details if we have compass or have visited the room -->
                    <i
                      v-else-if="showRoomDetails(rowIndex, colIndex)"
                      :class="{
                        [getRoomIcon(rowIndex, colIndex)]: true,
                        'fal': rooms[cell]?.type === 'loot' && rooms[cell]?.isEmpty,
                        'fad': !(rooms[cell]?.type === 'loot' && rooms[cell]?.isEmpty),
                        'opacity-45': !isRoomVisited(rowIndex, colIndex) && hasCompass
                      }"
                      class="fa-2x"
                    ></i>
                    <!-- Show a dimmed question mark for rooms we know exist but haven't visited -->
                    <i
                      v-else
                      class="fad fa-2x fa-question-circle opacity-40"
                    ></i>
                  </template>
                  <!-- Show nothing if we don't have the map -->
                  <template v-else>
                    <i class="fad fa-2x fa-solid opacity-0"></i>
                  </template>
                </ion-col>
              </ion-row>
            </ion-grid>
            <div class="temple-map__legend">
              <span v-if="hasMap" class="legend-item"><i class="fad fa-walking"></i> You are here</span>
              <span v-if="hasCompass" class="legend-item"><i class="fad fa-compass"></i> Compass reveals rooms</span>
            </div>
          </ion-card>
        </ion-modal>
      </ion-fab>

      <ion-fab
        v-if="canMoveRight"
        vertical="center"
        horizontal="end"
      >
        <ion-fab-button
          @click.stop="moveWithUpdate('east')"
          color="rpg"
        >
          <i
            class="fad fa-2x"
            :class="isDoorLocked(currentPosition[0], currentPosition[1] + 1)
              ? 'fa-lock'
              : 'fa-arrow-alt-right'
  "
          />
        </ion-fab-button>
      </ion-fab>

      <ion-fab
        v-if="canMoveLeft"
        vertical="center"
        horizontal="start"
      >
        <ion-fab-button
          @click.stop="moveWithUpdate('west')"
          color="rpg"
        >
          <i
            class="fad fa-2x"
            :class="isDoorLocked(currentPosition[0], currentPosition[1] - 1)
              ? 'fa-lock'
              : ' fa-arrow-alt-left'
  "
          />
        </ion-fab-button>
      </ion-fab>

      <ion-fab
        v-if="canMoveDown"
        vertical="bottom"
        horizontal="center"
      >
        <ion-fab-button
          @click="moveWithUpdate('south')"
          color="rpg"
        >
          <i
            class="fad fa-2x"
            :class="isDoorLocked(currentPosition[0] + 1, currentPosition[1])
              ? 'fa-lock'
              : 'fa-arrow-alt-down'
  "
          />
        </ion-fab-button>
      </ion-fab>

      <XpMainHud
        v-if="user && user.stats"
        :stats="user.stats"
      >
        <template #avatar>
          <XpFabUserHud
            :user="user"
            :isUserFabOn="true"
            @open-profile="isProfileOpen = true"
            @open-pegasus="isPegasusOpen = true"
          />
        </template>
      </XpMainHud>
      <ion-fab
        v-if="canMoveUp"
        vertical="top"
        horizontal="center"
      >
        <ion-fab-button
          @click="moveWithUpdate('north')"
          color="rpg"
        >
          <i
            class="fad fa-2x"
            :class="isDoorLocked(currentPosition[0] - 1, currentPosition[1])
              ? 'fa-lock'
              : ' fa-arrow-alt-up'
  "
          />
        </ion-fab-button>
      </ion-fab>




    </ion-content>
    <ion-footer class="temple-footer">
      <!-- The purse and the XP hairline sit on a ledge just above the nav, like the portal -->
      <div class="footer-docked-xp" v-if="user && user.stats">
        <XpGpBar :stats="user.stats" />
        <XpXpBar :stats="user.stats" :hairline="true" />
      </div>

      <!-- The same nav as the portal: Profile | left hand | Area (the equipment) | right hand | Party -->
      <xp-bottom-nav
        :profile-label="user?.name?.nick || 'Hero'"
        :area-label="templeShortName"
        area-icon="place-of-worship"
        :left-hand="leftHandItem"
        :right-hand="rightHandItem"
        active="area"
        @open-profile="isProfileOpen = true"
        @open-area="openEquipment"
        @open-party="$router.push(`/my-portal/${userId}/my-party`)"
        @use-hand="useHand"
      />
    </ion-footer>

    <!-- The equipment, the profile sheet and the Pegasus map, the same ones the portal shows -->
    <xp-equipment-modal :isOpen="isEquipmentOpen" :equipment="equipment" :user="user" @equip-item="clickItem"
      @close="isEquipmentOpen = false" @open-pegasus-modal="isPegasusOpen = true" />
    <user-profile-modal :is-open="isProfileOpen" :user="user" @close="isProfileOpen = false" />
    <xp-world-map-modal :is-open="isPegasusOpen" @close="isPegasusOpen = false" />
  </ion-page>
</template>
<script lang="ts" src="./TempleGrounds.ts" />
<style lang="scss" src="./_TempleGrounds.scss" />