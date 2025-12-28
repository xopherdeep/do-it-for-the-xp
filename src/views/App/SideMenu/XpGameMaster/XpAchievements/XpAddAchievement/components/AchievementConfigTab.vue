<template>
  <ion-card-content class="achievement-config-tab">
    <ion-list>
      <!-- Quest Name -->
      <ion-item-group class="mb-4">
        <ion-item-divider>
          <i class="fad fa-scroll fa-lg mr-2" slot="start" />
          <ion-label>Quest Identity</ion-label>
        </ion-item-divider>

        <ion-item>
          <ion-label position="stacked">Quest Name</ion-label>
          <ion-input
            :value="achievement.achievementName"
            @ionInput="updateField('achievementName', $event.detail.value)"
            placeholder="Name your quest..."
          ></ion-input>
        </ion-item>
      </ion-item-group>

      <!-- Category Selection -->
      <ion-item-group class="mb-4">
        <ion-item-divider>
          <i class="fad fa-tags fa-lg mr-2" slot="start" />
          <ion-label>Category</ion-label>
          <ion-button slot="end" fill="clear" size="small" @click="$emit('open-category-modal')">
            <i class="fad fa-plus mr-1" /> Add
          </ion-button>
        </ion-item-divider>

        <ion-item>
          <ion-label position="stacked">Select Category</ion-label>
          <ion-select
            :value="achievement.categoryId"
            @ionChange="updateField('categoryId', $event.detail.value)"
            placeholder="Choose a category..."
            mode="ios"
          >
            <ion-select-option
              v-for="category in categories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.name }}
            </ion-select-option>
          </ion-select>
        </ion-item>
      </ion-item-group>

      <!-- Settings Toggles -->
      <ion-item-group class="mb-4">
        <ion-item-divider>
          <i class="fad fa-sliders-h fa-lg mr-2" slot="start" />
          <ion-label>Settings</ion-label>
        </ion-item-divider>

        <ion-item>
          <i class="fad fa-clipboard-check fa-lg mr-3" slot="start" style="color: var(--ion-color-primary)" />
          <ion-label>
            Requires Approval
            <p>Parent must approve completion</p>
          </ion-label>
          <ion-toggle
            slot="end"
            :checked="achievement.requiresApproval"
            @ionChange="updateField('requiresApproval', $event.detail.checked)"
          ></ion-toggle>
        </ion-item>

        <ion-item>
          <i class="fad fa-gift fa-lg mr-3" slot="start" style="color: var(--ion-color-tertiary)" />
          <ion-label>
            Bonus Quest
            <p>Extra quest, not required</p>
          </ion-label>
          <ion-toggle
            slot="end"
            :checked="achievement.bonusAchievement"
            @ionChange="updateField('bonusAchievement', $event.detail.checked)"
          ></ion-toggle>
        </ion-item>

        <ion-item>
          <i class="fad fa-eye-slash fa-lg mr-3" slot="start" style="color: var(--ion-color-medium)" />
          <ion-label>
            Hidden Quest
            <p>Quest is not visible until triggered</p>
          </ion-label>
          <ion-toggle
            slot="end"
            :checked="achievement.hidden"
            @ionChange="updateField('hidden', $event.detail.checked)"
          ></ion-toggle>
        </ion-item>
      </ion-item-group>

      <!-- Description -->
      <ion-item-group class="mb-4">
        <ion-item-divider>
          <i class="fad fa-align-left fa-lg mr-2" slot="start" />
          <ion-label>Description</ion-label>
        </ion-item-divider>

        <ion-item>
          <ion-label position="stacked">Quest Description</ion-label>
          <ion-textarea
            :value="achievement.description"
            @ionInput="updateField('description', $event.detail.value)"
            placeholder="Describe the quest objectives..."
            :auto-grow="true"
            :rows="3"
          ></ion-textarea>
        </ion-item>
      </ion-item-group>
    </ion-list>
  </ion-card-content>
</template>

<script setup lang="ts">
import {
  IonCardContent,
  IonList,
  IonItemGroup,
  IonItemDivider,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonTextarea,
  IonButton,
} from '@ionic/vue';

interface Category {
  id: string;
  name: string;
}

interface Achievement {
  achievementName?: string;
  categoryId?: string;
  requiresApproval?: boolean;
  bonusAchievement?: boolean;
  hidden?: boolean;
  description?: string;
}

interface Props {
  achievement: Achievement;
  categories: Category[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:achievement': [value: Achievement];
  'open-category-modal': [];
}>();

defineOptions({
  name: 'AchievementConfigTab'
});

const updateField = (field: keyof Achievement, value: unknown) => {
  emit('update:achievement', { ...props.achievement, [field]: value });
};
</script>

<style lang="scss" scoped>
.achievement-config-tab {
  width: 100%;
}
</style>
