<template>
  <div class="xp-splash-header">
    <div class="splash-icon">
      <i :class="['fad', icon]"></i>
    </div>
    <div class="splash-title-container">
      <input
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        :placeholder="placeholder"
        class="splash-title-input"
      />
      <p class="splash-tagline" v-if="tagline">{{ tagline }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  icon: string;
  modelValue: string;
  placeholder?: string;
  tagline?: string;
}

withDefaults(defineProps<Props>(), {
  placeholder: 'Enter title...',
  tagline: ''
});

defineEmits<{
  'update:modelValue': [value: string];
}>();

defineOptions({
  name: 'XpSplashHeader'
});
</script>

<style lang="scss" scoped>
.xp-splash-header {
  padding: 3rem 1rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.splash-icon {
  font-size: 4rem;
  color: var(--ion-color-light);
  margin-bottom: 1rem;
  filter: drop-shadow(0 0 20px rgba(var(--ion-color-primary-rgb), 0.5));
  
  i {
    animation: pulse-icon 3s ease-in-out infinite;
  }
}

@keyframes pulse-icon {
  0%, 100% { 
    filter: drop-shadow(0 0 20px rgba(var(--ion-color-primary-rgb), 0.5));
  }
  50% { 
    filter: drop-shadow(0 0 30px rgba(var(--ion-color-primary-rgb), 0.8));
  }
}

.splash-title-container {
  width: 100%;
  max-width: 400px;
}

.splash-title-input {
  width: 100%;
  background: transparent;
  border: none;
  font-family: "Press Start 2P";
  font-size: 1.2rem;
  color: #fff;
  text-align: center;
  margin: 0;
  padding: 0;
  outline: none;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.8);
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
}

.splash-tagline {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  font-style: italic;
  margin-top: 0.5rem;
}
</style>
