<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="icon-colors rpg-box">
        <ion-buttons slot="start">
          <ion-menu-button @click="play$fx('select')" />
          <i
            class="fad fa-heart fa-2x ml-2"
            slot="start"
          />
        </ion-buttons>

        <ion-title>
          XP Family Dashboard
        </ion-title>
        <ion-buttons slot="end">
          <XpLoading
            v-if="isLoading"
            style="width: 30px; height: 30px; margin-right: 10px;"
          />
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
        </ion-buttons>
      </ion-toolbar>

      <!-- Native Action Toolbar -->
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
    </ion-header>
    <ion-content class="bg-slide bg-slide-modal icon-colors">
      <!-- Loading State -->
      <div
        v-if="isLoading"
        class="loading-wrapper-centered"
      >
        <XpLoading />
      </div>

      <template v-else>
        <div class="h-full flex flex-col justify-center">
          <!-- User Avatars (Masquerade Mode) -->
          <div
            v-if="showMasquerade"
            class="profile-avatars-container rpg-box mb-4"
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

          <!-- Stats Overview -->
          <!-- Stats Overview -->
          <XpDashboardGrid
            :cols="4"
            class="w-[95%] mx-auto mt-3 h-full flex flex-col justify-center"
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
                :value="abilities?.length || 0"
                label="Abilities"
                iconName="fa-hand-holding-magic"
                :onClick="() => navigateTo({ name: 'xp-abilities' })"
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
                iconName="fa-hand-holding-usd"
                :onClick="() => navigateTo({ name: 'xp-economy-dashboard-root' })"
              />
            </XpDashboardTile>
          </XpDashboardGrid>
        </div>

        <!-- Quick Actions FAB -->
        <ion-fab
          vertical="center"
          horizontal="center"
          slot="fixed"
          class="icon-colors"
        >
          <ion-fab-button>
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
      </template>
    </ion-content>
  </ion-page>
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
