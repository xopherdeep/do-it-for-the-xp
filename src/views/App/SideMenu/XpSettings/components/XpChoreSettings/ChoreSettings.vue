<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-button :router-link="`/xp-settings/`">
            <ion-icon
              :icon="arrowBack"
              slot="icon-only"
            />
          </ion-button>
        </ion-buttons>
        <ion-title>Chore Settings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content
      :fullscreen="true"
      class="rpg-box flex flex-col gap-4 bg-slide"
    >
      <ion-grid class="max-w-5xl mx-auto">
        <ion-row>
          <ion-card class="settings-card">
            <ion-list>
              <!-- Chore Approval Toggle -->
              <ion-item>
                <ion-label>
                  <h2>Requires Approval</h2>
                  <p>Parents approve the chores to allocate S'mores for completed chores</p>
                </ion-label>
                <ion-toggle
                  v-model="choreSettings.requireApproval"
                  @ionChange="saveChoreSettings"
                ></ion-toggle>
              </ion-item>

              <!-- Assign Chores to Parents Toggle -->
              <ion-item>
                <ion-label>
                  <h2>Assign chores to parents</h2>
                  <p>Turns on the Mini-Me mode and enables parents to manage their chores using S'moresUp</p>
                </ion-label>
                <ion-toggle
                  v-model="choreSettings.assignToParents"
                  @ionChange="saveChoreSettings"
                ></ion-toggle>
              </ion-item>

              <!-- Parent Avatars -->
              <ion-item
                v-if="choreSettings.assignToParents"
                lines="none"
              >
                <div class="avatar-group">
                  <div
                    v-for="user in parentUsers"
                    :key="user.id"
                    class="avatar-wrapper"
                  >
                    <ion-avatar @click="toggleParentAssignment(user.id)">
                      <img
                        :src="appConfig.$getUserAvatar(user)"
                        :alt="user.name.full"
                      >
                      <i
                        class="fad fa-check-circle status-icon"
                        v-if="choreSettings.assignedParents[user.id]"
                      ></i>
                    </ion-avatar>
                    <span class="avatar-name">{{ user.name.nick }}</span>
                  </div>
                </div>
              </ion-item>

              <!-- Complete Overdue Chores Toggle -->
              <ion-item>
                <ion-label>
                  <h2>Complete overdue chores</h2>
                  <p>When turned on, kids will be able to mark chores from past as complete and collect S'mores</p>
                </ion-label>
                <ion-toggle
                  v-model="choreSettings.completeOverdue"
                  @ionChange="saveChoreSettings"
                ></ion-toggle>
              </ion-item>

              <!-- Chore Card Display Settings -->
              <ion-item>
                <ion-label>
                  <h2>Show Chore Card on Today's Progress</h2>
                  <p>When turned on, chores that are due today are displayed in the card format on the Chores Tab</p>
                </ion-label>
                <ion-toggle
                  v-model="choreSettings.showOnTodayProgress"
                  @ionChange="saveChoreSettings"
                ></ion-toggle>
              </ion-item>

              <ion-item>
                <ion-label>
                  <h2>Show Chore Card on Quick Update</h2>
                  <p>When turned on, chores that are due today are displayed in the card format on the Quick Update
                    sections
                  </p>
                </ion-label>
                <ion-toggle
                  v-model="choreSettings.showOnQuickUpdate"
                  @ionChange="saveChoreSettings"
                ></ion-toggle>
              </ion-item>
            </ion-list>
          </ion-card>

        </ion-row>
        <ion-row>
          <!-- Premium Features -->
          <ion-card class="premium-card">
            <ion-card-header>
              <ion-card-title>Subscribe and enjoy these premium features</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-button
                expand="block"
                color="primary"
                class="subscribe-btn"
              >
                SUBSCRIBE NOW
              </ion-button>

              <!-- Photo Proof -->
              <ion-item class="premium-item">
                <ion-label>
                  <h2>Add a photo proof</h2>
                  <p>Kids add photo with every chore they complete. Parents can review it later.</p>
                </ion-label>
                <ion-toggle
                  disabled
                  v-model="choreSettings.photoProof"
                ></ion-toggle>
              </ion-item>

              <!-- Lock Chores -->
              <ion-item class="premium-item">
                <ion-label>
                  <h2>Lock Chores</h2>
                  <p>Any chore that is not completed by "Due Time" is locked for kids</p>
                </ion-label>
                <ion-toggle
                  disabled
                  v-model="choreSettings.lockChores"
                ></ion-toggle>
              </ion-item>

              <!-- Late Penalty -->
              <ion-item class="premium-item">
                <ion-label>
                  <h2>Late Penalty</h2>
                  <p><span class="highlight">0 S'mores</span> penalty to a chore that is not completed on time.</p>
                </ion-label>
                <ion-toggle
                  disabled
                  v-model="choreSettings.latePenalty"
                ></ion-toggle>
              </ion-item>

              <!-- Automatic S'mores Allocation -->
              <ion-item class="premium-item">
                <ion-label>
                  <h2>Automatically allocate S'mores</h2>
                  <p>Allocation <span class="highlight">25% Save for goal</span></p>
                </ion-label>
                <ion-toggle
                  disabled
                  v-model="choreSettings.autoAllocate"
                ></ion-toggle>
              </ion-item>
            </ion-card-content>
          </ion-card>

        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./ChoreSettings" />
<style lang="scss" src="./_ChoreSettings.scss" scoped />