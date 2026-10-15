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
      <ion-toolbar class="atm-toolbar">
        <ion-buttons slot="start">
          <ion-button @click.stop="dismiss" class="atm-header-btn">
            <ion-icon slot="icon-only" :icon="closeOutline"></ion-icon>
          </ion-button>
          <i class="fad fa-money-check-alt atm-header-icon"></i>
        </ion-buttons>
        <ion-title class="atm-title">AUTOMATED TELLER MACHINE</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="atm-content">
      <div class="atm-kiosk-wrapper">
        <!-- ATM Cabinet Housing -->
        <div class="atm-cabinet">
          <!-- Top marquee banner -->
          <div class="atm-marquee">
            <div class="atm-marquee__led-row">
              <span class="atm-led"></span>
              <span class="atm-led"></span>
              <span class="atm-led"></span>
            </div>
            <div class="atm-marquee__brand">
              <i class="fad fa-coins mr-1"></i>
              <span>HOMETOWN NATIONAL BANK</span>
            </div>
            <div class="atm-marquee__status">
              <span class="atm-status-pulse"></span>
              <span>ONLINE</span>
            </div>
          </div>

          <!-- Outer Monitor Bezel -->
          <div class="atm-bezel">
            <!-- Left tactile CRT function keys -->
            <div class="atm-bezel__keys atm-bezel__keys--left" aria-hidden="true">
              <span class="atm-key-bump"></span>
              <span class="atm-key-bump"></span>
              <span class="atm-key-bump"></span>
            </div>

            <!-- CRT Screen Monitor Container -->
            <div class="atm-crt-screen">
              <div class="atm-crt-scanlines"></div>
              <div class="atm-crt-glare"></div>

              <!-- Terminal Screen Header -->
              <div class="atm-screen-header">
                <div class="atm-screen-header__terminal-id">TERMINAL #402</div>
                <div class="atm-screen-header__title">ACCOUNT STATEMENT</div>
                <div class="atm-screen-header__sys">SECURE LINK</div>
              </div>

              <!-- Terminal Readout Content -->
              <div v-if="user && user.stats && user.stats.gp" class="atm-screen-body">
                <div class="atm-readout-row">
                  <div class="atm-readout-col atm-readout-col--label">
                    <i class="fad fa-wallet atm-readout-icon"></i>
                    <span>CASH ON HAND (WALLET)</span>
                  </div>
                  <div class="atm-readout-col atm-readout-col--value atm-glow-gold">
                    ₲{{ user.stats.gp.wallet }}
                  </div>
                </div>

                <div class="atm-readout-row">
                  <div class="atm-readout-col atm-readout-col--label">
                    <i class="fad fa-piggy-bank atm-readout-icon"></i>
                    <span>SAVINGS BALANCE</span>
                  </div>
                  <div class="atm-readout-col atm-readout-col--value atm-glow-green">
                    ₲{{ user.stats.gp.savings }}
                  </div>
                </div>

                <div v-if="user.stats.gp.hospitalBill > 0" class="atm-readout-row atm-readout-row--warning">
                  <div class="atm-readout-col atm-readout-col--label">
                    <i class="fad fa-hospital atm-readout-icon"></i>
                    <div>
                      <div>HOSPITAL BILL (RESTRICTED)</div>
                      <div class="atm-subnote">TRAVEL PERMIT SUSPENDED</div>
                    </div>
                  </div>
                  <div class="atm-readout-col atm-readout-col--value atm-glow-red">
                    ₲{{ user.stats.gp.hospitalBill }}
                  </div>
                </div>

                <div class="atm-readout-row">
                  <div class="atm-readout-col atm-readout-col--label">
                    <i class="fad fa-credit-card atm-readout-icon"></i>
                    <span>OUTSTANDING DEBT</span>
                  </div>
                  <div class="atm-readout-col atm-readout-col--value" :class="user.stats.gp.debt > 0 ? 'atm-glow-red' : 'atm-glow-green'">
                    ₲{{ user.stats.gp.debt }}
                  </div>
                </div>

                <!-- Simulated On-Screen Action Guides -->
                <div class="atm-screen-actions">
                  <div class="atm-action-prompt">
                    <span class="atm-blink-cursor">&gt;</span> SELECT TRANSACTION BELOW OR TAP ACTION KEY
                  </div>
                  <div class="atm-action-buttons">
                    <button type="button" class="atm-screen-btn" @click="showActions">
                      <i class="fad fa-calculator-alt mr-1"></i> [OPEN ATM MENU]
                    </button>
                  </div>
                </div>
              </div>

              <!-- Loading State -->
              <div v-else class="atm-screen-loading">
                <ion-spinner name="crescent" color="warning"></ion-spinner>
                <p class="atm-loading-text">COMMUNICATING WITH HOMETOWN MAINFRAME...</p>
              </div>
            </div>

            <!-- Right tactile CRT function keys -->
            <div class="atm-bezel__keys atm-bezel__keys--right" aria-hidden="true">
              <span class="atm-key-bump"></span>
              <span class="atm-key-bump"></span>
              <span class="atm-key-bump"></span>
            </div>
          </div>

          <!-- Physical Machine Lower Deck (Card slot, keypad, cash slot) -->
          <div class="atm-lower-deck">
            <!-- Card Reader Slot -->
            <div class="atm-hardware-bay">
              <div class="atm-slot atm-slot--card">
                <div class="atm-slot__indicator"></div>
                <div class="atm-slot__slit"></div>
                <div class="atm-slot__label">INSERT CARD</div>
              </div>

              <!-- Cash Dispenser Slot -->
              <div class="atm-slot atm-slot--cash">
                <div class="atm-slot__slit"></div>
                <div class="atm-slot__label">CASH DISPENSER</div>
              </div>
            </div>

            <!-- Metallic Keypad -->
            <div class="atm-keypad" aria-hidden="true">
              <div class="atm-keypad__row">
                <span class="atm-key">1</span>
                <span class="atm-key">2</span>
                <span class="atm-key">3</span>
                <span class="atm-key atm-key--cancel">CAN</span>
              </div>
              <div class="atm-keypad__row">
                <span class="atm-key">4</span>
                <span class="atm-key">5</span>
                <span class="atm-key">6</span>
                <span class="atm-key atm-key--clear">CLR</span>
              </div>
              <div class="atm-keypad__row">
                <span class="atm-key">7</span>
                <span class="atm-key">8</span>
                <span class="atm-key">9</span>
                <button type="button" tabindex="-1" class="atm-key atm-key--enter" @click="showActions">ENT</button>
              </div>
              <div class="atm-keypad__row">
                <span class="atm-key">*</span>
                <span class="atm-key">0</span>
                <span class="atm-key">#</span>
                <span class="atm-key atm-key--blank"></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action FAB button -->
      <ion-fab vertical="bottom" horizontal="center" slot="fixed">
        <ion-fab-button @click="showActions" color="warning" class="atm-fab-btn">
          <i class="fad fa-calculator-alt fa-2x"></i>
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <!-- The ATM questions dialog rises above modal -->
    <xp-reveal-prompt :prompt="prompt" @respond="reveal.submitAnswer" />
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
      const reveal = useRevealPrompt();
      const { voice } = useVoice();

      const dismiss = async () => {
        play$fx("no");
        await modal.value?.$el?.dismiss();
      };

      const onDismiss = () => {
        emit("update:isOpen", false);
      };

      const errand = async (action: BankAction) => {
        const ask = amountAsk(action, props.user?.stats?.gp, "ATM", voice.value);
        if ("refusal" in ask) {
          play$fx("no");
          await reveal.showPrompt(noticePrompt(ask.refusal, undefined, "ATM"));
          return;
        }
        const { id, amount } = await reveal.showAmountPrompt(ask.prompt);
        if (id !== "ok" || !amount) return;
        emit(action, { gp: amount });
      };

      const isMenuOpen = ref(false);

      const showActions = async () => {
        if (isMenuOpen.value) return;
        isMenuOpen.value = true;
        try {
          const pick = await reveal.showPrompt(atmMenuPrompt(props.user?.stats?.gp, voice.value));
          if (pick === "leave") await dismiss();
          else if (pick === "deposit" || pick === "withdraw" || pick === "payDebt") await errand(pick);
        } finally {
          isMenuOpen.value = false;
        }
      };

      onMounted(() => {
        if (props.isOpen) {
          timers.startTimeout(500, () => {
            showActions();
          });
        }
      });

      watch(
        () => props.isOpen,
        (isOpen) => {
          if (isOpen) {
            timers.startTimeout(500, () => {
              showActions();
            });
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

<style lang="scss" scoped src="./_ATMModal.scss" />

