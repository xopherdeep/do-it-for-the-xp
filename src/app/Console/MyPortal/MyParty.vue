<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/xp-profile`"></ion-back-button>
        </ion-buttons>
        <ion-title>
          <i class="fab fa-fort-awesome fa-lg" />
          My Party
        </ion-title>
        <ion-buttons slot="end">
          <ion-button @click="openPartySettings">
            <ion-icon
              :icon="settingsOutline"
              slot="icon-only"
            ></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- Tab Segments -->
      <ion-toolbar>
        <ion-segment
          v-model="activeTab"
          color="primary"
          scrollable
        >
          <ion-segment-button value="roster">
            <ion-icon
              :icon="peopleOutline"
              color="primary"
            ></ion-icon>
            <ion-label>Roster</ion-label>
          </ion-segment-button>
          <ion-segment-button value="activity">
            <ion-icon
              :icon="pulseOutline"
              color="success"
            ></ion-icon>
            <ion-label>Activity</ion-label>
          </ion-segment-button>
          <ion-segment-button value="synergies">
            <ion-icon
              :icon="sparklesOutline"
              color="warning"
            ></ion-icon>
            <ion-label>Synergies</ion-label>
          </ion-segment-button>
          <ion-segment-button value="raids">
            <ion-icon
              :icon="flashOutline"
              color="danger"
            ></ion-icon>
            <ion-label>Raids</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content
      :fullscreen="true"
      class="rpg-box bg-slide"
    >
      <!-- Party Stats Summary -->
      <ion-card>
        <ion-card-header>
          <ion-card-subtitle>
            <ion-chip color="success">
              <i class="fad fa-users"></i>
              <ion-label>{{ partyMembers.length }} Members</ion-label>
            </ion-chip>
            <ion-chip color="warning">
              <i class="fad fa-fire"></i>
              <ion-label>{{ partyStreak }} Day Streak</ion-label>
            </ion-chip>
            <ion-chip
              v-if="activeSynergies.length > 0"
              color="tertiary"
            >
              <i class="fad fa-stars"></i>
              <ion-label>{{ activeSynergies.length }} Synergies</ion-label>
            </ion-chip>
          </ion-card-subtitle>
        </ion-card-header>
      </ion-card>

      <!-- ROSTER TAB -->
      <template v-if="activeTab === 'roster'">
        <ion-list>
          <ion-item-group>
            <ion-item-divider>
              <ion-label>
                <i class="fad fa-crown text-yellow-500"></i>
                Party Members
              </ion-label>
              <ion-badge
                slot="end"
                color="primary"
              >{{ onlineCount }} Online</ion-badge>
            </ion-item-divider>

            <ion-item
              v-for="member in partyMembers"
              :key="member.id"
              button
              :detail="true"
              @click="openMemberProfile(member)"
            >
              <ion-avatar slot="start">
                <img
                  :src="getMemberAvatar(member)"
                  :alt="member.name.full"
                />
                <!-- Online indicator -->
                <div
                  class="status-dot"
                  :class="member.isOnline ? 'online' : 'offline'"
                ></div>
              </ion-avatar>

              <ion-label>
                <h2>
                  {{ member.name.nick }}
                  <ion-badge
                    v-if="member.role === 'leader'"
                    color="warning"
                  >
                    <i class="fad fa-crown"></i>
                  </ion-badge>
                </h2>
                <h3>
                  <ion-chip
                    size="small"
                    outline
                  >
                    <i class="fad fa-swords"></i>
                    {{ member.jobClass || 'Adventurer' }}
                  </ion-chip>
                  <ion-chip
                    v-if="member.race"
                    size="small"
                    outline
                    color="medium"
                  >
                    {{ member.race }}
                  </ion-chip>
                </h3>
                <p>
                  <span class="text-success">Lv.{{ member.stats?.level || 1 }}</span>
                  <span class="text-medium"> • </span>
                  <span v-if="member.currentActivity">
                    <i class="fad fa-running"></i> {{ member.currentActivity }}
                  </span>
                  <span
                    v-else
                    class="text-medium"
                  >Idle</span>
                </p>
              </ion-label>

              <!-- Quick Actions -->
              <ion-buttons slot="end">
                <ion-button
                  fill="clear"
                  color="success"
                  @click.stop="cheerMember(member)"
                >
                  <ion-icon :icon="heartOutline"></ion-icon>
                </ion-button>
                <ion-button
                  fill="clear"
                  color="warning"
                  @click.stop="pokeMember(member)"
                >
                  <ion-icon :icon="handRightOutline"></ion-icon>
                </ion-button>
              </ion-buttons>
            </ion-item>
          </ion-item-group>
        </ion-list>

        <!-- Party Roles Legend -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              <i class="fad fa-users-class"></i>
              Party Roles
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-list lines="none">
              <ion-item>
                <ion-chip
                  color="warning"
                  slot="start"
                >
                  <i class="fad fa-crown"></i>
                </ion-chip>
                <ion-label>
                  <h3>Leader</h3>
                  <p>Creates quests, manages party settings</p>
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-chip
                  color="danger"
                  slot="start"
                >
                  <i class="fad fa-medal"></i>
                </ion-chip>
                <ion-label>
                  <h3>Champion</h3>
                  <p>High XP earners who motivate others</p>
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-chip
                  color="success"
                  slot="start"
                >
                  <i class="fad fa-heart"></i>
                </ion-chip>
                <ion-label>
                  <h3>Support</h3>
                  <p>Sends encouragement, helps with reminders</p>
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-chip
                  color="tertiary"
                  slot="start"
                >
                  <i class="fad fa-binoculars"></i>
                </ion-chip>
                <ion-label>
                  <h3>Scout</h3>
                  <p>Discovers new quests/challenges</p>
                </ion-label>
              </ion-item>
            </ion-list>
          </ion-card-content>
        </ion-card>
      </template>

      <!-- ACTIVITY TAB -->
      <template v-if="activeTab === 'activity'">
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              <i class="fad fa-scroll-old"></i>
              Activity Feed
            </ion-card-title>
            <ion-card-subtitle>Recent party achievements</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <ion-list v-if="activityFeed.length > 0">
              <ion-item
                v-for="(activity, index) in activityFeed"
                :key="index"
              >
                <ion-avatar slot="start">
                  <img
                    :src="getMemberAvatar(activity.user)"
                    :alt="activity.user?.name?.nick"
                  />
                </ion-avatar>
                <ion-label>
                  <h2>{{ activity.user?.name?.nick || 'Party Member' }}</h2>
                  <p>
                    <ion-chip
                      size="small"
                      :color="getActivityColor(activity.type)"
                    >
                      <i :class="getActivityIcon(activity.type)"></i>
                    </ion-chip>
                    {{ activity.message }}
                  </p>
                  <p class="text-medium">{{ formatTime(activity.timestamp) }}</p>
                </ion-label>
                <ion-badge
                  slot="end"
                  :color="getActivityColor(activity.type)"
                >
                  {{ activity.xp ? `+${activity.xp} XP` : '' }}
                </ion-badge>
              </ion-item>
            </ion-list>
            <div
              v-else
              class="ion-text-center ion-padding"
            >
              <i class="fad fa-scroll fa-3x text-medium"></i>
              <p>No recent activity</p>
              <ion-button
                fill="outline"
                color="primary"
              >
                Start a Quest Together
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>
      </template>

      <!-- SYNERGIES TAB -->
      <template v-if="activeTab === 'synergies'">
        <!-- Active Synergies -->
        <ion-card v-if="activeSynergies.length > 0">
          <ion-card-header>
            <ion-card-title>
              <i class="fad fa-stars text-warning"></i>
              Active Synergies
            </ion-card-title>
            <ion-card-subtitle>Bonuses from party composition</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <ion-list>
              <ion-item
                v-for="synergy in activeSynergies"
                :key="synergy.name"
              >
                <ion-chip
                  :color="synergy.color || 'tertiary'"
                  slot="start"
                >
                  <i :class="synergy.icon"></i>
                </ion-chip>
                <ion-label>
                  <h2>{{ synergy.name }}</h2>
                  <p>{{ synergy.description }}</p>
                </ion-label>
                <ion-badge
                  slot="end"
                  :color="synergy.color || 'tertiary'"
                >
                  {{ synergy.bonus }}
                </ion-badge>
              </ion-item>
            </ion-list>
          </ion-card-content>
        </ion-card>

        <!-- Available Synergies -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              <i class="fad fa-unlock text-medium"></i>
              Available Synergies
            </ion-card-title>
            <ion-card-subtitle>Complete the requirements to unlock</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <ion-list>
              <ion-item
                v-for="synergy in availableSynergies"
                :key="synergy.name"
              >
                <ion-chip
                  color="medium"
                  slot="start"
                >
                  <i :class="synergy.icon"></i>
                </ion-chip>
                <ion-label>
                  <h2>{{ synergy.name }}</h2>
                  <p>{{ synergy.requirement }}</p>
                </ion-label>
                <ion-badge
                  slot="end"
                  color="medium"
                >
                  {{ synergy.bonus }}
                </ion-badge>
              </ion-item>
            </ion-list>
          </ion-card-content>
        </ion-card>
      </template>

      <!-- RAIDS TAB -->
      <template v-if="activeTab === 'raids'">
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              <i class="fad fa-dungeon text-danger"></i>
              Party Raids
            </ion-card-title>
            <ion-card-subtitle>Cooperative dungeon runs</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <!-- Active Raid (if any) -->
            <ion-list v-if="activeRaid">
              <ion-item-divider>
                <ion-label>Current Raid</ion-label>
              </ion-item-divider>
              <ion-item>
                <ion-chip
                  color="danger"
                  slot="start"
                >
                  <i class="fad fa-fire-alt"></i>
                </ion-chip>
                <ion-label>
                  <h2>{{ activeRaid.name }}</h2>
                  <p>{{ activeRaid.participants }} / {{ partyMembers.length }} participating</p>
                  <ion-progress-bar
                    :value="activeRaid.progress / 100"
                    color="danger"
                  ></ion-progress-bar>
                </ion-label>
                <ion-button
                  slot="end"
                  color="danger"
                  fill="solid"
                >
                  Join
                </ion-button>
              </ion-item>
            </ion-list>

            <!-- Quest Types -->
            <ion-list>
              <ion-item-divider>
                <ion-label>Start a Raid</ion-label>
              </ion-item-divider>

              <ion-item
                button
                @click="startRaid('collective')"
              >
                <ion-chip
                  color="primary"
                  slot="start"
                >
                  <i class="fad fa-users-crown"></i>
                </ion-chip>
                <ion-label>
                  <h2>Collective Quest</h2>
                  <p>Individual contributions add to group total</p>
                </ion-label>
              </ion-item>

              <ion-item
                button
                @click="startRaid('challenge')"
              >
                <ion-chip
                  color="warning"
                  slot="start"
                >
                  <i class="fad fa-trophy"></i>
                </ion-chip>
                <ion-label>
                  <h2>Challenge Quest</h2>
                  <p>Friendly competition within party</p>
                </ion-label>
              </ion-item>

              <ion-item
                button
                @click="startRaid('boss')"
              >
                <ion-chip
                  color="danger"
                  slot="start"
                >
                  <i class="fad fa-dragon"></i>
                </ion-chip>
                <ion-label>
                  <h2>Boss Raid</h2>
                  <p>Major life goal tackled as a team</p>
                </ion-label>
              </ion-item>

              <ion-item
                button
                @click="startRaid('relay')"
              >
                <ion-chip
                  color="success"
                  slot="start"
                >
                  <i class="fad fa-route"></i>
                </ion-chip>
                <ion-label>
                  <h2>Relay Quest</h2>
                  <p>Tasks pass between members in sequence</p>
                </ion-label>
              </ion-item>
            </ion-list>
          </ion-card-content>
        </ion-card>

        <!-- Party Accountability -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              <i class="fad fa-handshake text-success"></i>
              Accountability
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-list lines="none">
              <ion-item
                button
                @click="requestBodyDouble"
              >
                <ion-chip
                  color="primary"
                  slot="start"
                >
                  <i class="fad fa-user-friends"></i>
                </ion-chip>
                <ion-label>
                  <h2>Body Double</h2>
                  <p>Request someone stay online while you work</p>
                </ion-label>
              </ion-item>
              <ion-item
                button
                @click="sendCheckIn"
              >
                <ion-chip
                  color="tertiary"
                  slot="start"
                >
                  <i class="fad fa-comment-alt-smile"></i>
                </ion-chip>
                <ion-label>
                  <h2>Check-In</h2>
                  <p>Ask how party members are doing</p>
                </ion-label>
              </ion-item>
            </ion-list>
          </ion-card-content>
        </ion-card>
      </template>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent, ref, computed } from "vue";
  import { useUserStore } from "@/lib/store/stores/user";
  import debug from "@/lib/utils/debug";
  import { useRouter } from 'vue-router';
  import { toastController } from '@ionic/vue';
import {
    peopleOutline,
    pulseOutline,
  sparklesOutline,
    flashOutline,
    settingsOutline,
    heartOutline,
    handRightOutline,
  } from "ionicons/icons";
  import ionic from "@/mixins/ionic";
  import appConfig from "@/app.config";

  interface PartyMember {
    id: string;
    name: { full: string; nick: string };
    avatar?: string;
    jobClass?: string;
    race?: string;
    role?: string;
    isOnline?: boolean;
    currentActivity?: string;
    stats?: { level: number; hp: any; mp: any; xp: any };
  }

  interface ActivityItem {
    user: PartyMember;
    type: string;
    message: string;
    timestamp: Date;
    xp?: number;
  }

  interface Synergy {
    name: string;
    description: string;
    requirement?: string;
    bonus: string;
    icon: string;
    color?: string;
  }

  export default defineComponent({
    name: "my-party",
  mixins: [ionic as any],
  setup() {
    const userStore = useUserStore();
    const router = useRouter();
    const activeTab = ref('roster');

    // Party members from store
    const partyMembers = computed<PartyMember[]>(() => {
      return userStore.usersAz.map((user: any) => ({
        ...user,
        isOnline: Math.random() > 0.5, // Simulated - replace with real presence
        currentActivity: Math.random() > 0.7 ? 'Completing a quest' : null,
        role: user.isAdmin ? 'leader' : 'member',
      }));
    });

    const onlineCount = computed(() =>
      partyMembers.value.filter(m => m.isOnline).length
    );

    const partyStreak = ref(7); // Days the entire party has been active

    // Activity feed (simulated - replace with real data)
    const activityFeed = ref<ActivityItem[]>([
      {
        user: partyMembers.value[0],
        type: 'quest_complete',
        message: 'Completed "Morning Routine"',
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        xp: 50,
      },
      {
        user: partyMembers.value[1] || partyMembers.value[0],
        type: 'level_up',
        message: 'Reached Level 15!',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        xp: 100,
      },
    ]);

    // Active synergies based on party composition
    const activeSynergies = ref<Synergy[]>([
      {
        name: 'Dynamic Duo',
        description: 'Exactly 2 members - focused teamwork!',
        bonus: '+50% XP',
        icon: 'fad fa-user-friends',
        color: 'primary',
      },
    ]);

    // Available synergies to unlock
    const availableSynergies = ref<Synergy[]>([
      {
        name: 'Balanced Party',
        description: 'A well-rounded team ready for anything',
        requirement: '1 Tank + 1 Healer + 1 DPS',
        bonus: '+15% XP',
        icon: 'fad fa-users-class',
      },
      {
        name: 'Warrior\'s Bond',
        description: 'Strength in numbers',
        requirement: '2+ Warriors in party',
        bonus: '+20% STR',
        icon: 'fad fa-swords',
      },
      {
        name: 'Mage Circle',
        description: 'Arcane resonance',
        requirement: '2+ Mages in party',
        bonus: '+30% MP Regen',
        icon: 'fad fa-hat-wizard',
      },
      {
        name: 'Full House',
        description: 'Maximum party size bonus',
        requirement: '4+ members active',
        bonus: '+25% All',
        icon: 'fad fa-home-heart',
      },
    ]);

    // Active raid (if any)
    const activeRaid = ref<{ name: string; participants: number; progress: number } | null>(null);

    // Methods
    const getMemberAvatar = (member: PartyMember) => {
      return appConfig.$getUserAvatar(member);
    };

    const getActivityColor = (type: string) => {
      const colors: Record<string, string> = {
        quest_complete: 'success',
        level_up: 'warning',
        achievement: 'tertiary',
        cheer: 'danger',
      };
      return colors[type] || 'primary';
    };

    const getActivityIcon = (type: string) => {
      const icons: Record<string, string> = {
        quest_complete: 'fad fa-check-circle',
        level_up: 'fad fa-arrow-up',
        achievement: 'fad fa-trophy',
        cheer: 'fad fa-heart',
      };
      return icons[type] || 'fad fa-star';
    };

    const formatTime = (date: Date) => {
      const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      return `${Math.floor(hours / 24)}d ago`;
    };

    const showToast = async (message: string, color = 'success') => {
      const toast = await toastController.create({
        message,
        duration: 2000,
        position: 'bottom',
        color,
      });
      await toast.present();
    };

    const cheerMember = (member: PartyMember) => {
      showToast(`💚 Sent encouragement to ${member.name.nick}!`);
    };

    const pokeMember = (member: PartyMember) => {
      showToast(`👋 Nudged ${member.name.nick}!`, 'warning');
    };

    const openMemberProfile = (member: PartyMember) => {
      debug.log('Open profile for', member.name.nick);
    };

    const openPartySettings = () => {
      router.push('/xp-settings/party-settings');
    };

    const startRaid = (type: string) => {
      showToast(`🎮 Starting ${type} raid...`, 'primary');
    };

    const requestBodyDouble = () => {
      showToast('🤝 Body double request sent to party!', 'tertiary');
    };

    const sendCheckIn = () => {
      showToast('💬 Check-in sent to party!', 'primary');
    };

    return {
      // Icons
      peopleOutline,
      pulseOutline,
      sparklesOutline,
      flashOutline,
      settingsOutline,
      heartOutline,
      handRightOutline,
      // State
      activeTab,
      partyMembers,
      onlineCount,
      partyStreak,
      activityFeed,
      activeSynergies,
      availableSynergies,
      activeRaid,
      // Methods
      getMemberAvatar,
      getActivityColor,
      getActivityIcon,
      formatTime,
      cheerMember,
      pokeMember,
      openMemberProfile,
      openPartySettings,
      startRaid,
      requestBodyDouble,
      sendCheckIn,
    };
  },
});
</script>

<style scoped lang="scss">
  // Minimal custom styles using CSS variables for theme compatibility

  // Online/offline status indicator
  .status-dot {
 
  position: absolute;
    bottom: 2px;
    right: 2px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid var(--ion-background-color);

    &.online {
      background-color: var(--ion-color-success);
    }

    &.offline {
      background-color: var(--ion-color-medium);
    }
  }

  // Avatar positioning fix
  ion-avatar {
    position: relative;
  }

  // Chip spacing
  ion-chip {
    margin: 0 4px 4px 0;

    i {
      margin-right: 4px;
    }
  }

  // Text utilities using Ionic colors
  .text-success {
    color: var(--ion-color-success);
 
}

  .text-warning {
    color: var(--ion-color-warning);
 
}

  .text-medium {
    color: var(--ion-color-medium);
 
}

  // Card header chips layout
  ion-card-subtitle {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
 
}
</style>
