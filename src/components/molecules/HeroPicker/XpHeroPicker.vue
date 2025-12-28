<template>
  <div class="xp-hero-picker">
    <div class="hero-picker-header" v-if="showHeader">
      <span class="header-title">{{ title }}</span>
      <button 
        v-if="modelValue.length > 0" 
        class="clear-btn"
        @click="clearAll"
      >
        Clear All
      </button>
    </div>

    <div class="hero-party-grid">
      <div 
        v-for="user in users" 
        :key="user.id"
        class="hero-card"
        :class="{ 'hero-card--active': isSelected(user.id) }"
        @click="toggleHero(user.id)"
      >
        <ion-avatar>
          <img :src="getAvatarUrl(user)" :alt="user.name?.first || 'Hero'" />
        </ion-avatar>
        <span class="hero-card__name">{{ user.name?.first || 'Hero' }}</span>
        <i 
          v-if="isSelected(user.id)" 
          class="fad fa-shield-check hero-card__badge"
        />
      </div>
    </div>

    <div class="hero-picker-summary" v-if="showSummary">
      <template v-if="isOpenToAll">
        <i class="fad fa-globe" /> Open to all heroes
      </template>
      <template v-else-if="modelValue.length > 0">
        <i class="fad fa-users" /> {{ modelValue.length }} hero{{ modelValue.length > 1 ? 'es' : '' }} selected
      </template>
      <template v-else>
        <i class="fad fa-user-plus" /> Tap heroes to add them to the party
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getCurrentInstance } from 'vue';
import { IonAvatar } from '@ionic/vue';
import User from '@/lib/utils/User';

// Access global properties via getCurrentInstance
const instance = getCurrentInstance();
const globalProps = instance?.appContext.config.globalProperties;

interface Props {
  users: User[];
  modelValue: string[];
  multiple?: boolean;
  title?: string;
  showHeader?: boolean;
  showSummary?: boolean;
  isOpenToAll?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  multiple: true,
  title: 'Choose Your Party',
  showHeader: true,
  showSummary: true,
  isOpenToAll: false
});

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
}>();

defineOptions({
  name: 'XpHeroPicker'
});

const isSelected = (userId: string) => props.modelValue.includes(userId);

const getAvatarUrl = (user: User) => {
  // Try to use global $getUserAvatar if available
  if (globalProps?.$getUserAvatar) {
    try {
      const avatar = globalProps.$getUserAvatar(user);
      if (avatar) return avatar;
    } catch {
      // Fall through to fallback
    }
  }
  // Fallback to UI Avatars API
  return `https://ui-avatars.com/api/?name=${user.name?.first || 'H'}&background=random&size=96`;
};

const toggleHero = (userId: string) => {
  if (props.multiple) {
    const newValue = isSelected(userId)
      ? props.modelValue.filter(id => id !== userId)
      : [...props.modelValue, userId];
    emit('update:modelValue', newValue);
  } else {
    emit('update:modelValue', isSelected(userId) ? [] : [userId]);
  }
};

const clearAll = () => {
  emit('update:modelValue', []);
};
</script>

<style lang="scss" scoped>
.xp-hero-picker {
  width: 100%;
}

.hero-picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--ion-color-step-50);
  border-bottom: 1px solid var(--ion-color-step-100);

  .header-title {
    font-weight: 600;
    color: var(--ion-color-light);
  }

  .clear-btn {
    background: transparent;
    border: none;
    color: var(--ion-color-danger);
    font-size: 0.85rem;
    cursor: pointer;
    
    &:hover {
      text-decoration: underline;
    }
  }
}

.hero-party-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 0.75rem;
  padding: 1rem;
}

.hero-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem;
  border-radius: 12px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
  background: var(--ion-color-step-50);
  border: 2px solid transparent;

  ion-avatar {
    width: 48px;
    height: 48px;
    transition: all 0.2s ease;
  }

  &__name {
    font-size: 0.75rem;
    margin-top: 0.5rem;
    text-align: center;
    color: var(--ion-color-medium);
    transition: all 0.2s ease;
  }

  &__badge {
    position: absolute;
    top: 4px;
    right: 4px;
    color: var(--ion-color-success);
    font-size: 1rem;
  }

  &:hover {
    background: var(--ion-color-step-100);
    transform: scale(1.05);
  }

  &--active {
    border-color: var(--ion-color-rpg);
    background: rgba(var(--ion-color-rpg-rgb), 0.15);

    ion-avatar {
      transform: scale(1.1);
    }

    .hero-card__name {
      color: var(--ion-color-rpg);
      font-weight: 600;
    }
  }
}

.hero-picker-summary {
  text-align: center;
  padding: 1rem;
  color: var(--ion-color-medium);
  font-size: 0.9rem;

  i {
    margin-right: 0.5rem;
  }
}
</style>
