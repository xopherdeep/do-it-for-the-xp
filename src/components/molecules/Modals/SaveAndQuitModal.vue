<template>
  <ion-modal
    ref="modal"
    :is-open="isOpen"
    class="save-quit-modal"
    :backdrop-dismiss="true"
    @ionModalDidDismiss="handleDismiss"
  >
    <ion-card class="animated-card">
      <ion-card-header>
        <ion-icon
          @click.stop="dismiss"
          name="close"
          class="close-icon"
        />
        <div class="header-icon">
          <div v-if="userAvatar" class="avatar-container">
            <img :src="userAvatar" class="profile-avatar" />
          </div>
          <i v-else class="fad fa-user-astronaut"></i>
        </div>
        <ion-card-title class="card-title">
          Save & Quit
        </ion-card-title>
      </ion-card-header>
      
      <ion-card-content>
        <p class="logout-info">
          Are you sure you want to save your progress and log out?
        </p>
        <p class="logout-subtext">
          Your adventure will be waiting for you when you return.
        </p>

        <div class="button-group">
          <ion-button
            @click.stop="dismiss"
            class="cancel-button"
          >
            Cancel
          </ion-button>
          <ion-button
            @click="confirmSaveQuit"
            class="confirm-button"
          >
            <i class="fad fa-sign-out-alt" style="margin-right: 8px;"></i>
            Save & Quit
          </ion-button>
        </div>
      </ion-card-content>
    </ion-card>
  </ion-modal>
</template>

<script lang="ts">
  import { defineComponent } from "vue";
  import {
    IonModal,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon,
  } from "@ionic/vue";
  import { play$fx } from "@/assets/fx";

  export default defineComponent({
    name: "save-and-quit-modal",
    components: {
      IonModal,
      IonCard,
      IonCardHeader,
      IonCardTitle,
      IonCardContent,
      IonButton,
      IonIcon,
    },
    props: {
      isOpen: {
        type: Boolean,
        default: false,
      },
      userAvatar: {
        type: String,
        default: '',
      },
    },
    emits: ["close", "confirm"],
    methods: {
      handleDismiss() {
        this.$emit("close");
      },
      close() {
        this.$emit("close");
      },
      dismiss() {
        play$fx("no");
        const modal = this.$refs.modal as any;
        if (modal?.$el) {
          modal.$el.dismiss();
        } else {
          this.close();
        }
      },
      confirmSaveQuit() {
        this.$emit("confirm");
      },
    },
  });
</script>

<style lang="scss">
  // Global styles for ion-modal (unscoped to target shadow DOM)
  ion-modal.save-quit-modal {
    --backdrop-opacity: 0.3;
    --width: fit-content;
    --height: fit-content;
    --max-width: 400px;
    --min-width: 320px;
    --border-radius: 16px;
    --box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5),
                  0 0 0 1px rgba(255, 255, 255, 0.1);
  }
</style>

<style lang="scss" scoped>
  ion-card {
    margin: 0;
    background: linear-gradient(145deg, #1e1e2e, #2a2a3e);
    border-radius: 16px;
    box-shadow: none;
  }

  ion-card-header {
    position: relative;
    padding: 20px 20px 12px;
  }

  .close-icon {
    position: absolute;
    top: 16px;
    right: 16px;
    font-size: 1.5rem;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      color: #fff;
    }
  }

  .header-icon {
    display: flex;
    justify-content: center;
    margin-bottom: 12px;

    i {
      font-size: 3rem;
      color: rgba(255, 255, 255, 0.85);
    }

    .avatar-container {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: white;
      padding: 8px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      border: 2px solid var(--ion-color-primary);
      display: flex;
      align-items: center;
      justify-content: center;

      .profile-avatar {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    }
  }

  .card-title {
    text-align: center;
    font-size: 1.4rem;
    font-weight: 600;
    color: #fff;
  }

  ion-card-content {
    padding: 0 20px 20px;
  }

  .logout-info {
    color: rgba(255, 255, 255, 0.9);
    font-size: 1rem;
    margin: 0 0 8px 0;
    line-height: 1.5;
  }

  .logout-subtext {
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.875rem;
    margin: 0 0 20px 0;
    font-style: italic;
  }

  .button-group {
    display: flex;
    gap: 12px;
    margin-top: 8px;
  }

  .cancel-button {
    --border-radius: 10px;
    --background: linear-gradient(135deg, #ef4444, #dc2626);
    --background-hover: linear-gradient(135deg, #f87171, #ef4444);
    --box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
    --color: #fff;
    flex: 1;
    transition: all 0.2s ease;

    &:hover {
      transform: translateY(-2px);
      --box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4);
    }
  }

  .confirm-button {
    --border-radius: 10px;
    --background: linear-gradient(135deg, var(--ion-color-primary), #8b5cf6);
    --background-hover: linear-gradient(135deg, #7c7ff7, #9d6fff);
    --box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
    flex: 1;
    transition: all 0.2s ease;

    &:hover {
      transform: translateY(-2px);
      --box-shadow: 0 8px 25px rgba(99, 102, 241, 0.5);
    }
  }

  // Animation for card entrance
  .animated-card {
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
