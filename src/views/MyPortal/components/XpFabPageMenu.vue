<template>
  <!-- PAGE MENU -->
  <ion-fab
    vertical="center"
    horizontal="start"
    class="fab-user"
    color="dark"
    v-if="user.stats"
  >
    <ion-grid>
      <ion-row>
        <ion-col>
          <ion-fab-button
            color="light"
            v-if="user.avatar"
          >
            <i
              v-if="pageIcon != 'fort-awesome'"
              class="fad fa-2x"
              :class="`fa-${pageIcon}`"
            ></i>
            <i
              v-else
              class="fab fa-2x"
              :class="`fa-${pageIcon}`"
            ></i>
          </ion-fab-button>
        </ion-col>
      </ion-row>
    </ion-grid>
    <!-- <ion-fab-list side="end">
      <ion-grid>
        <ion-row>
          <ion-col>
            <ion-fab-button>
              <ion-menu-button color="primary"></ion-menu-button>
            </ion-fab-button>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-fab-list> -->
    <ion-fab-list side="bottom">
      <xp-card-menu
        :cardTitle="pageName"
        :actions="userActions"
      />
    </ion-fab-list>
  </ion-fab>
</template>

<style lang="scss" scoped>
ion-fab-list {
  margin-left: -125px;
  position: absolute;
  width: 20%;
  margin-left: auto;
  margin-right: auto;
  // max-width: 95%;
  width: auto;

}
</style>

<script lang="ts">
  import { useRoute } from "vue-router";
  import { computed, defineComponent } from 'vue'
  import userActions from "@/mixins/userActions";
  import ionic from "@/mixins/ionic";
  import XpCardMenu from "./XpCardMenu.vue"

  export default defineComponent({
    mixins: [userActions, ionic],
    components: { XpCardMenu },
    props: {
      pageName: {
        default() {
          return ''
        }

      },
      user: {
        default() {
          return {
            id: 0,
            stats: null,
            avatar: null
          }
        }
      }
    },

    setup() {
      const route = useRoute();

      const pageIcon = computed(() => route.meta.faIcon)

      return {
        pageIcon
      }
    },
  })

</script>