<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/game-master/accessories" />
        </ion-buttons>
        <ion-title>
          Add Accessory
        </ion-title>
      </ion-toolbar>
      <ion-segment v-model="activeSegment">
        <ion-segment-button v-for="segment in segments" :key="segment.name" :value="segment.name.toLowerCase()">
          {{ segment.name }}
          <i class="fad fa-lg mt-1" :class="segment.icon"></i>
        </ion-segment-button>
      </ion-segment>
    </ion-header>
    <ion-content v-if="activeSegment === 'label'">
      <ion-card>
        <ion-card-content>
          This is where you can manage all rewards/accessories.
          This is also a good place to add any items that have a
          real life monetary value.
        </ion-card-content>
      </ion-card>
      <ion-list>
        <ion-item>
          <ion-label>
            Name Reward/Accessory
          </ion-label>
          <ion-input v-model="updateAccessory.name" />
        </ion-item>
        <ion-item>
          <ion-label>
            Reward URL
          </ion-label>
          <ion-input v-model="updateAccessory.url" slot="end" placeholder="https://{URL Link to Amazon, Target, etc.}" />
        </ion-item>
        <ion-item>
          <ion-label>
            Description
          </ion-label>
          <ion-textarea v-model="updateAccessory.description" />

        </ion-item>

      </ion-list>
    </ion-content>
    <ion-content v-else-if="activeSegment === 'sale'">
      <ion-list>

        <ion-item lines="none">
          <ion-label>
            Required ₲P
          </ion-label>
          <ion-input v-if="isPenalty" v-model="updateAccessory.basePrice" type="number" :max="0" slot="end"
            class="ion-text-right" />
          <ion-input v-else v-model="updateAccessory.basePrice" type="number" :min="0" slot="end"
            class="ion-text-right" />
        </ion-item>
        <ion-segment v-model="updateAccessory.basePrice" mode="ios">
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
        <ion-item>
          <i class="fad fa-clipboard-check fa-2x w-10 mx-2" slot="start" />
          <ion-label>
            Requires Approval
            <p>
              Should this achievement require approval before <br />
              any points are awarded?
            </p>
          </ion-label>
          <ion-checkbox v-model="updateAccessory.requiresApproval" slot="end" />
        </ion-item>
        <ion-item>
          <i class="fad fa-piggy-bank fa-2x w-10 mx-2" slot="start" />
          <ion-label>
            Need to save to claim this accessory
            <p>
              Turn this ON, if you want members to be able to <br />
              save towards this accessory.
            </p>
          </ion-label>
          <ion-checkbox v-model="updateAccessory.isLayaway" slot="end" />
        </ion-item>

      </ion-list>
    </ion-content>
    <ion-content v-else-if="activeSegment === 'heros'">
      <ion-list>
        <ion-card>
          <ion-label>
            Choose the heros who are able to claim this accessory
          </ion-label>
        </ion-card>
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
          <ion-checkbox slot="end" :checked="updateAccessory.availableToMembers.includes(user.id)"
            @ionChange="toggleMember(user.id)">
            import { mapGetters } from "vuex";
          </ion-checkbox>
        </ion-item>
      </ion-list>

    </ion-content>
    <ion-footer>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="$router.go(-1)">
            <i class="fad fa-times fa-lg mr-2" />
            Cancel
          </ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button @click="clickSave">
            Save
            <i class="fad fa-save fa-lg ml-2" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>
<script lang="ts">
  import { defineComponent, ref } from 'vue';
  import { modalController } from '@ionic/vue';
  import ionic from "@/mixins/ionic";
  import { mapGetters } from "vuex";


  import AccessoriesDb, { Accessory, accessoriesStorage, Rarity } from '@/databases/AccessoriesDb';

  export default defineComponent({
    props: ["id"],
    name: "xp-create-update-accessory",
    mixins: [ionic],
    data() {
      return {
        segments: [{
          name: 'label',
          icon: 'fad fa-tag',

        }, {
          name: 'Sale',
          icon: 'fad fa-store',
        }, {
          name: 'Heros',
          icon: 'fad fa-user-shield',
        }]
      }
    },
    computed: {
      ...mapGetters(['usersAz']),
    },
    methods: {
      async dismiss() {
        await modalController.dismiss();
      },
      clickSave() {
        this.accessoryDb
          .setAccessory(this.updateAccessory)
          .then(() => this.$router.go(-1));
      },
      getNumber(number) {
        return this.isPenalty
          ? number * -1
          : number
      },
      async loadAccessoryById(id: number) {
        const accessory = await this.accessoryDb.getAccessoryById(id);
        console.log(accessory);

        this.updateAccessory = accessory
      }
    },
    mounted() {
      if (this.id)
        this.loadAccessoryById(this.id)
    },
    setup() {
      const accessoryDb = new AccessoriesDb(accessoriesStorage);
      const updateAccessory = ref({
        name: '',
        description: '',
        basePrice: 0,
        url: '',
        availableToMembers: [''],
        requiresApproval: false,
        isLayaway: false,
        rewardCount: 0,
        rarity: Rarity.Common
      })
      const isPenalty = ref(false)

      const toggleMember = (userId) => {
        if (updateAccessory.value.availableToMembers.includes(userId)) {
          updateAccessory.value.availableToMembers = updateAccessory.value.availableToMembers
            .filter(id => id !== userId)
        } else {
          updateAccessory.value.availableToMembers.push(userId)
        }
      }

      const activeSegment = ref('label')

      return {
        accessoryDb,
        activeSegment,
        isPenalty,
        toggleMember,
        updateAccessory
      }
    }
  })
</script>
