<template>
  <ion-item v-for="user in users" :key="user.id" @click="mimicUser(user)" button detail>
    <ion-avatar slot="start">
      <ion-img :src="$getUserAvatar(user)" class="mb-1" />
      <ion-progress-bar class="my-1" color="danger" v-if="user.stats" :value="user.stats.hp.now / user.stats.hp.max">
      </ion-progress-bar>
      <ion-progress-bar color="tertiary" v-if="user.stats"
        :value="user.stats.mp.now / user.stats.mp.max"></ion-progress-bar>
    </ion-avatar>
    <ion-label>
      {{ user.name.nick }}
      <p>
        {{ user.name.first }}
      </p>
    </ion-label>
    <ion-badge slot="end" color="none" fill="outline"> </ion-badge>

    <ion-label slot="end">
      <xp-gp :gp="user?.stats?.gp.wallet" />
      <p>Limit: {{ user?.stats?.gp.limit }}</p>
      <ion-progress-bar class="my-1" color="warning" v-if="user.stats"
        :value="user.stats.gp.wallet / user.stats.gp.limit"></ion-progress-bar>
    </ion-label>
    <ion-label slot="end">
      Level: {{ user?.stats?.level }}
      <p>
        Level
        {{ 1 + user?.stats?.level }}
        {{ user?.stats?.xp.next_level - user?.stats?.xp.now }}
      </p>
      <ion-progress-bar class="my-1" color="success" v-if="user.stats"
        :value="user.stats.xp.now / user.stats.xp.next_level" />
    </ion-label>
    <!-- <ion-badge
          slot="end"
          color="danger"
        >
          {{ user?.stats?.ap?.all || 0 }}
          AP
        </ion-badge> -->
  </ion-item>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import ionic from "@/lib/mixins/ionic";
import { useUserStore } from "@/lib/store/stores/user";
import { modalController, toastController } from "@ionic/vue";

export default defineComponent({
  name: "xp-impersonate-profile",
  mixins: [ionic],

  computed: {
    usersAz() {
      return (this as any).userStore.usersAz;
    },
    users() {
      return (this as any).usersAz;
    },
  },
  setup() {
    const userStore = useUserStore();
    return {
      userStore,
    };
  },
  methods: {
    async mimicUser(user: any) {
      const { id: userId, name } = user;

      const loadingModal = await modalController.create({
        component: require("@/components/templates/modals/ProfileLoadingModal.vue")
          .default,
        componentProps: {
          userName: user.name.nick,
          userAvatar: (this as any).$getUserAvatar(user),
        },
        cssClass: "profile-loading-modal",
        backdropDismiss: false,
      });

      await loadingModal.present();

      try {
        await (this as any).userStore.impersonateUser(userId);

        // Success feedback
        this.play$fx("select");

        const toast = await toastController.create({
          message: `Now viewing as ${user.name.nick}`,
          duration: 2000,
          position: "bottom",
          color: "success",
        });
        await toast.present();

        this.$router.push({
          name: "my-home",
          params: {
            userId,
          },
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to impersonate user:", error);
        const toast = await toastController.create({
          message: "Failed to switch profile",
          duration: 2000,
          position: "bottom",
          color: "danger",
        });
        await toast.present();
      } finally {
        setTimeout(async () => {
          await loadingModal.dismiss();
        }, 500);
      }
    },
  },
});
</script>

<style></style>
