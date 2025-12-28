<template>
  <div class="temple-header">
    <div class="temple-icon-wrapper">
      <i :class="['fad', icon, 'fa-4x']"></i>
    </div>
    <h1 class="temple-name">{{ name }}</h1>
    <p class="temple-description">{{ description }}</p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'XpTempleHeader',
  props: {
    name: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true }
  }
});
</script>

<style lang="scss" scoped>
.temple-header {
  text-align: center;
  padding-top: 1rem;

  .temple-icon-wrapper {
    margin-bottom: 0.5rem;
    i {
      color: var(--ion-color-primary);
      filter: drop-shadow(0 0 20px rgba(var(--ion-color-primary-rgb), 0.5));
    }
  }

  .temple-name {
    font-family: "Twoson", serif;
    font-size: 2.2rem;
    color: #fff;
    text-transform: uppercase;
    letter-spacing: 3px;
    text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.8);
    margin: 0 0 0.5rem;
  }

  .temple-description {
    font-family: "Apple Kid", sans-serif;
    font-size: 1.1rem;
    color: rgba(255, 255, 255, 0.7);
    margin: 0;
    line-height: 1.4;
    max-width: 600px;
    margin: 0 auto;
  }
}
</style>
