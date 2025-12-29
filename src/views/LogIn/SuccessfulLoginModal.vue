<template>
  <ion-modal :is-open="isOpen" class="success-modal">
    <ion-content class="modal-content">
      <ion-card class="success-card animate__animated animate__fadeInUp">
        <ion-card-header>
          <ion-card-title>
            <ion-icon
              name="checkmark-circle"
              color="success"
              class="success-icon"
            ></ion-icon>
            Login Successful
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div class="success-content">
            <p>
              You have successfully logged in! Hold tight while we load your
              profile.
            </p>
            <div class="success-animation">
              <ion-spinner name="crescent" color="success"></ion-spinner>
            </div>
            <ion-button
              @click="$emit('close')"
              expand="block"
              color="success"
              class="continue-button"
            >
              Continue to Profile
              <ion-icon name="arrow-forward-outline" slot="end"></ion-icon>
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-modal>
</template>

<script lang="ts">
  import { defineComponent } from "vue";
  import ionic from "@/lib/mixins/ionic";

  export default defineComponent({
    name: "SuccessfulLoginModal",
    mixins: [ionic],
    props: {
      isOpen: {
        type: Boolean,
        default: false,
      },
    },
    emits: ["close"],
  });
</script>

<style lang="scss" scoped>
  .success-modal {
    --backdrop-opacity: 0.8;

    .modal-content {
      --background: rgba(10, 10, 30, 0.8);
      --padding: 2rem;

      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
    }

    .success-card {
      max-width: 90%;
      width: 400px;
      border-radius: 12px;
      background: rgba(20, 20, 40, 0.95);
      border: 2px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
      overflow: visible;

      ion-card-header {
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      ion-card-title {
        display: flex;
        align-items: center;
        gap: 10px;
        color: white;
        font-size: 1.2rem;
      }

      .success-icon {
        font-size: 1.8rem;
        --ionicon-stroke-width: 32px;
      }
    }

    .success-content {
      padding: 1rem;
      text-align: center;

      p {
        margin-bottom: 2rem;
        font-size: 1.1rem;
        color: white;
        line-height: 1.5;
      }
    }

    .success-animation {
      margin: 1.5rem 0;
      display: flex;
      justify-content: center;

      ion-spinner {
        width: 50px;
        height: 50px;
      }
    }

    .continue-button {
      margin-top: 1.5rem;
      --border-radius: 8px;
      height: 48px;
      font-weight: bold;

      ion-icon {
        margin-left: 5px;
      }
    }
  }
</style>
