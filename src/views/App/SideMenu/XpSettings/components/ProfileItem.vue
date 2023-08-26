<template>
  <ion-item>
    <ion-avatar slot="start">
      <img :src="getUserAvatar(profile)" />
    </ion-avatar>
    <!-- <ion-buttons slot="start"> </ion-buttons> -->
    <ion-buttons
      slot="end"
      v-if="!isLocked"
    >
      <ion-button
        @click="clickDeleteProfile(profile)"
        color="danger"
      >
        <i class="fad fa-trash fa-lg"></i>
      </ion-button>
      <ion-button
        color="success"
        slot="end"
        @click="clickAddProfile(profile)"
      >
        <i class="fad fa-edit fa-lg"></i>
      </ion-button>
    </ion-buttons>
    <ion-label>
      <ion-badge
        slot="end"
        color="success"
        class="ion-float-right"
      >
        Level {{ profile.stats.level }}
      </ion-badge>
      <h2>
        {{ profile.name.full }}
      </h2>
      <p>
        <ion-badge
          slot="end"
          color="warning"
          class="ion-float-right"
        >
          ₲{{ profile.stats.gp.wallet }}<small>.00</small>
        </ion-badge>
        {{ profile.name.nick }}
      </p>
    </ion-label>
  </ion-item>
</template>

<script lang="ts">
  import User from "@/utils/User";
  import { defineComponent } from "vue";

  import ionic from "@/mixins/ionic";

  function setup() {
    const requireAvatar = require.context("@/assets/images/avatars/");

    return {
      requireAvatar,
    };
  }

  export default defineComponent({
    name: "xp-profile-item",
    props: ["profile", "isLocked"],
    mixins: [ionic],
    methods: {
      clickAddProfile(profile: User) {
        this.$emit("click-add-profile", profile);
      },
      clickDeleteProfile(profile: User) {
        this.$emit("click-delete-profile", profile);
      },
      loadProfiles() {
        this.$emit("load-profiles");
      },
      getUserAvatar(user) {
        const { avatar } = user;
        if (avatar) {
          return this.requireAvatar(`./${user.avatar}.svg`);
        }
      },
    },
    setup,
  });
</script>
