<template>
  <XpRpgPage
    :class="$options.name"
    title="XP Family Dashboard"
    header-icon="fa-heart"
    :loading="isLoading"
  >
    <!-- Primary Toolbar Actions -->
    <template #start-actions>
      <ion-menu-button @click="play$fx('select')" />
    </template>

    <template #actions>
      <ion-button
        @click="openSettings"
        color="rpg"
      >
        <i class="fad fa-toggle-on fa-lg" />
      </ion-button>

      <ion-button
        @click="refreshData"
        color="rpg"
      >
        <i class="fad fa-sync-alt fa-lg" />
      </ion-button>
    </template>

    <!-- Secondary Toolbar (Masquerade / Add) -->
    <template #secondary-toolbar>
      <ion-toolbar class="icon-colors">
        <ion-buttons slot="start">
          <ion-button
            @click="toggleMasquerade"
            :color="showMasquerade ? 'primary' : 'medium'"
            fill="clear"
          >
            <i class="fad fa-mask mr-2" />
            <span class="text-sm font-bold">Masquerade</span>
          </ion-button>
        </ion-buttons>

        <ion-buttons slot="end">
          <ion-button
            @click="openNewProfileModal"
            color="medium"
          >
            <i class="fad fa-heartbeat mr-1" />
            <span class="text-xs">Add</span>
          </ion-button>
          <ion-button
            @click="openFamilySettings"
            color="medium"
          >
            <i class="fad fa-cogs mr-1" />
            <span class="text-xs">Family</span>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <!-- User Avatars (Masquerade Mode) -->
      <div
        v-if="showMasquerade"
        class="profile-avatars-container rpg-box"
      >
        <div class="scroller-wrapper">
          <div class="profile-grid">
            <div
              v-for="user in users"
              :key="user.id"
              class="profile-item user-item-wrapper"
              @click="impersonateUser(user)"
            >
              <div class="avatar-wrapper">
                <ion-avatar>
                  <ion-img :src="getUserAvatar(user)" />
                </ion-avatar>
                <div class="xp-badge">₲{{ user.stats?.gp.wallet || 0 }}</div>
              </div>
              <div class="username">{{ user.name.nick }}</div>
            </div>
          </div>
          <small class="block text-center mt-2 text-white/50 text-xs">
            Click a profile to masquerade as that user.
          </small>
        </div>
      </div>
    </template>

    <!-- Quick Actions FAB -->
    <ion-fab
      vertical="center"
      horizontal="center"
      slot="fixed"
      class="icon-colors"
    >
      <ion-fab-button color="light">
        <i class="fad fa-police-box fa-2x"></i>
      </ion-fab-button>
      <ion-fab-list side="top">
        <ion-fab-button
          color="success"
          @click="openBonus()"
        >
          <i class="fad fa-thumbs-up fa-lg"></i>
        </ion-fab-button>
      </ion-fab-list>
      <ion-fab-list side="bottom">
        <ion-fab-button
          color="danger"
          @click="openPenalty()"
        >
          <i class="fad fa-thumbs-down fa-lg"></i>
        </ion-fab-button>
      </ion-fab-list>
    </ion-fab>

    <!-- Quest/Achievement FAB -->
    <ion-fab
      vertical="bottom"
      horizontal="center"
      slot="fixed"
      class="icon-colors"
    >
      <ion-fab-button
        color="light"
        @click="presentActionSheet"
      >
        <i class="fad fa-plus fa-2x"></i>
      </ion-fab-button>
    </ion-fab>

    <!-- Main Content -->
    <!-- Stats Overview -->
    <!-- <div
        v-else
        class="h-full flex flex-col justify-center"
      >

      </div> -->
    <XpDashboardGrid
      :cols="4"
      class="w-[94%] mx-auto h-full flex flex-col justify-center"
    >
      <XpDashboardTile>
        <XpStatBox
          :value="stats.users || 0"
          label="Users"
          iconName="fa-users"
          iconColor="tertiary"
          :onClick="openFamilySettings"
        />
      </XpDashboardTile>
      <XpDashboardTile>
        <XpStatBox
          :value="stats.dos || 0"
          label="Do's"
          iconName="fa-thumbs-up"
          iconColor="success"
          :onClick="() => navigateTo({ name: 'xp-do-this-not-that', query: { openDo: 'true' } })"
        />
      </XpDashboardTile>
      <XpDashboardTile>
        <XpStatBox
          :value="stats.donts || 0"
          label="Don'ts"
          iconName="fa-thumbs-down"
          iconColor="danger"
          :onClick="() => navigateTo({ name: 'xp-do-this-not-that', query: { openDo: 'false' } })"
        />
      </XpDashboardTile>
      <XpDashboardTile>
        <XpStatBox
          :value="approvals?.total || 0"
          label="Approvals"
          iconName="fa-clipboard-check"
          iconColor="primary"
          :onClick="() => navigateTo({ name: 'xp-approvals' })"
        />
      </XpDashboardTile>
      <XpDashboardTile>
        <XpStatBox
          :value="stats.beasts || 0"
          label="Beasts"
          iconName="fa-hand-holding-heart"
          :onClick="() => navigateTo({ name: 'xp-bestiary' })"
        />
      </XpDashboardTile>
      <XpDashboardTile>
        <XpStatBox
          :value="abilities?.length || 0"
          label="Powers"
          iconName="fa-hand-holding-magic"
          :onClick="() => navigateTo({ name: 'xp-abilities' })"
        />
      </XpDashboardTile>

      <XpDashboardTile>
        <XpStatBox
          :value="stats.achievements || 0"
          label="Quests"
          iconName="fa-hand-holding-seedling"
          :onClick="() => navigateTo({ name: 'xp-achievements' })"
        />
      </XpDashboardTile>
      <XpDashboardTile>
        <XpStatBox
          :value="rewards?.active || 80"
          label="Items"
          iconName="fa-hand-holding-box"
          :onClick="() => navigateTo({ name: 'xp-economy-dashboard-root' })"
        />
      </XpDashboardTile>
    </XpDashboardGrid>

  </XpRpgPage>
</template>

<script lang="ts" src="./XpDashboard.ts"></script>
<style lang="scss" src="./_XpDashboard.scss"></style>
<style lang="scss" scoped>
  .loading-wrapper-centered {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100%;
    padding: 40px;
  }
</style>
