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
          >Confirm</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="bg-slide ion-padding">
      <ion-grid>
        <ion-row class="sticky top-0 z-10 bg-white ion-padding selected-avatar-container" v-if="selectedAvatar">
          <ion-col size="6" offset="3" class="text-center">
            <h4 class="mb-2">Selected Avatar</h4>
            <ion-img
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
            class="p-1"
          >
            <div 
              @click="selectAvatar(i)"
              class="avatar-item"
              :class="{'selected-item': selectedAvatar === i}"
            >
              <ion-img
                :src="getAvatarImage(i)"
                class="avatar-option"
              />
            </div>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { modalController } from '@ionic/vue';

export default defineComponent({
  name: 'AvatarSelect',
  props: {
    avatar: {
      type: Number,
      default: 0
    }
  },
  setup(props) {
    const nAvatars = 40;
    const selectedAvatar = ref(props.avatar || 0);

    const getAvatarImage = (id: number) => {
      return require(`@/assets/images/beasts/${id}.png`);
    };

    const selectAvatar = (id: number) => {
      selectedAvatar.value = id;
    };

    const cancel = () => {
      modalController.dismiss();
    };

    const confirm = () => {
      modalController.dismiss(selectedAvatar.value);
    };

    return {
      nAvatars,
      selectedAvatar,
      getAvatarImage,
      selectAvatar,
      cancel,
      confirm
    };
  }
});
</script> 

<style lang="scss" scoped>
.avatar-select-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

ion-content {
  flex: 1;
}

.selected-avatar-container {
  background: #f8f8f8;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  margin-bottom: 10px;
}

.selected-avatar {
  max-width: 120px;
  margin: 0 auto;
  border-radius: 8px;
  border: 2px solid var(--ion-color-primary);
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