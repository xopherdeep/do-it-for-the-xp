<template>
  <xp-rpg-modal :is-open="isOpen" title="Save & Quit" modal-class="save-quit-modal" @close="$emit('close')">
    <!-- Custom Icon with Avatar -->
    <template #icon>
      <div v-if="userAvatar" class="avatar-container">
        <img :src="userAvatar" class="profile-avatar" />
      </div>
      <i v-else class="fad fa-user-astronaut"></i>
    </template>

    <div class="logout-content">
      <p class="logout-info">
        Are you sure you want to save your progress and log out?
      </p>
      <p class="logout-subtext">
        Your adventure will be waiting for you when you return.
      </p>
    </div>

    <template #footer>
      <ion-button @click.stop="$emit('close')" class="cancel-button">
        Cancel
      </ion-button>
      <ion-button @click="$emit('confirm')" class="confirm-button">
        <i class="fad fa-sign-out-alt" style="margin-right: 8px;"></i>
        Save & Quit
      </ion-button>
    </template>
  </xp-rpg-modal>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { IonButton } from "@ionic/vue";
import XpRpgModal from "@/components/templates/modals/XpRpgModal.vue";

export default defineComponent({
  name: "save-and-quit-modal",
  components: {
    IonButton,
    XpRpgModal,
  },
  props: {
    isOpen: {
      type: Boolean,
      default: false,
    },
    userAvatar: {
      type: String,
      default: "",
    },
  },
  emits: ["close", "confirm"],
});
</script>

<style lang="scss" scoped>
.avatar-container {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: white;
  padding: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  border: 4px solid var(--ion-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;

  .profile-avatar {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.logout-info {
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.1rem;
  margin: 0 0 8px 0;
  line-height: 1.5;
  text-align: center;
}

.logout-subtext {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
  margin: 0 0 20px 0;
  font-style: italic;
  text-align: center;
}

.cancel-button {
  --border-radius: 12px;
  --background: linear-gradient(135deg, var(--ion-color-danger), var(--xp-color-red));
  --background-hover: linear-gradient(135deg, var(--xp-color-red), var(--ion-color-danger));
  --box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
  --color: #fff;
  flex: 1;
  font-weight: 600;
  height: 48px;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    --box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4);
  }
}

.confirm-button {
  --border-radius: 12px;
  --background: linear-gradient(135deg, var(--ion-color-primary), #8b5cf6);
  --background-hover: linear-gradient(135deg, #7c7ff7, #9d6fff);
  --box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
  flex: 1;
  font-weight: 600;
  height: 48px;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    --box-shadow: 0 8px 25px rgba(99, 102, 241, 0.5);
  }
}
</style>
