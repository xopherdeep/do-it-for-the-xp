<template>
  <xp-portal-page
    :loading="!user"
    page-class="my-portal"
  >
    <!-- HUD Overlay (stats, avatar) -->
    <template #hud>
      <xp-main-hud
        v-if="isUserFabOn && user?.stats"
        :stats="user.stats"
      >
        <template #avatar>
          <xp-fab-user-hud
            :user="user"
            :isUserFabOn="isUserFabOn"
            @open-profile="openUserProfileModal"
          />
        </template>
      </xp-main-hud>
    </template>

    <!-- FABs (quick draw, page menu, shortcuts) -->
    <template #fabs>
      <xp-fab-quick-draw
        v-if="isUserFabOn"
        :user="user"
        :equipment="equipment"
        @openHud="
          isRPGBoxOpen = true;
          play$fx('openMenu');
        "
      />
      <!-- Retro FAB (Centered Menu) -->
      <xp-fab-page-menu
        v-if="isUserFabOn && fabStyle === 'retro'"
        :user="user"
        :page-name="compass.name"
        :key="`menu-${route.path}`"
      />

      <!-- Modern FAB (Radial Shortcuts) -->
      <xp-fab-page-shortcuts
        v-if="isUserFabOn && fabStyle === 'modern'"
        :shortcuts="userActions"
        :key="`shortcuts-${route.path}`"
      />
    </template>

    <!-- Tabs with router outlet -->
    <template #tabs>
      <ion-tabs v-if="user && user.stats">
        <ion-router-outlet
          ref="outlet"
          :userId="user.id"
        ></ion-router-outlet>

        <!-- Docked XP Bar -->
        <div
          class="tab-docked-xp"
          v-if="user.stats && !battleState('active')"
          slot="bottom"
        >
          <xp-gp-bar :stats="user.stats" />
          <xp-xp-bar
            :stats="user.stats"
            :hairline="true"
          />
        </div>

        <ion-tab-bar
          slot="bottom"
          v-if="user.stats && !battleState('active')"
        >
          <ion-tab-button
            color="success"
            tab="my-profile"
            @click.prevent="openUserProfileModal"
          >
            <i class="fad fa-2x fa-hand-holding-seedling"></i>
            <ion-label v-if="user.name">
              {{ user.name.nick }}
            </ion-label>
          </ion-tab-button>
          <ion-tab-button
            tab="my-home"
            :href="compass.link"
          >
            <i
              class="fad fa-2x"
              :class="`fa-${compass.icon}`"
            ></i>
            <ion-label>
              {{ compass.name }}
            </ion-label>
          </ion-tab-button>
          <ion-tab-button
            tab="my-party"
            :href="`/my-portal/${userId}/my-party`"
          >
            <i class="fab fa-fort-awesome fa-2x"></i>
            <ion-label>Party</ion-label>
          </ion-tab-button>
        </ion-tab-bar>
      </ion-tabs>
    </template>

    <!-- Modals (outside content for proper stacking) -->
    <template #modals>
      <!-- EQUIPMENT MODAL -->
      <xp-equipment-modal
        :isOpen="isRPGBoxOpen"
        :equipment="equipment"
        :user="user"
        @equip-item="clickItem"
        @close="closeModal"
        @open-pegasus-modal="openPegasusModal"
      />

      <!-- USER PROFILE MODAL -->
      <user-profile-modal
        :is-open="isUserProfileModalOpen"
        :user="user"
        @close="closeUserProfileModal"
      />

      <!-- PEGASUS WORLD MAP MODAL (Wind Whistle) -->
      <xp-world-map-modal
        :is-open="isPegasusModalOpen"
        @close="closePegasusModal"
      />
    </template>
  </xp-portal-page>
</template>

<script src="./MyPortal"></script>
<style lang="scss" src="./_MyPortal.scss"></style>
