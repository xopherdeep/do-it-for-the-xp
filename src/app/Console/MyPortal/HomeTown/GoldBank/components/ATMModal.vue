<!-- 
  ATM Modal
  This component represents an ATM modal that allows users to view their account summary and perform banking actions such as depositing, withdrawing, and paying down debt.
  It uses Ionic components for the modal and the game's reveal prompt (menu, amount stepper) for its questions.
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
            <!-- What the Hospital is owed: its own line above debt, and a reminder that the hero is grounded -->
            <ion-item v-if="user.stats.gp.hospitalBill > 0" class="hospital-bill-line">
              <i
                class="fad fa-hospital fa-2x max-w-[40px]"
                slot="start"
                color="warning"
              />
              <ion-label>
                Hospital Bill
                <p>Grounded until it is paid</p>
              </ion-label>
              <ion-badge slot="end" color="danger"
                >₲{{ user.stats.gp.hospitalBill }}</ion-badge
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

      <!-- FAB to show the ATM's menu -->
      <ion-fab vertical="bottom" horizontal="center" slot="fixed">
        <ion-fab-button @click="showActions" color="warning">
          <i class="fad fa-calculator-alt fa-2x"></i>
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <!-- The ATM's questions, in the game's dialog; it rises above the modal -->
    <xp-reveal-prompt :prompt="prompt" @respond="reveal.respond" />
  </ion-modal>
</template>

<script lang="ts">
  import { defineComponent, PropType, onMounted, watch, ref } from "vue";
  import { closeOutline } from "ionicons/icons";
  import Ionic from "@/lib/mixins/ionic";
  import { play$fx } from "@/assets/fx";
  import { useTimers } from "@/hooks/useTimers";
  import { useVoice } from "@/hooks/useVoice";
  import XpRevealPrompt from "@/components/organisms/RevealPrompt/XpRevealPrompt.vue";
  import { useRevealPrompt } from "@/components/organisms/RevealPrompt/useRevealPrompt";
  import { amountAsk, atmMenuPrompt, noticePrompt } from "@/lib/services/gp/bankPrompts";
  import type { BankAction } from "@/lib/services/gp/bankTeller";

  export default defineComponent({
    name: "ATMModal",
    mixins: [Ionic],
    components: { XpRevealPrompt },
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
      const timers = useTimers();
      // The ATM asks in the game's own dialog, not in native sheets and alerts
      const reveal = useRevealPrompt();
      // The ATM's words follow the hero's voice
      const { voice } = useVoice();

      // Dismiss the modal
      const dismiss = async () => {
        play$fx("no");
        await modal.value?.$el?.dismiss();
      };

      const onDismiss = () => {
        emit("update:isOpen", false);
      };

      /**
       * How much: the stepper reaches what the move can take. The bank screen makes the move and reads the receipt, so
       * the ATM only hands the amount over; when the move would move nothing, the teller says why.
       */
      const errand = async (action: BankAction) => {
        const ask = amountAsk(action, props.user?.stats?.gp, undefined, voice.value);
        if ("refusal" in ask) {
          play$fx("no");
          await reveal.ask(noticePrompt(ask.refusal, undefined, "ATM"));
          return;
        }
        const { id, amount } = await reveal.askAmount(ask.prompt);
        if (id !== "ok" || !amount) return;
        emit(action, { gp: amount });
      };

      // Flag to prevent double-opening of the menu
      const isMenuOpen = ref(false);

      // The ATM's menu: deposit, withdraw, pay down, sign off
      const showActions = async () => {
        if (isMenuOpen.value) return;
        isMenuOpen.value = true;
        try {
          const pick = await reveal.ask(atmMenuPrompt(props.user?.stats?.gp, voice.value));
          if (pick === "leave") await dismiss();
          else if (pick === "deposit" || pick === "withdraw" || pick === "payDebt") await errand(pick);
        } finally {
          isMenuOpen.value = false;
        }
      };

      // Present the menu on modal open
      onMounted(() => {
        if (props.isOpen) {
          timers.startTimeout(500, () => {
            showActions();
          }); // Increased delay to ensure modal is fully visible
        }
      });

      // Watch for changes to isOpen to handle auto-open when modal is opened later
      watch(
        () => props.isOpen,
        (isOpen) => {
          if (isOpen) {
            timers.startTimeout(500, () => {
              showActions();
            }); // Same delay as onMounted for consistency
          } else {
            reveal.dismiss();
          }
        }
      );

      return {
        dismiss,
        onDismiss,
        showActions,
        closeOutline,
        modal,
        reveal,
        prompt: reveal.prompt,
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
