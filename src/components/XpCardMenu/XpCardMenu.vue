<template>
  <ion-grid>
    <ion-row>
      <ion-col
        size="6"
        v-for="action in actions"
        :key="action.id"
        @click="handleAction(action)"
      >
        <ion-card button class="menu-card">
          <ion-card-header>
            <xp-icon
              :icon="action.icon"
              :primary="action.primary"
              :secondary="action.secondary"
              size="2x"
            />
            <ion-card-subtitle>{{ action.label }}</ion-card-subtitle>
          </ion-card-header>
        </ion-card>
      </ion-col>
    </ion-row>
  </ion-grid>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import XpIcon from '@/components/XpIcon';

export default defineComponent({
  name: 'xp-card-menu',
  components: {
    XpIcon
  },
  props: {
    actions: {
      type: Array as () => Array<{
        id: string | number;
        icon: string;
        label: string;
        primary?: string;
        secondary?: string;
        click?: () => void;
      }>,
      required: true
    }
  },
  setup(props, { emit }) {
    type Action = {
      id: string | number;
      icon: string;
      label: string;
      primary?: string;
      secondary?: string;
      click?: () => void;
    };

    const handleAction = (action: Action) => {
      if (action.click) {
        action.click();
      }
      emit('action', action.id);
    };

    return {
      handleAction
    };
  }
});
</script>

<style lang="scss" scoped>
.menu-card {
  text-align: center;
  margin: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  
  ion-card-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  ion-card-subtitle {
    margin: 0;
    font-size: 0.9em;
  }
}
</style>