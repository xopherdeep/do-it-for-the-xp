<!-- 
  ATM Modal
  This component represents an ATM modal that allows users to view their account summary and perform banking actions such as depositing, withdrawing, and paying down debt.
  It uses Ionic components for the modal, action sheet, and alerts.
  The modal is designed to be responsive and user-friendly, with a focus on providing a seamless banking experience.
  The component is styled with SCSS and includes animations for a smooth user experience.
  The ATM modal is a part of a larger application and interacts with user data to display account information.
  The component is designed to be reusable and can be integrated into different parts of the application as needed.

-->
<template>
  <ion-modal
    ref="modal"
    :is-open="isOpen"
    @didDismiss="onDismiss"
    class="atm-modal fullscreen"
  >
    <ion-header>
      <ion-toolbar color="warning">
        <ion-buttons slot="start">
          <ion-button @click.stop="dismiss" color="rpg">
            <ion-icon slot="icon-only" :icon="closeOutline"></ion-icon>
          </ion-button>
          <i class="fad fa-hand-holding-usd fa-2x"></i>
        </ion-buttons>
        <ion-title>ATM</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding bank-slide rpg-box icon-colors text-center">
      <ion-card v-if="user && user.stats && user.stats.gp">
        <ion-card-header>
          <ion-card-title class="ion-text-center"
            >Account Summary</ion-card-title
          >
        </ion-card-header>
        <ion-card-content>
          <ion-list lines="none">
            <ion-item>
              <i
                class="fad fa-wallet fa-2x max-w-[40px]"
                slot="start"
                color="warning"
              />
              <ion-label>Wallet Balance</ion-label>
              <ion-badge slot="end" color="warning"
                >₲{{ user.stats.gp.wallet }}</ion-badge
              >
            </ion-item>
            <ion-item>
              <i
                class="fad fa-piggy-bank fa-2x max-w-[40px]"
                slot="start"
                color="warning"
              />
              <ion-label>Savings Balance</ion-label>
              <ion-badge slot="end" color="success"
                >₲{{ user.stats.gp.savings }}</ion-badge
              >
            </ion-item>
            <ion-item>
              <i
                class="fad fa-credit-card fa-2x max-w-[40px]"
                slot="start"
                color="warning"
              />
              <ion-label>Current Debt</ion-label>
              <ion-badge slot="end" color="danger"
                >₲{{ user.stats.gp.debt }}</ion-badge
              >
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>
      <ion-card v-else class="ion-padding">
        <ion-card-content>
          <ion-spinner name="crescent"></ion-spinner>
          <p>Loading account information...</p>
        </ion-card-content>
      </ion-card>
      <i class="fad fa-hand-holding-usd fa-8x text-center mt-8 mx-auto"></i>

      <!-- FAB to show action sheet -->
      <ion-fab vertical="bottom" horizontal="center" slot="fixed">
        <ion-fab-button @click="showActions" color="warning">
          <i class="fad fa-calculator-alt fa-2x"></i>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-modal>
</template>

<script lang="ts">
  import { defineComponent, PropType, onMounted, watch, ref } from "vue";
  import {
    closeOutline,
    cashOutline,
    walletOutline,
    alertOutline,
    arrowUpCircleOutline,
    arrowDownCircleOutline,
    cardOutline,
    logOutOutline,
  } from "ionicons/icons";
  import { actionSheetController, alertController } from "@ionic/vue";
  import Ionic from "@/lib/mixins/ionic";
  import { play$fx } from "@/assets/fx";

  export default defineComponent({
    name: "ATMModal",
    mixins: [Ionic],
    props: {
      isOpen: {
        type: Boolean,
        required: true,
      },
      user: {
        type: Object as PropType<any>,
        required: true,
      },
    },
    emits: ["update:isOpen", "deposit", "withdraw", "payDebt"],
    setup(props, { emit }) {
      const modal = ref<any>(null);

      // Dismiss the modal
      const dismiss = async () => {
        play$fx("no");
        await modal.value?.$el?.dismiss();
      };

      const onDismiss = () => {
        emit("update:isOpen", false);
      };

      const handleDeposit = (data: any) => {
        const amount = Number(data.gp); // Ensure it's a number
        if (amount && amount > 0) {
          emit("deposit", { gp: amount });
        }
      };

      const handleWithdraw = (data: any) => {
        const amount = Number(data.gp); // Ensure it's a number
        if (amount && amount > 0) {
          emit("withdraw", { gp: amount });
        }
      };

      const handlePayDebt = (data: any) => {
        const amount = Number(data.gp); // Ensure it's a number
        if (amount && amount > 0) {
          emit("payDebt", { gp: amount });
        }
      };

      const presentDepositAlert = async () => {
        const alert = await alertController.create({
          header: "Deposit to Savings",
          inputs: [
            {
              name: "gp",
              type: "number",
              placeholder: "Enter GP amount",
              min: 1,
              max: props.user?.stats?.gp?.wallet || 0,
            },
          ],
          buttons: [
            {
              text: "Cancel",
              role: "cancel",
            },
            {
              text: "Deposit",
              handler: (data) => handleDeposit(data),
            },
          ],
        });
        await alert.present();
      };

      const presentWithdrawAlert = async () => {
        const savings = props.user?.stats?.gp?.savings || 0;
        const wallet = props.user?.stats?.gp?.wallet || 0;
        const limit = props.user?.stats?.gp?.limit || 0;
        const maxWithdraw = Math.min(savings, limit - wallet); // Can't withdraw more than fits in wallet limit

        const alert = await alertController.create({
          header: "Withdraw from Savings",
          inputs: [
            {
              name: "gp",
              type: "number",
              placeholder: "Enter GP amount",
              min: 1,
              max: maxWithdraw,
            },
          ],
          buttons: [
            {
              text: "Cancel",
              role: "cancel",
            },
            {
              text: "Withdraw",
              handler: (data) => handleWithdraw(data),
            },
          ],
        });
        await alert.present();
      };

      const presentPayDebtAlert = async () => {
        const wallet = props.user?.stats?.gp?.wallet || 0;
        const debt = props.user?.stats?.gp?.debt || 0;
        const maxPay = Math.min(wallet, debt);

        const alert = await alertController.create({
          header: "Pay Down Debt",
          inputs: [
            {
              name: "gp",
              type: "number",
              placeholder: "Enter GP amount",
              min: 1,
              max: maxPay,
            },
          ],
          buttons: [
            {
              text: "Cancel",
              role: "cancel",
            },
            {
              text: "Pay",
              handler: (data) => handlePayDebt(data),
            },
          ],
        });
        await alert.present();
      };

      // Flag to prevent double-opening of the Action Sheet
      const isMenuOpen = ref(false);

      // Show action sheet with banking options
      const showActions = async () => {
        if (isMenuOpen.value) return;
        isMenuOpen.value = true;

        const actionSheet = await actionSheetController.create({
          header: "ATM Options",
          cssClass: "atm-action-sheet",
          mode: "ios",
          buttons: [
            {
              text: "Deposit to Savings",
              icon: arrowUpCircleOutline,
              handler: () => {
                // Action sheet auto-dismisses
                setTimeout(() => presentDepositAlert(), 100);
              },
            },
            {
              text: "Withdraw from Savings",
              icon: arrowDownCircleOutline,
              handler: () => {
                setTimeout(() => presentWithdrawAlert(), 100);
              },
            },
            {
              text: "Pay Down Debt",
              icon: cardOutline,
              handler: () => {
                setTimeout(() => presentPayDebtAlert(), 100);
              },
            },
            {
              text: "Sign Off",
              icon: logOutOutline,
              handler: () => {
                dismiss();
              },
            },
            {
              text: "Cancel",
              icon: closeOutline,
              role: "cancel",
            },
          ],
        });

        await actionSheet.present();

        // Reset guard when sheet closes
        await actionSheet.onDidDismiss();
        isMenuOpen.value = false;
      };

      // Present action sheet on modal open
      onMounted(() => {
        if (props.isOpen) {
          setTimeout(() => {
            showActions();
          }, 500); // Increased delay to ensure modal is fully visible
        }
      });

      // Watch for changes to isOpen to handle auto-open when modal is opened later
      watch(
        () => props.isOpen,
        (isOpen) => {
          if (isOpen) {
            setTimeout(() => {
              showActions();
            }, 500); // Same delay as onMounted for consistency
          }
        }
      );

      return {
        dismiss,
        onDismiss,
        showActions,
        closeOutline,
        cashOutline,
        walletOutline,
        alertOutline,
        arrowUpCircleOutline,
        arrowDownCircleOutline,
        cardOutline,
        logOutOutline,
        modal,
      };
    },
  });
</script>

<style lang="scss" scoped>
  ion-card {
    border-radius: 1rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
      0 2px 4px -1px rgba(0, 0, 0, 0.06);
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  ion-content {
    &#container,
    &.bank-slide {
      --background: transparent;
      background-color: #555;
      background-image: linear-gradient(
          45deg,
          #777 25%,
          transparent 25%,
          transparent 75%,
          #777 75%
        ),
        linear-gradient(
          45deg,
          #777 25%,
          transparent 25%,
          transparent 75%,
          #777 75%
        );
      background-size: 60px 60px;
      background-position: 0 0, 30px 30px;
      animation: slide 4s infinite linear;
    }
  }
</style>
