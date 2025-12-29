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
      <ion-card
        class="ion-no-margin"
        button
        @click="clickUser()"
      >
        <ion-card-title>
          {{ user?.name.first }}
        </ion-card-title>
        <ion-card-header>
          <ion-avatar>
            <ion-img :src="$getUserAvatar(user)" />
          </ion-avatar>
        </ion-card-header>
        <ion-card-content>
          {{ user?.name.nick }}
        </ion-card-content>
      </ion-card>
    </ion-col>
  </ion-row>
</template>

<script lang="ts">

  import User from "@/lib/utils/User";
  import Stats from "@/lib/utils/User/stats";
  import { defineComponent } from "vue";



  const ProfileCards = defineComponent({
    props: {
      profiles: {
        type: Array<User>,
        validator: function (value: User[]) {
          // Check if every item in the array is an instance of User
          return value.every(item => item instanceof User);
        },
        default: new User({
          name: { full: '' },
          avatar: '',
          favoriteThing: '',
          favoriteFood: '',
          jobClass: '',
          isAdult: false,
          stats: new Stats()
        })
      }
    },
    setup() {
      const clickUser = () => {
        // console.log("clickUser", user);
      }

      return {
        clickUser
      }
    }

  })

  export default ProfileCards
</script>
