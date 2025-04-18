<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/game-master" />
        </ion-buttons>
        <ion-title>
          <i class="fad fa-clipboard-check fa-lg mr-2"></i>
          Approvals
        </ion-title>
        <ion-buttons slot="end">
          <ion-button @click="refreshApprovals">
            <i class="fad fa-sync-alt fa-lg"></i>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-segment v-model="activeSegment">
        <ion-segment-button value="achievements">
          Achievements
          <ion-badge color="success">{{
            pendingAchievements.length
          }}</ion-badge>
        </ion-segment-button>
        <ion-segment-button value="accessories">
          Accessories
          <ion-badge color="warning">{{ pendingAccessories.length }}</ion-badge>
        </ion-segment-button>
      </ion-segment>
    </ion-header>
    <ion-content>
      <ion-list v-if="activeSegment === 'achievements'">
        <ion-item-sliding v-for="item in pendingAchievements" :key="item.id">
          <ion-item>
            <ion-avatar slot="start">
              <ion-img v-if="item.imageUrl" :src="item.imageUrl" />
              <ion-skeleton-text v-else />
            </ion-avatar>
            <ion-label>
              {{ item.achievementName }}
              <p>
                Submitted by: {{ getUserName(item.userId) }}
                <ion-note>{{ formatDate(item.submittedDate) }}</ion-note>
              </p>
            </ion-label>
            <ion-badge color="warning" slot="end">
              <xp-gp :gp="item.gp" />
            </ion-badge>
          </ion-item>
          <ion-item-options side="end">
            <ion-item-option color="success" @click="approveItem(item)">
              <i class="fad fa-check fa-lg"></i>
              Approve
            </ion-item-option>
            <ion-item-option color="danger" @click="rejectItem(item)">
              <i class="fad fa-times fa-lg"></i>
              Reject
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
        <ion-item v-if="pendingAchievements.length === 0">
          <ion-label class="ion-text-center">
            <i class="fad fa-check-circle fa-3x text-success"></i>
            <p>No pending achievement approvals</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <ion-list v-if="activeSegment === 'accessories'">
        <ion-item-sliding v-for="item in pendingAccessories" :key="item.id">
          <ion-item>
            <ion-avatar slot="start">
              <ion-img v-if="item.icon" :src="item.icon" />
              <ion-skeleton-text v-else />
            </ion-avatar>
            <ion-label>
              {{ item.name }}
              <p>
                Requested by: {{ getUserName(item.userId) }}
                <ion-note>{{ formatDate(item.requestDate) }}</ion-note>
              </p>
            </ion-label>
            <ion-badge color="warning" slot="end">
              <xp-gp :gp="item.basePrice" />
            </ion-badge>
          </ion-item>
          <ion-item-options side="end">
            <ion-item-option color="success" @click="approveItem(item)">
              <i class="fad fa-check fa-lg"></i>
              Approve
            </ion-item-option>
            <ion-item-option color="danger" @click="rejectItem(item)">
              <i class="fad fa-times fa-lg"></i>
              Reject
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
        <ion-item v-if="pendingAccessories.length === 0">
          <ion-label class="ion-text-center">
            <i class="fad fa-check-circle fa-3x text-success"></i>
            <p>No pending accessory approvals</p>
          </ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent, ref, computed } from "vue";
  import ionic from "@/mixins/ionic";
  import { mapGetters } from "vuex";
  import { alertController, toastController } from "@ionic/vue";
  import { format } from "date-fns";

  export default defineComponent({
    name: "xp-approvals",
    mixins: [ionic],
    computed: {
      ...mapGetters(["usersAz"]),
      users() {
        return this.usersAz;
      },
    },
    methods: {
      getUserName(userId) {
        const user = this.users.find((u) => u.id === userId);
        return user ? user.name.full : "Unknown User";
      },
      formatDate(dateString) {
        if (!dateString) return "";
        return format(new Date(dateString), "MMM d, yyyy");
      },
      async approveItem(item) {
        const alert = await alertController.create({
          header: "Approve Item",
          message: `Are you sure you want to approve ${
            item.achievementName || item.name
          }?`,
          buttons: [
            {
              text: "Cancel",
              role: "cancel",
            },
            {
              text: "Approve",
              handler: () => {
                // Logic to approve the item
                this.showSuccessToast("Item approved successfully!");
                this.refreshApprovals();
              },
            },
          ],
        });
        await alert.present();
      },
      async rejectItem(item) {
        const alert = await alertController.create({
          header: "Reject Item",
          message: `Are you sure you want to reject ${
            item.achievementName || item.name
          }?`,
          inputs: [
            {
              name: "reason",
              type: "textarea",
              placeholder: "Reason for rejection (optional)",
            },
          ],
          buttons: [
            {
              text: "Cancel",
              role: "cancel",
            },
            {
              text: "Reject",
              handler: (data) => {
                // Logic to reject the item with reason
                this.showSuccessToast("Item rejected");
                this.refreshApprovals();
              },
            },
          ],
        });
        await alert.present();
      },
      refreshApprovals() {
        // Logic to refresh approvals data
        this.showSuccessToast("Approvals refreshed!");
      },
      showSuccessToast(message) {
        toastController
          .create({
            message: message,
            duration: 2000,
            position: "bottom",
            color: "success",
          })
          .then((toast) => toast.present());
      },
    },
    setup() {
      const activeSegment = ref("achievements");

      // Mock data for pending achievements
      const pendingAchievements = ref([
        {
          id: "1",
          achievementName: "Clean the Kitchen",
          userId: "1",
          submittedDate: "2025-04-05T12:00:00",
          gp: 50,
          imageUrl: "",
        },
        {
          id: "2",
          achievementName: "Homework Complete",
          userId: "2",
          submittedDate: "2025-04-06T14:30:00",
          gp: 30,
          imageUrl: "",
        },
      ]);

      // Mock data for pending accessories
      const pendingAccessories = ref([
        {
          id: "1",
          name: "New Video Game",
          userId: "2",
          requestDate: "2025-04-04T10:15:00",
          basePrice: 200,
          icon: "",
        },
        {
          id: "2",
          name: "Movie Night",
          userId: "1",
          requestDate: "2025-04-05T16:45:00",
          basePrice: 100,
          icon: "",
        },
      ]);

      return {
        activeSegment,
        pendingAchievements,
        pendingAccessories,
      };
    },
  });
</script>

<style lang="scss" scoped>
  .xp-approvals {
    ion-segment {
      padding: 4px 8px;

      ion-segment-button {
        --indicator-color: var(--ion-color-primary);

        ion-badge {
          position: absolute;
          top: 4px;
          right: 4px;
          font-size: 10px;
          padding: 2px 6px;
        }
      }
    }

    ion-item {
      --padding-start: 8px;
      --inner-padding-end: 8px;
      margin-bottom: 4px;

      ion-note {
        font-size: 12px;
        margin-left: 8px;
        color: var(--ion-color-medium);
      }
    }

    .text-success {
      color: var(--ion-color-success);
    }
  }
</style>
