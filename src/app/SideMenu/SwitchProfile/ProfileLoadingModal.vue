<template>
  <ion-modal
    :is-open="isOpen"
    class="profile-loading-modal"
    @didDismiss="$emit('close')"
  >
    <ion-content class="modal-content">
      <div class="modal-overlay">
        <ion-card class="loading-card animate__animated animate__zoomIn">
          <ion-card-header>
            <ion-card-title>
              <i class="fad fa-sync fa-spin mr-2 text-primary"></i>
              Loading Profile
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="loading-content">
              <p v-if="userName">
                Loading <strong>{{ userName }}</strong
                >'s stats and achievements...
              </p>
              <p v-else>Preparing your journey...</p>

              <div class="loading-animation">
                <div v-if="userAvatar" class="avatar-container">
                  <img :src="userAvatar" class="profile-avatar" />
                </div>
                <i
                  v-else
                  class="fad fa-user-astronaut fa-3x fa-bounce text-primary"
                ></i>
              </div>

              <div class="progress-bar">
                <div class="progress-fill"></div>
              </div>
            </div>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script lang="ts">
  import { defineComponent } from "vue";
  import ionic from "@/lib/mixins/ionic";
  export default defineComponent({
    name: "ProfileLoadingModal",
    mixins: [ionic],
    props: {
      isOpen: {
        type: Boolean,
        default: false,
      },
      userName: {
        type: String,
        default: "",
      },
      userAvatar: {
        type: String,
        default: "",
      },
    },
    emits: ["close"],
  });
</script>

<style lang="scss" scoped>
  .profile-loading-modal {
    --backdrop-opacity: 0.9;
    --width: 100%;
    --height: 100%;

    .modal-content {
      --background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-overlay {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      width: 100%;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(8px);
    }

    .loading-card {
      max-width: 90%;
      width: 320px;
      border-radius: 20px;
      background: rgba(var(--ion-color-light-rgb), 0.9);
      border: 1px solid rgba(var(--ion-color-primary-rgb), 0.2);
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
      overflow: hidden;

      ion-card-header {
        background: rgba(var(--ion-color-primary-rgb), 0.1);
        border-bottom: 1px solid rgba(var(--ion-color-primary-rgb), 0.1);
      }

      ion-card-title {
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        color: var(--ion-color-primary);
        font-size: 1.3rem;
      }
    }

    .loading-content {
      padding: 1.5rem 1rem;
      text-align: center;

      p {
        margin-bottom: 1.5rem;
        font-size: 1rem;
        color: var(--ion-color-dark);
        line-height: 1.4;
      }
    }

    .loading-animation {
      margin: 2rem 0;
      display: flex;
      justify-content: center;

      i {
        filter: drop-shadow(0 0 10px rgba(var(--ion-color-primary-rgb), 0.4));
      }

      .avatar-container {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        background: white;
        padding: 10px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        border: 3px solid var(--ion-color-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: bounce 2s infinite ease-in-out;

        .profile-avatar {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
      }
    }

    @keyframes bounce {
      0%,
      100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-10px);
      }
    }

    .progress-bar {
      width: 100%;
      height: 6px;
      background: rgba(var(--ion-color-primary-rgb), 0.1);
      border-radius: 3px;
      margin-top: 1rem;
      overflow: hidden;
      position: relative;

      .progress-fill {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 30%;
        background: var(--ion-color-primary);
        border-radius: 3px;
        animation: progress-move 2s infinite ease-in-out;
      }
    }
  }

  @keyframes progress-move {
    0% {
      left: -30%;
      width: 30%;
    }
    50% {
      width: 60%;
    }
    100% {
      left: 100%;
      width: 10%;
    }
  }
</style>
