<template>
  <xp-rpg-page
    title="Family Overview"
    :loading="isLoading"
    bg-class="bg-slide"
    class="family-overview-page"
    header-icon="fa-users"
    :back-button-href="backHref"
    :on-refresh="handleRefresh"
    content-class="ion-padding"
  >
    <template #actions>
      <ion-button v-if="canManage" router-link="/xp-settings/family" size="small" fill="clear">
        <i class="fad fa-cog fa-lg"></i>
      </ion-button>
    </template>

    <div class="family-overview-content">
      <!-- Summary Banner: Chores progress, vault GP, top streak, approvals alert -->
      <family-summary-banner
        :completed-chores="summary.completedChoresToday"
        :total-chores="summary.totalChoresToday"
        :total-gp="summary.totalFamilyGp"
        :total-members="summary.totalMembers"
        :longest-streak="summary.longestStreak"
        :pending-approvals="summary.pendingApprovalsCount"
        :can-manage="canManage"
      />

      <!-- View Selector Segment -->
      <ion-segment :value="activeTab" @ionChange="activeTab = $event.detail.value as any" class="view-segment mb-4">
        <ion-segment-button value="roster">
          <ion-label>
            <i class="fad fa-shield-alt mr-1"></i>
            Party Roster ({{ summary.members.length }})
          </ion-label>
        </ion-segment-button>
        <ion-segment-button value="chores">
          <ion-label>
            <i class="fad fa-tasks mr-1"></i>
            Today's Quests ({{ summary.allTodayChores.length }})
          </ion-label>
        </ion-segment-button>
      </ion-segment>

      <!-- Tab 1: Member Roster Grid -->
      <ion-grid v-if="activeTab === 'roster'" class="ion-no-padding">
        <ion-row>
          <ion-col
            v-for="member in summary.members"
            :key="member.id"
            size="12"
            size-md="6"
            size-xl="4"
          >
            <family-member-card
              :member="member"
              @select="handleSelectMember"
            />
          </ion-col>
        </ion-row>
      </ion-grid>

      <!-- Tab 2: Family Chores List -->
      <family-today-chores
        v-else
        :chores="summary.allTodayChores"
      />
    </div>
  </xp-rpg-page>
</template>

<script lang="ts" src="./FamilyOverview.ts"></script>
<style lang="scss" src="./_FamilyOverview.scss" scoped></style>
