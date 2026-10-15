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

<style lang="scss" scoped>
  .atm-toolbar {
    --background: #11171f;
    --color: #e2e8f0;
    --border-color: #334155;
    border-bottom: 2px solid #233044;
  }

  .atm-header-btn {
    --color: #e2e8f0;
  }

  .atm-header-icon {
    font-size: 1.5rem;
    color: #eebd34;
    margin-left: 0.5rem;
  }

  .atm-title {
    font-family: "StatusPlz", monospace;
    letter-spacing: 0.08em;
    font-size: 1rem;
    color: #cbd5e1;
  }

  .atm-content {
    --background: #0f1318;
    background-color: #0f1318;
  }

  .atm-kiosk-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100%;
    padding: 1rem 0.5rem 5rem 0.5rem;
  }

  /* Main ATM Kiosk Chassis */
  .atm-cabinet {
    width: 100%;
    max-width: 600px;
    background: linear-gradient(180deg, #28313e 0%, #1c232d 100%);
    border: 3px solid #3d4a5b;
    border-radius: 12px;
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.1);
    overflow: hidden;
  }

  /* Marquee Top Banner */
  .atm-marquee {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 1rem;
    background: #151a22;
    border-bottom: 3px solid #0f141a;
  }

  .atm-marquee__led-row {
    display: flex;
    gap: 4px;
  }

  .atm-led {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 6px #10b981;
  }

  .atm-marquee__brand {
    font-family: "Apple Kid", sans-serif;
    font-size: 1.15rem;
    font-weight: bold;
    color: #eebd34;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
  }

  .atm-marquee__status {
    font-family: "StatusPlz", monospace;
    font-size: 0.8rem;
    color: #34d399;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .atm-status-pulse {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #34d399;
    box-shadow: 0 0 8px #34d399;
    animation: pulse 1.6s infinite ease-in-out;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.8); }
  }

  /* Monitor Bezel Housing */
  .atm-bezel {
    position: relative;
    padding: 1rem 1.25rem;
    background: linear-gradient(180deg, #182029 0%, #10151c 100%);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .atm-bezel__keys {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 0 8px;
  }

  .atm-key-bump {
    width: 14px;
    height: 14px;
    background: #334155;
    border: 2px solid #1e293b;
    border-radius: 3px;
    box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.2);
  }

  /* Phosphor CRT Screen */
  .atm-crt-screen {
    position: relative;
    width: 100%;
    background: #06150b;
    border: 4px solid #040d07;
    border-radius: 8px;
    padding: 1rem;
    box-shadow: inset 0 0 24px rgba(0, 0, 0, 0.9), 0 0 12px rgba(16, 185, 129, 0.15);
    overflow: hidden;
  }

  /* CRT Scanlines and curvature */
  .atm-crt-scanlines {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(
      rgba(18, 16, 16, 0) 50%,
      rgba(0, 0, 0, 0.35) 50%
    );
    background-size: 100% 4px;
    z-index: 10;
  }

  .atm-crt-glare {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 38%;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.05) 0%,
      rgba(255, 255, 255, 0) 100%
    );
    pointer-events: none;
    z-index: 11;
  }

  .atm-screen-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px dashed #14532d;
    padding-bottom: 0.4rem;
    margin-bottom: 0.75rem;
    font-family: "StatusPlz", monospace;
    font-size: 0.75rem;
    color: #4ade80;
    letter-spacing: 0.06em;
  }

  .atm-screen-body {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .atm-readout-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.45rem 0.6rem;
    background: rgba(4, 34, 17, 0.45);
    border: 1px solid rgba(34, 197, 94, 0.2);
    border-radius: 4px;
  }

  .atm-readout-row--warning {
    border-color: rgba(239, 68, 68, 0.4);
    background: rgba(45, 10, 10, 0.35);
  }

  .atm-readout-col {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .atm-readout-col--label {
    font-family: "StatusPlz", monospace;
    font-size: 0.85rem;
    color: #86efac;
    letter-spacing: 0.04em;
  }

  .atm-subnote {
    font-size: 0.65rem;
    color: #f87171;
  }

  .atm-readout-icon {
    font-size: 1.25rem;
    width: 24px;
    text-align: center;
    color: #4ade80;
  }

  .atm-readout-col--value {
    font-family: "StatusPlz", monospace;
    font-size: 1.1rem;
    font-weight: bold;
    letter-spacing: 0.05em;
  }

  .atm-glow-green {
    color: #4ade80;
    text-shadow: 0 0 6px rgba(74, 222, 128, 0.6);
  }

  .atm-glow-gold {
    color: #fde047;
    text-shadow: 0 0 6px rgba(253, 224, 71, 0.6);
  }

  .atm-glow-red {
    color: #f87171;
    text-shadow: 0 0 6px rgba(248, 113, 113, 0.6);
  }

  .atm-screen-actions {
    margin-top: 0.75rem;
    padding-top: 0.5rem;
    border-top: 1px dashed #14532d;
    text-align: center;
  }

  .atm-action-prompt {
    font-family: "StatusPlz", monospace;
    font-size: 0.75rem;
    color: #a7f3d0;
    margin-bottom: 0.5rem;
  }

  .atm-blink-cursor {
    display: inline-block;
    animation: cursorBlink 1s infinite;
  }

  @keyframes cursorBlink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }

  .atm-screen-btn {
    font-family: "StatusPlz", monospace;
    background: #0f3d22;
    color: #86efac;
    border: 1px solid #22c55e;
    padding: 0.4rem 0.85rem;
    border-radius: 4px;
    cursor: pointer;
    letter-spacing: 0.05em;
    font-size: 0.85rem;
    transition: all 0.15s ease-in-out;

    &:hover, &:focus {
      background: #15803d;
      color: #ffffff;
      box-shadow: 0 0 10px rgba(34, 197, 94, 0.6);
    }
  }

  .atm-screen-loading {
    padding: 2rem 1rem;
    text-align: center;
  }

  .atm-loading-text {
    font-family: "StatusPlz", monospace;
    color: #4ade80;
    font-size: 0.85rem;
    margin-top: 0.75rem;
  }

  /* Lower Deck: Card Slot & Keypad */
  .atm-lower-deck {
    display: flex;
    justify-content: space-between;
    gap: 1.5rem;
    padding: 1.25rem;
    background: #182029;
    border-top: 3px solid #10151c;
  }

  .atm-hardware-bay {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    justify-content: center;
  }

  .atm-slot {
    background: #0f141a;
    border: 2px solid #283340;
    border-radius: 4px;
    padding: 0.5rem;
    text-align: center;
  }

  .atm-slot__slit {
    height: 6px;
    background: #040608;
    border-radius: 3px;
    box-shadow: inset 0 2px 4px #000;
    margin-bottom: 0.35rem;
  }

  .atm-slot--card .atm-slot__indicator {
    width: 12px;
    height: 4px;
    background: #10b981;
    box-shadow: 0 0 6px #10b981;
    margin: 0 auto 0.3rem auto;
    border-radius: 2px;
  }

  .atm-slot__label {
    font-family: "StatusPlz", monospace;
    font-size: 0.65rem;
    color: #94a3b8;
    letter-spacing: 0.06em;
  }

  /* Metallic tactile keypad */
  .atm-keypad {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: #0d1217;
    padding: 8px;
    border: 2px solid #2c3848;
    border-radius: 6px;
  }

  .atm-keypad__row {
    display: flex;
    gap: 4px;
  }

  .atm-key {
    width: 28px;
    height: 24px;
    background: linear-gradient(180deg, #475569 0%, #334155 100%);
    border: 1px solid #64748b;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: "StatusPlz", monospace;
    font-size: 0.75rem;
    color: #f1f5f9;
    box-shadow: 0 2px 0 #1e293b;
    cursor: default;
    user-select: none;
  }

  // ENT is a real button (the only key that does anything); it keeps the look of the painted keys
  button.atm-key {
    margin: 0;
    padding: 0;
    line-height: 1;
    cursor: pointer;
  }

  .atm-key--cancel {
    background: linear-gradient(180deg, #dc2626 0%, #b91c1c 100%);
    font-size: 0.6rem;
  }

  .atm-key--clear {
    background: linear-gradient(180deg, #d97706 0%, #b45309 100%);
    font-size: 0.6rem;
  }

  .atm-key--enter {
    background: linear-gradient(180deg, #16a34a 0%, #15803d 100%);
    font-size: 0.6rem;
    cursor: pointer;

    &:hover {
      box-shadow: 0 0 6px #22c55e;
    }
  }

  .atm-key--blank {
    background: transparent;
    border-color: transparent;
    box-shadow: none;
  }

  .atm-fab-btn {
    --box-shadow: 0 4px 14px rgba(234, 179, 8, 0.4);
  }
</style>

