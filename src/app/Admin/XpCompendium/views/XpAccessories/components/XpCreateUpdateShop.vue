<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button
            defaultHref="/game-master/compendium/economy"
          />
        </ion-buttons>
        <ion-title>{{ id ? "Update" : "Create" }} Shop</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-list>
        <ion-item>
          <ion-icon slot="start" :icon="storefrontOutline" />
          <ion-label position="stacked">Shop Name</ion-label>
          <ion-input
            v-model="shop.name"
            placeholder="e.g. The Magic Emporium"
          />
        </ion-item>

        <ion-item>
          <ion-icon slot="start" :icon="documentTextOutline" />
          <ion-label position="stacked">Description</ion-label>
          <ion-textarea
            v-model="shop.description"
            placeholder="A brief description of the shop..."
            rows="3"
          />
        </ion-item>

        <ion-item>
          <ion-icon slot="start" :icon="globeOutline" />
          <ion-label position="stacked">World / Theme</ion-label>
          <ion-select v-model="shop.world" placeholder="Select World">
            <ion-select-option value="plains">Plains</ion-select-option>
            <ion-select-option value="forest">Forest</ion-select-option>
            <ion-select-option value="mountain">Mountain</ion-select-option>
            <ion-select-option value="desert">Desert</ion-select-option>
            <ion-select-option value="snow">Snow</ion-select-option>
            <ion-select-option value="volcano">Volcano</ion-select-option>
            <ion-select-option value="hometown">Hometown</ion-select-option>
            <ion-select-option value="islands">Islands</ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item>
          <ion-icon slot="start" :icon="personOutline" />
          <ion-label position="stacked">Clerk Name</ion-label>
          <ion-input v-model="shop.clerkName" placeholder="e.g. Marcus" />
        </ion-item>

        <ion-item>
          <div slot="start" class="w-8 flex justify-center">
            <i :class="shop.icon + ' fa-lg'"></i>
          </div>
          <ion-label position="stacked">Icon Class (FontAwesome)</ion-label>
          <ion-input v-model="shop.icon" placeholder="e.g. fad fa-store" />
        </ion-item>
      </ion-list>

      <div class="ion-padding mt-4">
        <ion-button expand="block" @click="saveShop" :disabled="!isValid">
          <ion-icon slot="start" :icon="saveOutline" />
          Save Shop
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent, ref, computed, onMounted } from "vue";
  import { useRouter } from "vue-router";
  import Ionic from "@/lib/mixins/ionic";
  import shopsDb, { ShopInterface } from "@/lib/databases/ShopsDb";
  import {
    storefrontOutline,
    documentTextOutline,
    globeOutline,
    personOutline,
    saveOutline,
  } from "ionicons/icons";

  export default defineComponent({
    name: "XpCreateUpdateShop",
    mixins: [Ionic],
    props: {
      id: {
        type: String,
        default: null,
      },
    },
    setup(props) {
      const router = useRouter();
      const shop = ref<ShopInterface>({
        id: "",
        name: "",
        description: "",
        world: "plains",
        icon: "fad fa-store",
        clerkName: "",
        items: [],
      });

      const isValid = computed(() => {
        return shop.value.name.length > 0;
      });

      onMounted(async () => {
        if (props.id) {
          const existing = await shopsDb.getShopById(props.id);
          if (existing) {
            shop.value = existing;
          }
        }
      });

      const saveShop = async () => {
        await shopsDb.setShop(shop.value);
        router.back();
      };

      return {
        shop,
        isValid,
        saveShop,
        storefrontOutline,
        documentTextOutline,
        globeOutline,
        personOutline,
        saveOutline,
      };
    },
  });
</script>
