<template>
  <ion-item
    v-for="user in users"
    :key="user.id"
    button
    detail
  >
    <ion-avatar slot="start">
      <ion-img
        :src="$getUserAvaatar(user)"
        class="mb-1"
      />
      <ion-progress-bar
        class="my-1"
        color="danger"
        v-if="user.stats"
        :value="user.stats.hp.now / user.stats.hp.max"
      >
      </ion-progress-bar>
      <ion-progress-bar
        color="tertiary"
        v-if="user.stats"
        :value="user.stats.mp.now / user.stats.mp.max"
      ></ion-progress-bar>
    </ion-avatar>
    <ion-label>
      {{ user.name.nick }}
      <p>
        {{ user.name.first }}
      </p>
    </ion-label>
    <ion-badge
      slot="end"
      color="none"
      fill="outline"
    >
    </ion-badge>

    <ion-label slot="end">
      <xp-gp :gp="user?.stats?.gp.wallet" />
      <p>Limit: {{ user?.stats?.gp.limit }}</p>
      <ion-progress-bar
        class="my-1"
        color="warning"
        v-if="user.stats"
        :value="user.stats.gp.wallet / user.stats.gp.limit"
      ></ion-progress-bar>
    </ion-label>
    <ion-label slot="end">
      Level: {{ user?.stats?.level }}
      <p>
        Level
        {{ 1 + user?.stats?.level }}
        {{ user?.stats?.xp.next_level - user?.stats?.xp.now }}
      </p>
      <ion-progress-bar
        class="my-1"
        color="success"
        v-if="user.stats"
        :value="user.stats.xp.now / user.stats.xp.next_level"
      />
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
  import { defineComponent } from 'vue'
  import ionic from '@/mixins/ionic'
  import { mapGetters } from "vuex";
  export default defineComponent({
    name: 'xp-impersonate-profile',
    mixins: [ionic],

    computed: {
      ...mapGetters(["usersAz"]),
      users() { return this.usersAz }
    },
    methods: {
      getUserAvatar(user) {
        const { avatar } = user;
        if (avatar) {
          return this.$requireAvatar(`./${user.avatar}.svg`);
        }
      },
    }
  })
</script>

<style></style>