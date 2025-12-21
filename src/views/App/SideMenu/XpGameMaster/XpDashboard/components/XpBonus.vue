<template>
  <ion-header>
    <ion-toolbar class="rpg-box">
      <ion-title v-if="isPenalty">
        Take away Points
      </ion-title>
      <ion-title v-else>
        Add Bonus
      </ion-title>
      <ion-buttons slot="start">
        <ion-back-button
          default-href="/xp-dashboard"
          @click="dismiss"
        />

        <!-- <ion-button @click="dismiss">
          <i class="fad fa-arrow-left fa-3x"></i>
        </ion-button> -->
      </ion-buttons>
      <ion-buttons slot="end">
        <ion-button
          v-if="isPenalty"
          @click="clickAward"
          :disabled="members.length === 0 || gPoints === 0"
        >
          <i class="fad fa-minus-circle fa-2x mr-2"></i>
          Subtract Points
        </ion-button>
        <ion-button
          v-else
          @click="clickAward"
          :disabled="members.length === 0 || (gPoints === 0 && xpPoints === 0 && apPoints === 0)"
        >
          <i class="fad fa-gift fa-2x mr-2"></i>
          Award Points
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
  <ion-content class="bg-slide">
    <ion-grid class="md:max-w-[650px]">
      <ion-row>
        <ion-col>
          <ion-card class="ion-margin-bottom">
            <!-- <ion-card-header>
              <ion-card-title>
                <i
                  class="fad fa-2x ion-float-right"
                  :class="isPenalty ? 'fa-minus-circle' : 'fa-gift'"
                ></i>
                <h1>
                  {{ isPenalty ? 'Take Away Points' : 'Add Bonus' }}
                </h1>
              </ion-card-title>
            </ion-card-header> -->

            <!-- Main Tab Navigation -->
            <ion-segment
              v-model="activeTab"
              mode="ios"
              class="ion-padding icon-colors"
            >
              <ion-segment-button value="members">
                <i class="fad fa-users fa-3x" />
                <ion-label>Who</ion-label>
              </ion-segment-button>
              <ion-segment-button value="points">
                <i class="fad fa-hand-holding fa-3x" />
                <ion-label>Points</ion-label>
              </ion-segment-button>
              <ion-segment-button value="notes">
                <i class="fad fa-sticky-note fa-3x" />
                <ion-label>Notes</ion-label>
              </ion-segment-button>
            </ion-segment>

            <ion-card-content>
              <!-- Members Tab Content -->
              <div v-show="activeTab === 'members'">
                <ion-list>
                  <ion-item
                    v-for="user in usersAz"
                    :key="user.id"
                  >
                    <ion-avatar slot="start">
                      <ion-img :src="$getUserAvatar(user)" />
                    </ion-avatar>
                    <ion-label>
                      {{ user.name.nick }}
                      <p>
                        {{ user.name.first }}
                      </p>
                    </ion-label>
                    <ion-checkbox
                      slot="end"
                      :checked="members.includes(user.id)"
                      @ionChange="toggleMember(user.id)"
                    >
                    </ion-checkbox>
                  </ion-item>
                </ion-list>
              </div>

              <!-- Points Tab Content -->
              <div v-show="activeTab === 'points'">
                <!-- Point Type Tabs -->
                <ion-segment
                  v-model="activePointType"
                  mode="ios"
                  class="ion-padding icon-colors"
                >
                  <ion-segment-button value="gp">

                    <ion-label class="overflow-visible">
                      <i class="fad fa-hand-holding-usd" />
                      ₲P
                    </ion-label>
                  </ion-segment-button>
                  <ion-segment-button
                    v-if="!isPenalty"
                    value="xp"
                  >


                    <ion-label>
                      <i class="fad fa-hand-holding-seedling" /> XP
                    </ion-label>
                  </ion-segment-button>
                  <ion-segment-button
                    v-if="!isPenalty"
                    value="ap"
                  >
                    <ion-label>
                      <i class="fad fa-hand-holding-magic" />
                      AP
                    </ion-label>
                  </ion-segment-button>
                </ion-segment>

                <!-- GP Content -->
                <div v-show="activePointType === 'gp'">
                  <ion-list>
                    <ion-item lines="none">
                      <ion-label position="floating">
                        ₲P
                      </ion-label>
                      <ion-input
                        v-if="isPenalty"
                        v-model="gPoints"
                        type="number"
                        :max="0"
                      />
                      <ion-input
                        v-else
                        v-model="gPoints"
                        type="number"
                        :min="0"
                      />
                    </ion-item>
                  </ion-list>
                  <ion-segment
                    v-model="gPoints"
                    mode="ios"
                  >
                    <ion-segment-button value="0">
                      Custom
                    </ion-segment-button>
                    <ion-segment-button :value="getNumber(1)">
                      <xp-gp :gp="getNumber(1)" />
                    </ion-segment-button>
                    <ion-segment-button :value="getNumber(10)">
                      <xp-gp :gp="getNumber(10)" />
                    </ion-segment-button>
                    <ion-segment-button :value="getNumber(50)">
                      <xp-gp :gp="getNumber(50)" />
                    </ion-segment-button>
                    <ion-segment-button :value="getNumber(100)">
                      <xp-gp :gp="getNumber(100)" />
                    </ion-segment-button>
                  </ion-segment>
                </div>

                <!-- XP Content -->
                <div v-show="activePointType === 'xp' && !isPenalty">
                  <ion-list>
                    <ion-item lines="none">
                      <ion-label position="floating">
                        XP
                      </ion-label>
                      <ion-input
                        v-model="xpPoints"
                        type="number"
                        :min="0"
                      />
                    </ion-item>
                  </ion-list>
                  <ion-segment
                    v-model="xpPoints"
                    mode="ios"
                  >
                    <ion-segment-button value="0">
                      Custom
                    </ion-segment-button>
                    <ion-segment-button :value="1">
                      1 XP
                    </ion-segment-button>
                    <ion-segment-button :value="5">
                      5 XP
                    </ion-segment-button>
                    <ion-segment-button :value="10">
                      10 XP
                    </ion-segment-button>
                    <ion-segment-button :value="20">
                      20 XP
                    </ion-segment-button>
                  </ion-segment>
                </div>

                <!-- AP Content -->
                <div v-show="activePointType === 'ap' && !isPenalty">
                  <ion-list>
                    <ion-item lines="none">
                      <ion-label position="floating">
                        AP
                      </ion-label>
                      <ion-input
                        v-model="apPoints"
                        type="number"
                        :min="0"
                      />
                    </ion-item>
                  </ion-list>
                  <ion-segment
                    v-model="apPoints"
                    mode="ios"
                  >
                    <ion-segment-button value="0">
                      Custom
                    </ion-segment-button>
                    <ion-segment-button :value="1">
                      1 AP
                    </ion-segment-button>
                    <ion-segment-button :value="2">
                      2 AP
                    </ion-segment-button>
                    <ion-segment-button :value="5">
                      5 AP
                    </ion-segment-button>
                    <ion-segment-button :value="10">
                      10 AP
                    </ion-segment-button>
                  </ion-segment>
                </div>
              </div>

              <!-- Notes Tab Content -->
              <div v-show="activeTab === 'notes'">
                <ion-textarea
                  class="border border-dashed rounded"
                  rows="10"
                  v-model="notes"
                  placeholder="Enter optional note here..."
                >
                </ion-textarea>
              </div>
            </ion-card-content>

            <ion-footer class="ion-padding">
              <ion-button
                expand="block"
                v-if="isPenalty"
                @click="clickAward"
                :disabled="members.length === 0 || gPoints === 0"
              >
                <i class="fad fa-minus-circle mr-2"></i>
                Subtract Points
              </ion-button>
              <ion-button
                expand="block"
                v-else
                @click="clickAward"
                :disabled="members.length === 0 || (gPoints === 0 && xpPoints === 0 && apPoints === 0)"
              >
                <i class="fad fa-gift mr-2"></i>
                Award Points
              </ion-button>
            </ion-footer>
          </ion-card>
        </ion-col>
      </ion-row>
    </ion-grid>
  </ion-content>
</template>
<script lang="ts">
import { modalController } from '@ionic/vue';
import { defineComponent } from 'vue';
  import { useUserStore } from '@/lib/store/stores/user';

import ionic from '@/mixins/ionic';
import { ProfileDb } from '@/lib/databases';
import { profileStorage } from '../../../SwitchProfile/SwitchProfile.vue';

export default defineComponent({
  props: {
    isPenalty: {
      type: Boolean,
      default: false
    }
  },

  mixins: [ionic],
  computed: {
    users() { return (this as any).userStore.users },
    usersAz() { return (this as any).userStore.usersAz },
  },
  data() {
    return {
      gPoints: 0,
      xpPoints: 0,
      apPoints: 0,
      members: [] as string[],
      notes: '',
      activePointType: 'gp',
      activeTab: 'members',
      profileDb: new ProfileDb(profileStorage)
    }
  },
  setup() {
    const userStore = useUserStore();
    return {
      userStore
    }
  },
  methods: {
    clickAward() {
      this.members.forEach(async (id: any) => {
        const profile = this.users[id];

        // Update GP for both bonus and penalty
        const { wallet } = profile.stats.gp;
        profile.stats.gp.wallet = Math.round(Number(wallet) + Number(this.gPoints));

        // Only update XP and AP in bonus mode (not penalty)
        if (!this.isPenalty) {
          // Update XP if any awarded
          if (Number(this.xpPoints) > 0) {
            const { total } = profile.stats.xp;
            profile.stats.xp.total = Math.round(Number(total) + Number(this.xpPoints));
          }

          // Update AP if any awarded
          if (Number(this.apPoints) > 0) {
            const { total } = profile.stats.ap;
            profile.stats.ap.total = Math.round(Number(total) + Number(this.apPoints));
          }
        }

        await this.profileDb.setProfile(profile).then(() => {
          const message = this.isPenalty ? "Points Subtracted" : "Bonus Awarded";
          this.profileDb.showSuccessToast(message);
          this.dismiss();
        });
      });
    },
    onRadioChange() {
      // console.log("onRadioChange", val);
    },
    getUserAvatar(user: any) {
      return this.$requireAvatar(`./${user.avatar}.svg`);
    },
    getNumber(number: number) {
      return this.isPenalty
        ? number * -1
        : number;
    },
    toggleMember(userId: string) {
      if (this.members.includes(userId)) {
        this.members = this.members.filter(id => id !== userId);
      } else {
        this.members.push(userId);
      }
    },
    dismiss() {
      modalController.dismiss();
    }
  }
});
</script>
