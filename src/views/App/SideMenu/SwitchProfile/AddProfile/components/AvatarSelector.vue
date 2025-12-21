<template>
  <ion-popover
    v-if="!fullscreen"
    :is-open="isOpen"
    @didDismiss="$emit('close')"
    :arrow="false"
    class="avatar-selector"
  >
    <ion-content class="ion-padding">
      <ion-grid>
        <ion-row>
          <ion-col
            v-for="index in maxAvatarIndex"
            :key="index"
              class="avatar-option"
              :class="{ active: index === modelValue }"
              @click="selectAvatar(index)"
              size="4"
            >
              <img
                :src="getAvatarSrc(index)"
                :alt="`Avatar ${index}`"
                class="w-full h-full object-cover rounded-full"
              />
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-popover>
  <!-- MODAL -->
  <ion-modal
    v-else
    :is-open="isOpen"
    @didDismiss="$emit('close')"
    class="fullscreen-modal"
  >
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-title>Choose Your Avatar</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('close')">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="rpg-box bg-slide ion-padding flex flex-row justify-center items-center">
      <ion-card class="rpg-box max-w-7xl">
        <ion-grid>
          <ion-row>
            <ion-col
              v-for="index in maxAvatarIndex"
              :key="index"
              size="6"
              size-sm="4"
              size-md="3"
              size-lg="2"
            >
              <div
                class="avatar-option"
                :class="{ active: index === modelValue }"
                @click="selectAvatar(index)"
              >
                <img
                  :src="getAvatarSrc(index)"
                  :alt="`Avatar ${index}`"
                  class="rounded-full avatar-image"
                />
              </div>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-card>
    </ion-content>
  </ion-modal>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { closeOutline } from 'ionicons/icons';

export default defineComponent({
  name: 'AvatarSelector',
  props: {
    isOpen: {
      type: Boolean,
      required: true
    },
    modelValue: {
      type: Number,
      required: true
    },
    maxAvatarIndex: {
      type: Number,
      required: true
    },
    fullscreen: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue', 'close', 'selected'],
  setup(props, { emit }) {
    const requireAvatar = require.context("@/assets/images/avatars", false, /\.svg$/);
    
    const getAvatarSrc = (index: number) => {
      const paddedIndex = index.toString().padStart(3, "0");
      return requireAvatar(`./${paddedIndex}-gamer.svg`);
    };

    const selectAvatar = (index: number) => {
      emit('update:modelValue', index);
      emit('selected', index);
      
      // If fullscreen, automatically close when selecting
      if (props.fullscreen) {
        emit('close');
      }
    };

    return {
      getAvatarSrc,
      selectAvatar,
      closeOutline
    };
  }
});
</script>

<style lang="scss" scoped>
.avatar-selector {
  --width: 360px;
  --max-height: 400px;
}

.avatar-option {
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 9999px;
  transition: all 0.2s ease;
  border: 2px solid transparent;

  &:hover {
    transform: scale(1.05);
  }

  &.active {
    border-color: var(--ion-color-primary);
    background-color: var(--ion-color-primary-tint);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 9999px;
    filter: grayscale(100%);
    transition: filter 0.3s ease;
  }

  &:hover img,
  &.active img {
    filter: grayscale(0%);
  }
}

.fullscreen-modal {
  --width: 100%;
  --height: 100%;
  --border-radius: 0;
  
  ion-grid {
    padding: 1rem;
  }
  
  ion-col {
    padding: 0.5rem;
  }
  
  .avatar-option {
    padding: 0.25rem;
    border: 3px solid transparent;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    
    &:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
    }
    
    &.active {
      border-color: var(--ion-color-primary);
      box-shadow: 0 0 0 3px var(--ion-color-primary-shade);
    }
  }
}
</style>