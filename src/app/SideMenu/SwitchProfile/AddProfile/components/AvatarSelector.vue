<template>
  <ion-popover v-if="!fullscreen" :is-open="isOpen" @didDismiss="$emit('close')" :arrow="false" class="avatar-selector">
    <ion-content class="ion-padding">
      <ion-grid>
        <ion-row>
          <ion-col v-for="index in maxAvatarIndex" :key="index" class="avatar-option"
            :class="{ active: index === modelValue }" @click="selectAvatar(index)" size="4">
            <img :src="getAvatarSrc(index)" :alt="`Avatar ${index}`" class="w-full h-full object-cover rounded-full" />
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-popover>
  <!-- FULL SCREEN: the Class Codex look. The page only reads and picks; the one big button is in the footer, under the thumb. -->
  <ion-modal v-else :is-open="isOpen" @didDismiss="$emit('close')" class="face-modal">
    <ion-header class="ion-no-border">
      <ion-toolbar class="rpg-box face-toolbar">
        <ion-title>
          <span class="face-title"><i class="fad fa-user-circle mr-2"></i>Pick a face</span>
        </ion-title>
        <ion-buttons slot="end">
          <xp-close-button size="lg" color="light" @click="$emit('close')" />
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="bg-slide bg-slide-equipment face-content">
      <section class="face-section">
        <h3 class="face-heading"><i class="fad fa-hand-pointer"></i> Tap a face</h3>
        <div class="face-body">
          <div class="face-grid" role="group" aria-label="Faces">
            <button v-for="index in maxAvatarIndex" :key="index" type="button" class="face-tile"
              :class="{ 'is-current': index === modelValue }" :aria-pressed="index === modelValue"
              :aria-label="`Face ${index}`" @click="selectAvatar(index)">
              <img :src="getAvatarSrc(index)" alt="" class="face-image" />
              <i v-if="index === modelValue" class="fad fa-check-circle face-check"></i>
            </button>
          </div>
        </div>
      </section>
    </ion-content>

    <ion-footer class="ion-no-border face-footer">
      <div class="face-dock">
        <button type="button" class="face-build" @click="build">
          <i class="fad fa-cube"></i>
          Build my hero in 3D
        </button>
      </div>
    </ion-footer>
  </ion-modal>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import ionic from '@/lib/mixins/ionic';
import XpCloseButton from '@/components/atoms/CloseButton/XpCloseButton.vue';
import { play$fx } from '@/assets/fx';

export default defineComponent({
  name: 'AvatarSelector',
  mixins: [ionic],
  components: { XpCloseButton },
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
  // `build` (full screen only): the hero would rather build a voxel look than pick a portrait
  emits: ['update:modelValue', 'close', 'selected', 'build'],
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

    const build = () => {
      play$fx('select');
      emit('build');
    };

    return {
      getAvatarSrc,
      selectAvatar,
      build
    };
  }
});
</script>

<style lang="scss" scoped>
@use "@/styles/themes/earthbound.scss" as *;

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

/* ---- Full screen: the Class Codex look (app bar with the RPG box, light sections on the sliding checker) ---- */
$body-backing: rgba(20, 6, 28, 0.55);
$divider: rgba(231, 230, 179, 0.25);

.face-modal {
  --width: 100%;
  --height: 100%;
  --max-width: 100%;
  --max-height: 100%;
  --border-radius: 0;
  --background: #{$eb-color-dark-purple};
  --box-shadow: none;
}

// The app bar carries the RPG box (the global `ion-toolbar.rpg-box`); the title sits at the start, Material style
.face-toolbar {
  --color: #{$eb-color-cream};

  ion-title {
    text-align: left;
    padding-inline-start: 8px;
  }
}

.face-title {
  font-family: $eb-font-title;
  color: $eb-color-pale-yellow;
  font-size: 1.25rem;
  letter-spacing: 1px;
}

// The animated sliding background comes from `bg-slide bg-slide-equipment`; nothing solid here
.face-content {
  --padding-top: 8px;
  --padding-bottom: 20px;
  color: $eb-color-cream;
}

.face-section {
  margin: 0 16px;
  display: flex;
  flex-direction: column;
}

.face-heading {
  margin: 0 0 8px;
  padding: 0 2px 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid $divider;
  font-family: $eb-font-status;
  font-weight: normal;
  font-size: 0.9rem;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: $eb-color-pale-yellow;
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.6);
}

.face-body {
  padding: 12px;
  border-radius: 8px;
  background: $body-backing;
}

// Tiles of at least 64 px, as many to a row as fit
.face-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 10px;
}

.face-tile {
  position: relative;
  aspect-ratio: 1;
  min-width: 64px;
  min-height: 64px;
  padding: 4px;
  border-radius: 50%;
  border: 3px solid rgba(231, 230, 179, 0.25);
  background: rgba(255, 255, 255, 0.08);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;

  &:active {
    transform: translateY(2px);
  }

  &:focus-visible {
    outline: 3px solid $eb-color-white;
    outline-offset: 2px;
  }

  &.is-current {
    border-color: $eb-color-pale-yellow;
    background: rgba(247, 232, 168, 0.22);
    box-shadow: 0 0 0 2px $eb-color-dark-purple, 0 0 14px 3px rgba(247, 232, 168, 0.55);
  }
}

.face-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.face-check {
  position: absolute;
  right: -4px;
  bottom: -4px;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-size: 0.8rem;
  color: $eb-color-mint-green;
  background: $eb-color-dark-purple;
  border: 2px solid $eb-color-mint-green;
  --fa-primary-color: currentColor;
  --fa-secondary-color: currentColor;
}

/* ---- Footer: the one big button, under the thumb ---- */
.face-footer {
  background: $eb-color-dark-purple;
  border-top: 3px solid $eb-color-pale-yellow;
}

.face-dock {
  padding: 12px 16px calc(12px + var(--ion-safe-area-bottom, 0px));
  background: $eb-color-dark-purple;
}

.face-build {
  width: 100%;
  min-height: 56px;
  padding: 8px 14px;
  font-family: $eb-font-status;
  font-size: 1.25rem;
  letter-spacing: 0.5px;
  color: $eb-color-dark-purple;
  background: $eb-color-pale-yellow;
  border: none;
  border-radius: 1px;
  box-shadow: 0 0 0 3px $eb-color-medium-purple, 0 0 0 5px $eb-color-minty-blue, 0 4px 0 5px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;

  i {
    --fa-primary-color: currentColor;
    --fa-secondary-color: currentColor;
  }

  &:active {
    transform: translateY(2px);
  }

  &:focus-visible {
    outline: 3px solid $eb-color-white;
    outline-offset: 2px;
  }
}
</style>