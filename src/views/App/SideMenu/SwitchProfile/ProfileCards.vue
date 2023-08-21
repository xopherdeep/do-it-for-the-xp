<template>
  <ion-row>
    <ion-col
      v-for="(user, key) in profiles"
      :key="key"
      size="6"
      size-sm="4"
      size-md="3"
      size-xl="2"
    >
      <ion-card class="ion-no-margin" button @click="clickUser(user)">
        <ion-card-title>
          {{ user.name.first }}
        </ion-card-title>
        <ion-card-header>
          <ion-avatar>
            <img :src="getUserAvatar(user)" />
          </ion-avatar>
        </ion-card-header>
        <ion-card-content>
          {{ user.name.nick }}
        </ion-card-content>
      </ion-card>
    </ion-col>
  </ion-row>
</template>

<script lang="ts" setup>
  import User from "@/utils/User";

  const requireAvatar = require.context("@/assets/images/avatars/");
  defineProps<{
    profiles: {
      type: User[];
      required: true;
    };
  }>();
  function getUserAvatar(user) {
    const { avatar } = user;
    if (avatar) {
      return requireAvatar(`./${user.avatar}.svg`);
    }
  }
  function clickUser(user: any) {
    console.log("clickUser", user);
  }
</script>
