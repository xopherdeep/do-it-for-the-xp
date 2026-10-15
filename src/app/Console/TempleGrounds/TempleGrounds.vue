<template>
  <ion-page :class="$options.name">
    <ion-header>
      <div class="temple-docked-xp" v-if="user && user.stats">
        <XpPurseBar :stats="user.stats" />
        <XpVitalsBar :stats="user.stats" />
      </div>
      <ion-toolbar class="rpg-box icon-colors">
        <ion-buttons slot="end">
          <ion-button color="rpg" data-cy="temple-keys" :aria-label="`Small keys: ${playerKeys}`">
            <!-- The small keys in hand; the Boss Key (fa-key-skeleton) is another thing -->
            <i class="fad fa-key m-0 mr-2 fa-2x ion-float-right" />
            <!-- Keyed on the pulse: a key spent or picked up replays the roll (down red, up green) -->
            <span :key="keyPulse" class="temple-key-count" :class="keyChange ? `is-${keyChange}` : ''" data-cy="temple-keys-count">{{ playerKeys }}</span>
          </ion-button>
        </ion-buttons>
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
        <!-- Where in the house the hero stands: the room's name, when it has one -->
        <ion-title v-if="currentRoom?.content?.name" class="temple-room-name" data-cy="temple-room-name">{{ currentRoom.content.name }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content
      ref="gameArea"
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
            class="temple-room-cell"
            :style="{
              position: 'absolute',
              top: `${rowIndex * tileHeight}px`,
              left: `${colIndex * tileWidth}px`,
              width: `${tileWidth}px`,
              height: `${tileHeight}px`,
              backgroundImage: getBgImage(`[${rowIndex},${colIndex}]`) ? `url(${getBgImage(`[${rowIndex},${colIndex}]`)})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }"
          >
            <!-- Procedural floor tile for rooms without a pre-rendered background image -->
            <temple-floor
              v-if="rooms[cell]?.type !== 'wall' && !getBgImage(`[${rowIndex},${colIndex}]`)"
              :room="rooms[cell]"
              :element="templeElement"
              :temple="temple"
            />
            <!-- Each room carries its own walls, doors and gates, so they scroll with the floor -->
            <temple-walls
              v-if="isNearHero(rowIndex, colIndex)"
              :exits="exitsAt(rowIndex, colIndex)"
              :element="temple === 'moving-house' ? 'home' : templeElement"
            />
          </div>
        </template>
      </div>

      <!-- 3D Voxel Monster roaming in the room -->
      <xp-monster-model
        v-if="showVoxelMonster"
        :key="`monster-${currentLevel}-${currentPosition[0]}-${currentPosition[1]}`"
        :monster-name="activeMonster.name"
        :avatar-src="activeMonster.avatar"
        @click="showRoomActions"
      />

      <!-- Interactive 3D Voxel Room Model: retired room action FAB placeholder -->
      <div
        v-if="!showVoxelMonster"
        id="room-action"
        class="room-action-voxel"
        @click="showRoomActions"
      >
        <xp-dungeon-room-model
          :key="`room-voxel-${currentLevel}-${currentPosition[0]}-${currentPosition[1]}-${currentRoom?.type}-${currentRoom?.isEmpty}`"
          :room="currentRoom"
          :cleared="isCombatRoomCleared"
          @click="showRoomActions"
        />
        <!-- The beasts in this room have been beaten -->
        <i
          v-if="isCombatRoomCleared"
          class="fas fa-check-circle cleared-mark"
          title="Cleared"
        />
        <!-- Accessible button so older test queries (#room-action ion-fab-button) still resolve -->
        <ion-fab-button
          class="room-action-sr-button"
          aria-hidden="true"
          tabindex="-1"
          @click.stop="showRoomActions"
        />
      </div>

      <!-- Navigation buttons and other UI components -->
      <ion-fab
        vertical="bottom"
        horizontal="start"
        v-if="hasMap"
      >
        <ion-fab-button class="temple-map-fab" @click="openMap">
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
              <!-- The rose sits where a modal's X sits: it closes the map -->
              <button type="button" class="temple-map__rose-btn" aria-label="Close the map" @click="closeMap">
                <i class="fad fa-compass temple-map__rose" aria-hidden="true"></i>
              </button>
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
                  <!-- The cell's icon from the map and compass: the hero, a wall, the room, a question mark or nothing -->
                  <i :class="mapCellIcon(rowIndex, colIndex, cell)"></i>
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
            :class="moveIcons.east"
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
            :class="moveIcons.west"
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
            :class="moveIcons.south"
          />
        </ion-fab-button>
      </ion-fab>

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
            :class="moveIcons.north"
          />
        </ion-fab-button>
      </ion-fab>




    </ion-content>

    <!-- No HP / MP HUD in a temple: the room needs the space; vitals and purse ride hairlines at the top -->

    <ion-footer class="temple-footer">
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

    <!-- The painted floors load before the hero walks in; this covers the whole screen, and only when they are slow -->
    <temple-loading
      :open="isLoadingShown"
      :name="templeName"
      :element="templeElement"
      :done="loadedFloors"
      :total="totalFloors"
    />

    <!-- The equipment, the profile sheet and the Pegasus map, the same ones the portal shows -->
    <xp-equipment-modal :isOpen="isEquipmentOpen" :equipment="equipment" :user="user" @equip-item="clickItem"
      @close="isEquipmentOpen = false" @open-pegasus-modal="isPegasusOpen = true" />
    <user-profile-modal :is-open="isProfileOpen" :user="user" @close="isProfileOpen = false" />
    <xp-world-map-modal :is-open="isPegasusOpen" @close="isPegasusOpen = false" />

    <!-- A chest comes up shut: Open makes the lid fly and the loot rise out of it; Leave closes it again -->
    <temple-chest-reveal :open="isChestOpen" :loot="chestLootShown" :closed="isChestClosed" @take="takeChestLoot" @leave="leaveChest" />

    <!-- The riddle on the wall, the shopkeeper's wares and a room's actions, in the same pixel style -->
    <temple-choice-reveal
      v-if="choiceReveal"
      :key="choiceRevealKey"
      :open="choiceReveal.open"
      :kind="choiceReveal.kind"
      :title="choiceReveal.title"
      :subtitle="choiceReveal.subtitle"
      :body="choiceReveal.body"
      :choices="choiceReveal.choices"
      :cancel-label="choiceReveal.cancelLabel"
      :art="choiceReveal.art"
      :sprite="choiceReveal.sprite"
      :element="templeElement"
      @choose="chooseReveal"
      @leave="leaveReveal"
    />

    <!-- A locked door close up: the key goes in, the lock drops and the doors swing open -->
    <temple-door-reveal
      :open="isDoorOpen"
      :door="doorShown"
      :element="templeElement"
      :result="doorResult"
      @unlock="unlockShownDoor"
      @leave="isDoorOpen = false"
      @done="finishShownDoor"
    />

    <!-- A cracked wall close up: a Bomb in a hand blows it open, the stone crumbles and the way shows -->
    <temple-wall-reveal
      :open="isWallOpen"
      :wall="wallShown"
      :element="templeElement"
      :result="wallResult"
      @bomb="triggerWallBlast"
      @leave="closeShownWall"
      @done="finishShownWall"
    />

    <!-- The temple is cleared: the egg cracks, the Pegasus is free and the reward counts up; Fly home walks out -->
    <temple-pegasus-reveal
      :open="isPegasusRevealOpen"
      :pegasus="pegasusShown"
      :reward="pegasusReward"
      :level-up="pegasusLevelUp"
      @done="finishTempleCleared"
    />
  </ion-page>
</template>
<script lang="ts" src="./TempleGrounds.ts" />
<style lang="scss">
// The small-key counter in the header: the number rolls in from above when a key is spent and from below when one is
// picked up, with a flash of red or green, then settles
.temple-key-count {
  display: inline-block;

  &.is-down {
    animation: temple-key-roll-down 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }

  &.is-up {
    animation: temple-key-roll-up 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }
}

@keyframes temple-key-roll-down {
  0% { transform: translateY(-70%) scale(1.5); opacity: 0; color: var(--xp-color-hp, #e53935); }
  60% { transform: translateY(8%) scale(1.15); opacity: 1; color: var(--xp-color-hp, #e53935); }
  100% { transform: none; opacity: 1; }
}

@keyframes temple-key-roll-up {
  0% { transform: translateY(70%) scale(1.5); opacity: 0; color: var(--xp-color-xp, #43a047); }
  60% { transform: translateY(-8%) scale(1.15); opacity: 1; color: var(--xp-color-xp, #43a047); }
  100% { transform: none; opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .temple-key-count.is-down,
  .temple-key-count.is-up {
    animation: none;
  }
}
</style>
<style lang="scss" src="./_TempleGrounds.scss" />