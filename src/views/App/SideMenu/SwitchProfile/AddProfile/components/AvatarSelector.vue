<template>
  <ion-popover 
    :is-open="isOpen" 
    @didDismiss="$emit('close')"
    :arrow="false"
    class="avatar-selector"
  >
    <ion-content class="ion-padding">
      <ion-grid>
        <ion-row>
          <ion-col v-for="index in maxAvatarIndex" :key="index" size="3">
            <div 
              class="avatar-option" 
              :class="{ active: index === modelValue }"
              @click="$emit('update:modelValue', index)"
            >
              <img :src="getAvatarSrc(index)" :alt="`Avatar ${index}`" class="w-full h-full object-cover rounded-full" />
            </div>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-popover>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

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
    }
  },
  emits: ['update:modelValue', 'close'],
  setup() {
    const requireAvatar = require.context("@/assets/images/avatars", false, /\.svg$/);
    
    const getAvatarSrc = (index: number) => {
      const paddedIndex = index.toString().padStart(3, "0");
      return requireAvatar(`./${paddedIndex}-gamer.svg`);
    };

    return {
      getAvatarSrc
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
  }
}
</style>