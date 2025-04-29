<template>
  <ion-header>
    <ion-toolbar>
      <ion-back-button
        slot="start"
        @click="dismiss"
        defaultHref="/game-master"
      />
      <ion-title>
        Attach Beast to Achievement(s)
      </ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content class="bg-slide">
    <ion-card>
      <ion-card-content>
        ∙ An Achievement, can have only one beast attached to it, however,
        a beast can be reused on multiple achievements.
      </ion-card-content>
    </ion-card>

    <ion-list>
      <XpAchievementItem
        v-for="achievement in beastlessAchievements"
        :achievement="achievement"
        :key="achievement.id"
      >
        <template v-slot:end>
          <ion-checkbox
            slot="end"
            :checked="attached?.includes(achievement.id)"
            @ionChange="toggleAttachment(achievement.id)"
          />
        </template>
      </XpAchievementItem>
    </ion-list>

  </ion-content>
  <ion-footer>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="dismiss">
          <i class="fad fa-times fa-lg mr-1" />
          Cancel
        </ion-button>
      </ion-buttons>
      <ion-buttons slot="end">
        <ion-button @click="clickSave">
          Save Attachments
          <i class="fad fa-paperclip fa-lg ml-1" />
        </ion-button>
      </ion-buttons>
    </ion-toolbar>

  </ion-footer>
</template>
<script lang="ts">
  import { AchievementDb } from '@/lib/databases';
  import { Achievement, achievementStorage } from '@/lib/databases/AchievementDb';
  import { modalController } from '@ionic/vue';
  import { defineComponent, ref } from 'vue';
  import ionic from '@/mixins/ionic';
  import XpAchievementItem from '../../XpAchievements/XpAddAchievement/components/XpAchievementItem.vue'

  export default defineComponent({
    props: ["beast"],
    name: 'xp-attach-beast',
    components: {
      XpAchievementItem
    },

    mixins: [ionic],
    data() {
      return {
        achievements: [] as Achievement[],
        achievementsDb: new AchievementDb(achievementStorage),
      }
    },
    computed: {

      beastlessAchievements() {
        const { id } = this.beast;
        return this.achievements.filter(({ beastId }) => !beastId || beastId == '' || beastId === id);
      }

    },
    methods: {
      toggleAttachment(id) {
        if (this.attached?.includes(id)) {
          this.attached.splice(this.attached.indexOf(id), 1)
        } else {
          this.attached.push(id)
        }
      },

      async clickSave() {
        const { achievementsDb, attached, beast: { id: beastId } } = this
        // we need to remove the beastId from any achievement that has this beast.id
        const byBeastId = (achievement: Achievement) => achievement.beastId === beastId;
        const beastAchievements = this.achievements.filter(byBeastId)

        // Reset any achievements that have the beast in it
        for (const achievement of beastAchievements)
          await achievementsDb.setTask({
            ...achievement,
            beastId: ''
          });

        // loop through attached, for each id in list, update that achievement by adding the beast
        for (const id of attached) {
          const byId = (achievement: Achievement) => achievement.id === id;
          const achievement = this.achievements.find(byId);
          if (achievement) {
            await achievementsDb.setTask({
              ...achievement,
              beastId
            });
          } else {
            // remove it from attached
            attached.splice(attached.indexOf(id), 1);
            continue;
          }
        }

        modalController.dismiss(attached)
      },

      dismiss() {
        modalController.dismiss()
      },

      async loadAchievements() {
        await this.achievementsDb.getAll().then(this.setAchievements);
      },

      setAchievements(achievements: Achievement[]) {
        this.achievements = achievements;
      },
    },
    mounted() {
      this.loadAchievements()
    },
    setup(props) {
      const attached = ref(props.beast.achievementIds || [])
      return {
        attached
      }
    }
  })
</script>
