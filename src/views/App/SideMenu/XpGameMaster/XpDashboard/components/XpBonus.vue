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
        <ion-button @click="dismiss">
          <i class="fad fa-arrow-left fa-3x"></i>
        </ion-button>
      </ion-buttons>
      <ion-buttons slot="end">
        <ion-button v-if="isPenalty" @click="clickAward" :disabled="members.length === 0 || gPoints === 0">
          <i class="fad fa-minus-circle fa-3x"></i>
          Subtract Points
        </ion-button>
        <ion-button v-else @click="clickAward" :disabled="members.length === 0 || gPoints === 0">
          <i class="fad fa-gift fa-3x"></i>
          Award Points
        </ion-button>
      </ion-buttons>
    </ion-toolbar>

  </ion-header>
  <ion-content class="bg-slide">
    <ion-grid>
      <ion-row>
        <ion-col>
          <ion-card>
            <ion-card-header>
              <ion-card-title>
                <i class="fad fa-2x ion-float-right" :class="isPenalty ? 'fa-minus-circle' : 'fa-gift'"></i>
                <h1>
                  Select Family Member
                </h1>
              </ion-card-title>
            </ion-card-header>

            <ion-list>
              <ion-item v-for="user in usersAz" :key="user.id">

                <ion-avatar slot="start">
                  <ion-img :src="$getUserAvatar(user)" />
                </ion-avatar>
                <ion-label>
                  {{ user.name.nick }}
                  <p>
                    {{ user.name.first }}
                  </p>
                </ion-label>
                <ion-checkbox slot="end" :checked="members.includes(user.id)" @ionChange="toggleMember(user.id)">
                </ion-checkbox>
              </ion-item>
            </ion-list>
          </ion-card>
          <ion-card>
            <ion-card-header>
              <ion-card-title>
                <i class="fad fa-coins fa-2x ion-float-right"></i>
                <h1 v-if="isPenalty">
                  Amount of GP to Award
                </h1>
                <h1 v-else>
                  Take Away GP
                </h1>
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list>
                <ion-item lines="none">
                  <ion-label position="floating">
                    ₲P
                  </ion-label>
                  <ion-input v-if="isPenalty" v-model="gPoints" type="number" :max="0" />
                  <ion-input v-else v-model="gPoints" type="number" :min="0" />
                </ion-item>
              </ion-list>
              <ion-segment v-model="gPoints" mode="ios">
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
            </ion-card-content>
          </ion-card>
          <ion-card>
            <ion-card-header>
              <ion-card-title>
                <i class="fad fa-pencil fa-2x ion-float-right"></i>
                <h1>
                  Optional Note
                </h1>
              </ion-card-title>
              <ion-card-content class="ion-no-padding">
                <ion-textarea class="border border-dashed rounded" rows="5">

                </ion-textarea>
              </ion-card-content>
            </ion-card-header>
          </ion-card>

        </ion-col>
      </ion-row>
    </ion-grid>
  </ion-content>
</template>
<script lang="ts">
  import { modalController } from '@ionic/vue';
  import { defineComponent, ref, reactive } from 'vue';
  import { mapGetters } from 'vuex';

  import ionic from '@/mixins/ionic';
  import { ProfileDb } from '@/databases';
  import { profileStorage } from '../../../SwitchProfile/SwitchProfile.vue';

  export const XpBonus = defineComponent({
    props: ["isPenalty"],

    mixins: [ionic],
    computed: {
      ...mapGetters(["users", "usersAz"]),
    },
    methods: {
      // ...mapActions([""]),
      clickAward() {
        this.members.forEach(async (id: any) => {
          const profile = this.users[id]
          const { wallet } = profile.stats.gp
          profile.stats.gp.wallet = Math.round(Number(wallet) + Number(this.gPoints))

          await this.profileDb.setProfile(profile).then(() => {
            const message = this.isPenalty ? "Points Subtracted" : "Bonus Awarded"
            this.profileDb.showSuccessToast(message)
            this.dismiss()
          })
        })
      },
      onRadioChange(val) {
        // console.log("onRadioChange", val);
      },
      getUserAvatar(user) {
        return this.$requireAvatar(`./${user.avatar}.svg`)
      },
      getNumber(number) {
        return this.isPenalty
          ? number * -1
          : number
      }
    },

    setup(props, ctx) {
      const gPoints = ref(0)
      const members = ref([] as string[])
      const notes = ref('')
      // const isChecked = (id: string) => {
      //   return this.members.includes(id)
      // }
      const toggleMember = (userId) => {
        if (members.value.includes(userId)) {
          members.value = members.value.filter(id => id !== userId)
        } else {
          members.value.push(userId)
        }
      }

      const profileDb = new ProfileDb(profileStorage);

      return {
        profileDb,
        gPoints,
        members,
        notes,
        dismiss: () => modalController.dismiss(),
        toggleMember
      }


    }
  })

  export default XpBonus
</script>
