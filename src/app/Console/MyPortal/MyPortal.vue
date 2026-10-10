<template>
  <xp-portal-page :loading="!user" page-class="my-portal icon-colors">
    <!-- HUD Overlay (stats, avatar) -->
    <template #hud>
      <xp-main-hud v-if="isUserFabOn && user?.stats" :stats="user.stats">
        <template #avatar>
          <xp-fab-user-hud :user="user" :isUserFabOn="isUserFabOn" @open-profile="openUserProfileModal" @open-pegasus="openPegasusModal" />
        </template>
      </xp-main-hud>
    </template>

    <!-- FABs: the page menu (navigating the world) and the shortcuts stay. The quick-draw FAB (the arms with the
         equipment pull-up) is retired 2026-10-10: the hands live in the bottom nav, the equipment opens from the
         Area tab, the Pegasus map opens from the avatar menu next to Save & Quit. Kept here for a while to feel it out. -->
    <template #fabs v-if="user">
      <!-- <xp-fab-quick-draw v-if="isUserFabOn" :user="user" :equipment="equipment" @openHud="openAreaMenu" /> -->
      <xp-fab-page-menu v-if="isUserFabOn && fabStyle === 'retro'" :user="user" :page-name="compass.name" :key="`menu-${route.path}`" />
      <xp-fab-page-shortcuts v-if="isUserFabOn && fabStyle === 'modern'" :shortcuts="userActions" :key="`shortcuts-${route.path}`" />
    </template>

    <!-- Tabs with router outlet -->
    <template #tabs>
      <ion-tabs v-if="user && user.stats">
        <ion-router-outlet ref="outlet" :userId="user.id"></ion-router-outlet>

        <!-- The purse and the XP hairline sit on a ledge just above the nav -->
        <div class="tab-docked-xp tab-docked-xp--ledge" v-if="user.stats && !battleState('active')" slot="bottom">
          <xp-gp-bar :stats="user.stats" />
          <xp-xp-bar :stats="user.stats" :hairline="true" />
        </div>

        <xp-bottom-nav
          slot="bottom"
          v-if="user.stats && !battleState('active')"
          :profile-label="user.name?.nick || 'Hero'"
          :area-label="compass.name"
          :area-icon="compass.icon"
          :left-hand="leftHandItem"
          :right-hand="rightHandItem"
          @open-profile="openUserProfileModal"
          @open-area="openAreaMenu"
          @open-party="openParty"
          @use-hand="useHand"
        />
      </ion-tabs>
    </template>

    <!-- Modals (outside content for proper stacking) -->
    <template #modals>
      <!-- EQUIPMENT MODAL -->
      <xp-equipment-modal :isOpen="isRPGBoxOpen" :equipment="equipment" :user="user" @equip-item="clickItem"
        @close="closeModal" @open-pegasus-modal="openPegasusModal" />

      <!-- USER PROFILE MODAL -->
      <user-profile-modal :is-open="isUserProfileModalOpen" :user="user" @close="closeUserProfileModal" />

      <!-- PEGASUS WORLD MAP MODAL (Wind Whistle) -->
      <xp-world-map-modal :is-open="isPegasusModalOpen" @close="closePegasusModal" />
    </template>
  </xp-portal-page>
</template>

<script lang="ts" src="./MyPortal.ts"></script>
<style lang="scss" src="./_MyPortal.scss"></style>
