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
import { onMounted, onUnmounted, getCurrentInstance } from 'vue';

// Access global properties like $fx via getCurrentInstance
const instance = getCurrentInstance();
const fx = instance?.appContext.config.globalProperties.$fx;

onMounted(() => {
  if (fx && fx.ui && fx.theme && fx.ui[fx.theme.ui]?.loading) {
    fx.ui[fx.theme.ui].loading.play();
  }
  // Silent loading error to comply with ESLint rules
});

onUnmounted(() => {
  if (fx && fx.ui && fx.theme && fx.ui[fx.theme.ui]?.loading) {
    const loadingSound = fx.ui[fx.theme.ui].loading;
    loadingSound.pause();
    loadingSound.currentTime = 0;
  }
});
</script>

<style lang="scss">
  @import "./_XpLoading.scss";
</style>
