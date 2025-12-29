<template>
  <div class="avatar-select-container">
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-button @click="cancel">Cancel</ion-button>
        </ion-buttons>
        <ion-title>Choose an Avatar</ion-title>
        <ion-buttons slot="end">
          <ion-button
            :strong="true"
            @click="confirm"
            :disabled="!selectedAvatar"
            >Confirm</ion-button
          >
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="bg-slide ion-padding">
      <ion-grid>
        <ion-row
          v-show="selectedAvatar"
          class="sticky top-0 z-10 bg-white ion-padding selected-avatar-container p-0"
        >
          <ion-col size="12" class="text-center relative">
            <canvas class="avatar-bg" />
            <ion-img
              v-if="selectedAvatar"
              :src="getAvatarImage(selectedAvatar)"
              class="selected-avatar"
            />
          </ion-col>
        </ion-row>
        <ion-row>
          <ion-col
            v-for="i in nAvatars"
            :key="i"
            size="4"
            size-md="2"
            class="p-1"
          >
            <div
              @click="selectAvatar(i)"
              class="avatar-item"
              :class="{ 'selected-item': selectedAvatar === i }"
            >
              <ion-img :src="getAvatarImage(i)" class="avatar-option" />
            </div>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </div>
</template>

<script lang="ts">
  import { defineComponent, ref, onMounted, onUnmounted } from "vue";
  import { modalController } from "@ionic/vue";
  import Ionic from "@/lib/mixins/ionic";
  import { backgroundManager } from "@/lib/engine/core/BackgroundManager";

  // Unique page ID for this component
  const PAGE_ID = "avatar-select";

  export default defineComponent({
    name: "AvatarSelect",
    mixins: [Ionic],
    props: {
      avatar: {
        type: Number,
        default: 0,
      },
    },
    setup(props: { avatar: number; bg1: number; bg2: number }) {
      const nAvatars = 73;
      const selectedAvatar = ref(props.avatar || 0);
      const backgroundInitialized = ref(false);

      const getAvatarImage = (id: number) => {
        const pad = id.toString().padStart(3, "0");
        return require(`@/assets/images/beasts/${pad}.png`);
      };

      const selectAvatar = (id: number) => {
        selectedAvatar.value = id;
        initBackground();
      };

      const cancel = () => {
        modalController.dismiss();
      };

      const confirm = () => {
        modalController.dismiss(selectedAvatar.value);
      };

      const initBackground = () => {
        // Clean up previous background if active
        if (backgroundManager.isActiveFor(PAGE_ID)) {
          backgroundManager.cleanupBackground();
        }

        // Initialize background with canvas selector
        backgroundManager.initBackground({
          canvasSelector: "canvas.avatar-bg",
          bg1: props.bg1,
          bg2: props.bg2,
          aspectRatio: 25, // Full screen
          handleResize: true,
          page: PAGE_ID,
        });

        backgroundInitialized.value = true;
      };

      // Initialize background on component mount
      onMounted(() => {
        initBackground();
      });

      // Clean up background when component unmounts
      onUnmounted(() => {
        if (backgroundManager.isActiveFor(PAGE_ID)) {
          backgroundManager.cleanupBackground();
        }
      });

      return {
        nAvatars,
        selectedAvatar,
        getAvatarImage,
        selectAvatar,
        cancel,
        confirm,
      };
    },
  });
</script>

<style lang="scss" scoped>
  .avatar-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
  }

  .avatar-select-container {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  ion-content {
    flex: 1;
  }

  .selected-avatar-container {
    /* background: #f8f8f8; */
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    margin-bottom: 10px;
    border-radius: 10px;
    overflow: hidden;
    height: 25vh;
  }

  .selected-avatar {
    max-width: 120px;
    margin: 0 auto;
    border-radius: 8px;
    border: 2px solid var(--ion-color-primary);
    position: absolute;
    /* Added position absolute */
    top: 50%;
    /* Center vertically */
    left: 50%;
    /* Center horizontally */
    transform: translate(-50%, -50%);
    /* Adjust for centering */
    z-index: 1;
    /* Ensure it appears above other elements */
  }

  .avatar-item {
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    border: 2px solid transparent;
    transition: all 0.2s ease;

    &:hover {
      transform: scale(1.05);
    }

    &.selected-item {
      border: 2px solid var(--ion-color-primary);
      background: rgba(var(--ion-color-primary-rgb), 0.1);
    }
  }

  .avatar-option {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
</style>
