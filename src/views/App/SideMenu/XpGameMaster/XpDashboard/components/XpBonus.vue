<template>
  <ion-header>
    <ion-toolbar class="rpg-box">
      <ion-title>
        Add Bonus
      </ion-title>
      <ion-buttons slot="start">
        <ion-button @click="dismiss">
          <i class="fad fa-arrow-left fa-3x"></i>

        </ion-button>
      </ion-buttons>
      <ion-buttons slot="end">
        <ion-button
          @click="clickAward"
          :disabled="members.length === 0 || gPoints === 0"
        >
          <i class="fad fa-trophy fa-3x"></i>
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
                <i class="fad fa-medal fa-3x ion-float-right"></i>
                <h1>
                  Select Family Member
                </h1>
              </ion-card-title>
            </ion-card-header>

            <ion-list>
              <ion-item
                v-for="user in usersAz"
                :key="user.id"
              >

                <ion-checkbox
                  slot="end"
                  :checked="members.includes(user.id)"
                  @ionChange="toggleMember(user.id)"
                >
                </ion-checkbox>
                <ion-avatar slot="start">
                  <img :src="getUserAvatar(user)" />
                </ion-avatar>
                {{ user.name.full }}
              </ion-item>
            </ion-list>
          </ion-card>
          <ion-card>
            <ion-card-header>
              <ion-card-title>
                <i class="fad fa-coins fa-3x ion-float-right"></i>
                <h1>
                  Amount of GP to Award
                </h1>
              </ion-card-title>
            </ion-card-header>

            <ion-radio-group
              v-model="gPoints"
              @ionChange="onRadioChange"
            >
              <ion-list>

                <ion-grid class="ion-no-padding">
                  <ion-row>
                    <ion-col>
                      <ion-item>
                        <ion-label position="stacked">
                          ₲P
                        </ion-label>
                        <ion-input
                          v-model="gPoints"
                          type="number"
                        />
                      </ion-item>
                    </ion-col>
                  </ion-row>
                  <ion-row>

                    <ion-col>
                      <ion-item>
                        <ion-label>
                          <xp-gp gp="1" />
                        </ion-label>
                        <ion-radio value="1" />
                      </ion-item>
                    </ion-col>
                    <ion-col>
                      <ion-item>
                        <ion-label>
                          <xp-gp gp="10" />
                        </ion-label>
                        <ion-radio value="10" />
                      </ion-item>
                    </ion-col>
                    <ion-col>
                      <ion-item>
                        <ion-label>
                          <xp-gp gp="50" />
                        </ion-label>
                        <ion-radio value="50" />
                      </ion-item>
                    </ion-col>
                    <ion-col>
                      <ion-item>
                        <ion-label>
                          <xp-gp gp="100" />
                        </ion-label>
                        <ion-radio value="100" />
                      </ion-item>
                    </ion-col>
                  </ion-row>
                </ion-grid>
              </ion-list>
            </ion-radio-group>
          </ion-card>
          <ion-card>
            <ion-card-header>
              <ion-card-title>
                <i class="fad fa-pencil fa-2x ion-float-right"></i>
                <h1>
                  Notes
                </h1>
              </ion-card-title>
              <ion-card-content>
                <ion-textarea>

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

  import XpGp from "@/components/XpGp/XpGp.vue";

  export const XpBonus = defineComponent({

    mixins: [ionic],
    components: {
      XpGp
    },
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
            this.profileDb.showSuccessToast("Bonus Awarded")
            this.dismiss()
          })
        })
      },
      onRadioChange(val) {
        // console.log("onRadioChange", val);
      },
      getUserAvatar(user) {
        return this.$requireAvatar(`./${user.avatar}.svg`)
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
