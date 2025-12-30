<template>
  <div class="loader">
    <div class="loader__bar"></div>
    <div class="loader__bar loader__bar--delay-1"></div>
    <div class="loader__bar loader__bar--delay-2"></div>
    <div class="loader__bar loader__bar--delay-3"></div>
    <div class="loader__bar loader__bar--delay-4"></div>
    <div class="loader__bar loader__bar--delay-5"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, getCurrentInstance, computed } from 'vue';
// import { useRoute } from 'vue-router';

// Access global properties like $fx via getCurrentInstance
const instance = getCurrentInstance();
const fx = instance?.appContext.config.globalProperties.$fx;
// const route = useRoute();

// Determine which sound to play based on current route
const activeSoundId = computed(() => {
  // If we are in the "backend" (GameMaster setup), use the setup sound
  // if (route?.path?.includes('/game-master/compendium/setup')) {
  //   return 'setup';
  // }
  return 'loading';
});

onMounted(() => {
  if (fx && fx.ui && fx.theme) {
    const sound = fx.ui[fx.theme.ui]?.[activeSoundId.value];
    if (sound) {
      sound.play();
    }
  }
});

onUnmounted(() => {
  if (fx && fx.ui && fx.theme) {
    const sound = fx.ui[fx.theme.ui]?.[activeSoundId.value];
    if (sound) {
      sound.pause();
      sound.currentTime = 0;
    }
  }
});
</script>

<style lang="scss">
  @use "./_XpLoading.scss";
</style>
