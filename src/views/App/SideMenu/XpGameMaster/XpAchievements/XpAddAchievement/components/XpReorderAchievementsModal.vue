<template>
  <ion-header>
    <ion-toolbar class="rpg-box">
      <ion-title>
        Reorder Achievements
      </ion-title>
      <ion-buttons slot="end">
        <ion-button @click="clickSave">
          Save Order
          <i class="fad fa-save fa-lg"></i>
        </ion-button>
      </ion-buttons>

    </ion-toolbar>

  </ion-header>
  <ion-content>
    <ion-list>
      <ion-reorder-group
        :disabled="false"
        @ionItemReorder="handleReorder($event)"
      >
        <XpAchievementItem
          v-for="achievement in achievements"
          :achievement="achievement"
          :key="achievement.id"
        >
          <template v-slot:end>
            <ion-reorder slot="end"></ion-reorder>
          </template>
        </XpAchievementItem>
      </ion-reorder-group>
    </ion-list>
  </ion-content>
</template>
<script lang="ts">
  import { defineComponent, ref, toRefs } from 'vue';
  import ionic from '@/mixins/ionic';
  import XpAchievementItem from './XpAchievementItem.vue';
  import { modalController } from '@ionic/vue';
  import { Achievement } from '@/lib/databases/AchievementDb';
  import debug from '@/utils/debug';

  export default defineComponent({
    props: {
      achievements: {
        type: Array,
        default: [] as Achievement[]
      }
    },
    mixins: [ionic],
    components: {
      XpAchievementItem,
    },
    setup(props) {
      const { achievements } = toRefs(props);
      const reorderedAchievements = ref([...(achievements.value ?? [])]); // Fallback to empty array if undefined

      const clickSave = () => {
        const reorderedAchievementIds = reorderedAchievements.value.map(
          (achievement: any) => achievement.id
        );
        debug.log(" REORDER ", reorderedAchievementIds);

        modalController.dismiss(reorderedAchievementIds);
      };

      const handleReorder = (event: CustomEvent) => {
        const { from, to } = event.detail;
        const movedItem = reorderedAchievements.value.splice(from, 1)[0];
        reorderedAchievements.value.splice(to, 0, movedItem);
        event.detail.complete();
      };

      return {
        clickSave,
        handleReorder,
        reorderedAchievements,
      };
    },
  });

</script>
