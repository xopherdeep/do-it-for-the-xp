<template>
  <xp-portal-page :loading="!user" page-class="my-portal icon-colors">
    <!-- HUD Overlay (stats, avatar) -->
    <template #hud>
      <div class="portal-docked-xp" v-if="user?.stats && !battleState('active')">
        <xp-purse-bar :stats="user.stats" />
      </div>
      <xp-main-hud v-if="isUserFabOn && user?.stats" :stats="user.stats">
        <template #avatar>
          <xp-fab-user-hud :user="user" :isUserFabOn="isUserFabOn" @open-profile="openUserProfileModal" @open-pegasus="openPegasusModal" />
        </template>
      </xp-main-hud>
      <!-- Timed privileges (30 minutes of games...): the countdown floats above the bottom nav on every screen -->
      <xp-power-timer-bar v-if="user?.id && !battleState('active')" :hero-id="user.id" floating />
    </template>

    <!-- FABs: Retired 2026-10-10 now that 3D voxel models match navigation menus 1:1 across all plazas.
         The hands live in the bottom nav; the Pegasus map opens from the avatar menu next to Save & Quit. -->
    <template #fabs v-if="user">
      <!-- <xp-fab-page-menu v-if="isUserFabOn && fabStyle === 'retro'" :user="user" :page-name="compass.name" :key="`menu-${route.path}`" /> -->
      <!-- <xp-fab-page-shortcuts v-if="isUserFabOn && fabStyle === 'modern'" :shortcuts="userActions" :key="`shortcuts-${route.path}`" /> -->
    </template>

    <!-- Tabs with router outlet -->
    <template #tabs>
      <ion-tabs>
        <ion-router-outlet ref="outlet" :userId="user?.id"></ion-router-outlet>

        <!-- Bottom nav floats over the bottom of the page so the scene shows through -->
        <div class="portal-dock" v-if="user.stats && !battleState('active')" slot="bottom">
          <xp-bottom-nav
            :profile-label="user.name?.nick || 'Hero'"
            :area-label="compass.name"
            :area-icon="compass.icon"
            :left-hand="leftHandItem"
            :right-hand="rightHandItem"
            :active="activeNavTab"
            @open-profile="openUserProfileModal"
            @open-area="openAreaMenu"
            @open-party="openParty"
            @use-hand="useHand"
          />
        </div>
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

      <!-- FIRST-RUN TOUR: once per hero, a ring of light walks the HUD and the bottom nav -->
      <xp-first-run-tour v-if="user?.id && user.stats && !battleState('active')" :hero-id="String(user.id)" />
    </template>
  </xp-portal-page>
</template>

<script lang="ts" src="./MyPortal.ts"></script>
<style lang="scss" src="./_MyPortal.scss"></style>
