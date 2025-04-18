<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/game-master/accessories" />
        </ion-buttons>
        <ion-title>{{ id ? 'Update' : 'Create' }} Accessory</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment v-model="activeSegment">
          <ion-segment-button v-for="segment in segments" :key="segment.name" :value="segment.name">
            <i :class="segment.icon" />
            {{ segment.name }}
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list v-if="activeSegment === 'label'">
        <ion-item>
          <ion-label position="stacked">Type</ion-label>
          <ion-select v-model="updateAccessory.type">
            <ion-select-option :value="AccessoryType.RealLife">Real Life</ion-select-option>
            <ion-select-option :value="AccessoryType.Virtual">Virtual (In-Game)</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item>
          <ion-label position="stacked">Name</ion-label>
          <ion-input v-model="updateAccessory.name" />
        </ion-item>
        <ion-item>
          <ion-label position="stacked">Description</ion-label>
          <ion-textarea v-model="updateAccessory.description" />
        </ion-item>
        <ion-item>
          <ion-label position="stacked">Base Price (GP)</ion-label>
          <ion-input type="number" v-model="updateAccessory.basePrice" />
        </ion-item>
        <ion-item>
          <ion-label position="stacked">URL</ion-label>
          <ion-input v-model="updateAccessory.url" />
        </ion-item>
        <ion-item>
          <ion-label position="stacked">Image URL</ion-label>
          <ion-input v-model="updateAccessory.imageUrl" />
        </ion-item>
        <ion-item>
          <ion-label position="stacked">Rarity</ion-label>
          <ion-select v-model="updateAccessory.rarity">
            <ion-select-option :value="Rarity.Common">Common</ion-select-option>
            <ion-select-option :value="Rarity.Uncommon">Uncommon</ion-select-option>
            <ion-select-option :value="Rarity.Rare">Rare</ion-select-option>
            <ion-select-option :value="Rarity.Legendary">Legendary</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item>
          <ion-label position="stacked">Tags (comma separated)</ion-label>
          <ion-input v-model="tagsInput" @ionChange="updateTags" placeholder="e.g. clothing, book, digital" />
        </ion-item>
        <ion-item v-if="updateAccessory.tags && updateAccessory.tags.length > 0">
          <ion-chip v-for="tag in updateAccessory.tags" :key="tag" @click="removeTag(tag)">
            <ion-label>{{ tag }}</ion-label>
            <ion-icon name="close-circle"></ion-icon>
          </ion-chip>
        </ion-item>
      </ion-list>

      <ion-list v-if="activeSegment === 'Inventory'">
        <ion-item>
          <ion-label position="stacked">Total Inventory</ion-label>
          <ion-input type="number" v-model="updateAccessory.inventory.total" />
        </ion-item>
        <ion-item>
          <ion-label position="stacked">Available Inventory</ion-label>
          <ion-input type="number" v-model="updateAccessory.inventory.available" />
        </ion-item>
        <ion-item>
          <ion-label position="stacked">Reserved Inventory</ion-label>
          <ion-input type="number" v-model="updateAccessory.inventory.reserved" />
        </ion-item>
        <ion-item>
          <ion-label position="stacked">Expiry Date (if applicable)</ion-label>
          <ion-datetime v-model="updateAccessory.expiryDate" display-format="MMM DD, YYYY"></ion-datetime>
        </ion-item>
      </ion-list>

      <ion-list v-if="activeSegment === 'Sale'">
        <ion-item>
          <ion-checkbox v-model="updateAccessory.isLayaway">Layaway Option</ion-checkbox>
        </ion-item>
        <ion-item>
          <ion-checkbox v-model="updateAccessory.requiresApproval">Requires Approval</ion-checkbox>
        </ion-item>
        <ion-item v-if="updateAccessory.type === AccessoryType.Virtual">
          <ion-label position="stacked">Bonus Stats (for Virtual Items)</ion-label>
        </ion-item>
        <ion-item v-if="updateAccessory.type === AccessoryType.Virtual">
          <ion-label position="fixed">HP</ion-label>
          <ion-input type="number" v-model="updateAccessory.bonusStats.hp" />
        </ion-item>
        <ion-item v-if="updateAccessory.type === AccessoryType.Virtual">
          <ion-label position="fixed">MP</ion-label>
          <ion-input type="number" v-model="updateAccessory.bonusStats.mp" />
        </ion-item>
        <ion-item v-if="updateAccessory.type === AccessoryType.Virtual">
          <ion-label position="fixed">Attack</ion-label>
          <ion-input type="number" v-model="updateAccessory.bonusStats.attack" />
        </ion-item>
        <ion-item v-if="updateAccessory.type === AccessoryType.Virtual">
          <ion-label position="fixed">Defense</ion-label>
          <ion-input type="number" v-model="updateAccessory.bonusStats.defense" />
        </ion-item>
        <ion-item v-if="updateAccessory.type === AccessoryType.Virtual">
          <ion-label position="fixed">Speed</ion-label>
          <ion-input type="number" v-model="updateAccessory.bonusStats.speed" />
        </ion-item>
      </ion-list>

      <ion-list v-if="activeSegment === 'Heros'">
        <ion-list-header>Available to these members</ion-list-header>
        <ion-item v-for="user in usersAz" :key="user.id">
          <ion-checkbox slot="start" :checked="updateAccessory.availableToMembers.includes(user.id)"
            @click="toggleMember(user.id)" />
          <ion-label>{{ user.displayName }}</ion-label>
        </ion-item>
      </ion-list>

      <ion-list v-if="activeSegment === 'Purchase History'" v-show="updateAccessory.purchaseHistory && updateAccessory.purchaseHistory.length > 0">
        <ion-list-header>Purchase History</ion-list-header>
        <ion-item v-for="(purchase, index) in updateAccessory.purchaseHistory" :key="index">
          <ion-label>
            <h2>{{ getUserName(purchase.userId) }}</h2>
            <p>Date: {{ formatDate(purchase.purchaseDate) }}</p>
            <p>Quantity: {{ purchase.amount }}</p>
          </ion-label>
        </ion-item>
        <ion-item v-if="!updateAccessory.purchaseHistory || updateAccessory.purchaseHistory.length === 0">
          <ion-label>No purchase history yet</ion-label>
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

  import AccessoriesDb, { Accessory, accessoriesStorage, Rarity, AccessoryType } from '@/databases/AccessoriesDb';

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
        rarity: Rarity.Common,
        type: AccessoryType.Virtual,
        inventory: {
          total: 0,
          available: 0,
          reserved: 0
        },
        tags: [] as string[],
        bonusStats: {}
      })
      const isPenalty = ref(false)
      const tagsInput = ref('')

      const toggleMember = (userId) => {
        if (updateAccessory.value.availableToMembers.includes(userId)) {
          updateAccessory.value.availableToMembers = updateAccessory.value.availableToMembers
            .filter(id => id !== userId)
        } else {
          updateAccessory.value.availableToMembers.push(userId)
        }
      }

      const updateTags = () => {
        if (tagsInput.value) {
          const tags = tagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
          updateAccessory.value.tags = tags;
        }
      }

      const removeTag = (tagToRemove) => {
        updateAccessory.value.tags = updateAccessory.value.tags.filter(tag => tag !== tagToRemove);
        // Update the tags input field to match
        tagsInput.value = updateAccessory.value.tags.join(', ');
      }

      const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
      }

      const getUserName = (userId) => {
        // This would normally pull from your user store
        return userId || 'Unknown User';
      }

      const activeSegment = ref('label')

      return {
        accessoryDb,
        activeSegment,
        isPenalty,
        toggleMember,
        updateAccessory,
        tagsInput,
        updateTags,
        removeTag,
        formatDate,
        getUserName,
        AccessoryType,
        Rarity
      }
    }
  })
</script>
