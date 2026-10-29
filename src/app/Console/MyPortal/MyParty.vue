<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <xp-back-button></xp-back-button>
        </ion-buttons>
        <ion-title>
          <i class="fab fa-fort-awesome fa-lg mr-2" />
          My Party
        </ion-title>
        <ion-buttons slot="end">
          <ion-button aria-label="Party Settings" @click="openPartySettings">
            <ion-icon :icon="settingsOutline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- Tab Segments -->
      <ion-toolbar>
        <ion-segment v-model="activeTab" color="primary" scrollable>
          <ion-segment-button value="roster">
            <ion-icon :icon="peopleOutline" color="primary"></ion-icon>
            <ion-label>Roster</ion-label>
          </ion-segment-button>
          <ion-segment-button value="activity">
            <ion-icon :icon="pulseOutline" color="success"></ion-icon>
            <ion-label>Activity</ion-label>
          </ion-segment-button>
          <ion-segment-button value="synergies">
            <ion-icon :icon="sparklesOutline" color="warning"></ion-icon>
            <ion-label>Synergies</ion-label>
          </ion-segment-button>
          <ion-segment-button value="raids">
            <ion-icon :icon="flashOutline" color="danger"></ion-icon>
            <ion-label>Raids</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rpg-box bg-slide party-content">
      <!-- The panel that forms a party or asks to join one by a code -->
      <party-form-join
        v-if="isNewParty"
        :heroes="partyHeroes"
        :can-manage="canManage"
        @formed="showFormedParty"
      />

      <template v-else>
        <!-- Party Stats Summary -->
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>
              <ion-chip color="success">
                <i class="fad fa-users"></i>
                <ion-label>{{ scope.members.length }} Members</ion-label>
              </ion-chip>
              <ion-chip v-if="showHome" color="warning">
                <i class="fad fa-fire"></i>
                <ion-label>{{ partyStreak }} Day Streak</ion-label>
              </ion-chip>
            </ion-card-subtitle>
          </ion-card-header>
        </ion-card>

        <!-- ROSTER TAB -->
        <party-roster-tab
          v-if="activeTab === 'roster'"
          :members="scope.members"
          :can-manage="canManage"
          @cheer="cheerMember"
          @poke="pokeMember"
          @open-profile="openMemberProfile"
          @invite-member="handleInviteMember"
          @link-phone="handleLinkPhone"
        />

        <!-- ACTIVITY TAB -->
        <party-activity-tab
          v-if="activeTab === 'activity'"
          :activities="scope.activity"
        />

        <!-- SYNERGIES TAB -->
        <party-synergies-tab
          v-if="activeTab === 'synergies'"
          :members="scope.members"
          :hero-ids-today="scope.heroIdsToday"
        />

        <!-- RAIDS TAB -->
        <party-raids-tab
          v-if="activeTab === 'raids'"
          :members="scope.members"
          :party-id="activePartyId"
        />
      </template>
    </ion-content>

    <!-- The fixed words and the party switcher, at the foot of the screen where a thumb reaches -->
    <ion-footer class="party-footer">
      <party-preset-bar v-if="showWords" :party-id="activePartyId" :hero-id="senderHeroId" />
      <party-switcher :parties="parties" :active="activePartyId" @select="activePartyId = $event" />
    </ion-footer>
  </ion-page>
</template>

<script lang="ts" src="./MyParty.ts"></script>
<style scoped lang="scss" src="./_MyParty.scss"></style>
