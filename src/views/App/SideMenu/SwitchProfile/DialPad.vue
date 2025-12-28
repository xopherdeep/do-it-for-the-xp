<template>
  <ion-header>
    <ion-toolbar class="rpg-box">
      <ion-buttons slot="start">
        <ion-back-button
          default-href="/"
          @click.prevent="dismiss"
        ></ion-back-button>

        <ion-icon
          :ios="fingerPrintOutline"
          :md="fingerPrintSharp"
          class="fa-2x ml-2"
        />
      </ion-buttons>
      <ion-title class="earthbound-title">

        Enter Your Passcode </ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content class="bg-slide bg-slide-modal ion-padding dialpad-content">
    <div class="dialpad-container">
      <!-- Profile Card -->
      <div class="profile-card rpg-box">
        <ion-avatar class="profile-avatar">
          <ion-img
            v-if="profile?.avatar"
            :src="currentAvatar"
          />
        </ion-avatar>
        <div class="profile-info">
          <h2 class="profile-name earthbound-text">{{ profile?.name?.full }}</h2>
          <p
            class="profile-aka"
            v-if="profile?.name?.nick"
          >
            aka {{ profile?.name?.nick }}
          </p>
        </div>
        <div class="profile-icons icon-colors">
          <i :class="`fad ${selectedJobIcon} fa-2x`" />
          <i :class="`fad ${selectedFoodIcon} fa-2x`" />
        </div>
      </div>

      <!-- Dialpad -->
      <div class="dial-pad rpg-box">
        <!-- Passcode Display Row -->
        <div class="passcode-display">
          <div class="passcode-dots">
            <span
              v-for="i in 4"
              :key="i"
              class="dot"
              :class="{ filled: inputCode.length >= i, error: hasError }"
            >
              <template v-if="showPass && inputCode.length >= i">
                {{ inputCode[i - 1] }}
              </template>
            </span>
          </div>
        </div>

        <ion-grid>
          <ion-row>
            <ion-col
              v-for="n in [1, 2, 3]"
              :key="n"
            >
              <ion-button
                expand="block"
                fill="clear"
                class="dial-button"
                :disabled="inputCode.length >= 4"
                @click="appendToCode(n)"
              >
                {{ n }}
              </ion-button>
            </ion-col>
          </ion-row>
          <ion-row>
            <ion-col
              v-for="n in [4, 5, 6]"
              :key="n"
            >
              <ion-button
                expand="block"
                fill="clear"
                class="dial-button"
                :disabled="inputCode.length >= 4"
                @click="appendToCode(n)"
              >
                {{ n }}
              </ion-button>
            </ion-col>
          </ion-row>
          <ion-row>
            <ion-col
              v-for="n in [7, 8, 9]"
              :key="n"
            >
              <ion-button
                expand="block"
                fill="clear"
                class="dial-button"
                :disabled="inputCode.length >= 4"
                @click="appendToCode(n)"
              >
                {{ n }}
              </ion-button>
            </ion-col>
          </ion-row>
          <ion-row>
            <ion-col>
              <ion-button
                expand="block"
                fill="clear"
                class="dial-button action-button"
                @click="removeLastDigit()"
              >
                <xp-icon icon="backspace" />
              </ion-button>
            </ion-col>
            <ion-col>
              <ion-button
                expand="block"
                fill="clear"
                class="dial-button"
                :disabled="inputCode.length >= 4"
                @click="appendToCode(0)"
              >
                0
              </ion-button>
            </ion-col>
            <ion-col>
              <ion-button
                expand="block"
                fill="clear"
                class="dial-button action-button"
                @click="clearCode()"
              >
                <xp-icon icon="trash" />
              </ion-button>
            </ion-col>
          </ion-row>

          <!-- Action Row -->
          <ion-row class="action-row">
            <ion-col size="4">
              <ion-button
                expand="block"
                fill="clear"
                class="dial-button action-button"
                @click="toggleShowPass"
              >
                <i
                  class="fad fa-lg"
                  :class="hideIcon"
                />
              </ion-button>
            </ion-col>
            <ion-col size="8">
              <ion-button
                expand="block"
                fill="clear"
                class="dial-button unlock-button"
                :class="{ 'unlock-ready': isPasscodeValid }"
                :disabled="!isPasscodeValid"
                @click="clickUnlock"
              >
                <i class="fad fa-lock-open" />
                <span class="unlock-text">Unlock</span>
              </ion-button>
            </ion-col>
          </ion-row>
        </ion-grid>
      </div>
    </div>
  </ion-content>
</template>

<script lang="ts">
  import {
    modalController,
    alertController,
    toastController,
    IonBackButton,
  } from "@ionic/vue";
  import ionic from "@/mixins/ionic";
  import XpIcon from "@/components/atoms/Icon/XpIcon.vue";
  import { defineComponent, onUnmounted, computed, ref } from "vue";
  import { FOOD_OPTIONS, JOB_CLASS_OPTIONS } from "@/constants";
  import debug from "@/lib/utils/debug";
  import { fingerPrintOutline, fingerPrintSharp } from "ionicons/icons";


  const $requireAvatar = require.context("@/assets/images/avatars", false, /\.svg$/);

  const KeyPad = defineComponent({
    props: ["profile"],
    mixins: [ionic],
    components: {
      XpIcon,
      IonBackButton,
    },
    setup(props) {
      debug.log("Setting up DialPad for profile:", props.profile?.username || "Unknown user");

      const inputCode = ref("");
      const showPass = ref(false);
      const hasError = ref(false);

      // Avatar
      const currentAvatar = computed(() => {
        if (!props.profile?.avatar) return null;
        try {
          return $requireAvatar(`./${props.profile.avatar}.svg`);
        } catch {
          return $requireAvatar("./001-gamer.svg");
        }
      });

      // Icons
      const selectedFoodIcon = computed(() => {
        const findFavoriteFood = (food: any) => food.value === props.profile?.favoriteFood;
        const selectedFood = FOOD_OPTIONS.find(findFavoriteFood);
        return selectedFood ? selectedFood.icon : "fa-utensils";
      });

      const selectedJobIcon = computed(() => {
        const findJobClass = (job: any) => job?.name === props.profile?.jobClass;
        const selectedJob = JOB_CLASS_OPTIONS.find(findJobClass);
        return selectedJob ? selectedJob.icon : "fa-shield-alt";
      });

      onUnmounted(() => {
        try {
          modalController.dismiss().catch(() => {});
        } catch (e) {
          debug.log("Error during cleanup:", e);
        }
      });

      const lockIcon = computed(() => {
        return inputCode.value.length === 4 ? "fa-lock-open" : "fa-lock";
      });

      const hideIcon = computed(() => {
        return showPass.value ? "fa-eye" : "fa-eye-slash";
      });

      const passwordProxy = computed(() => {
        return showPass.value ? inputCode.value : inputCode.value.replace(/./g, "●");
      });

      const isPasscodeValid = computed(() => {
        return inputCode.value.length === 4;
      });

      const dismiss = async () => {
        await modalController.dismiss();
      };

      const clickUnlock = async () => {
        debug.log(`Attempting to unlock profile with code: ${inputCode.value.replace(/./g, '*')}`);

        if (inputCode.value !== props.profile.passcode) {
          hasError.value = true;
          setTimeout(() => {
            hasError.value = false;
            inputCode.value = "";
          }, 500);
          alertIncorrectPasscode();
        } else {
          const toast = await toastController.create({
            message: "Profile unlocked",
            duration: 1500,
            position: "top",
          });
          await toast.present();

          setTimeout(() => {
            modalController.dismiss(props.profile);
          }, 300);
        }
      };

      const toggleShowPass = () => {
        showPass.value = !showPass.value;
      };

      const appendToCode = (digit: number) => {
        if (inputCode.value.length < 4) {
          inputCode.value += digit;
        }
      };

      const removeLastDigit = () => {
        inputCode.value = inputCode.value.slice(0, -1);
      };

      const clearCode = () => {
        inputCode.value = "";
      };

      const alertIncorrectPasscode = async () => {
        const alert = await alertController.create({
          mode: "ios",
          header: "Passcode Incorrect",
          message: "The passcode you entered was not valid. Please try again.",
          buttons: [
            {
              text: "OK",
              role: "confirm",
            },
          ],
        });
        alert.present();
      };

      return {
        inputCode,
        showPass,
        hasError,
        currentAvatar,
        selectedFoodIcon,
        selectedJobIcon,
        lockIcon,
        hideIcon,
        passwordProxy,
        isPasscodeValid,
        dismiss,
        clickUnlock,
        toggleShowPass,
        appendToCode,
        removeLastDigit,
        clearCode,
        fingerPrintOutline,
        fingerPrintSharp,
      };
    },
  });

  export default KeyPad;
</script>

<style lang="scss" scoped>
  .dialpad-content {
    --padding-top: 1rem;
    --padding-bottom: 1rem;
    --padding-start: 1rem;
    --padding-end: 1rem;
  }

  .dialpad-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    max-width: 400px;
    margin: 0 auto;
    gap: 1.5rem;
    height: 100%;
  }

  // Profile Card
  .profile-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.25rem;
    width: 100%;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 12px;
  }

  .profile-avatar {
    width: 60px;
    height: 60px;
    flex-shrink: 0;

    ion-img {
      width: 100%;
      height: 100%;
    }
  }

  .profile-info {
    flex: 1;
    min-width: 0;
  }

  .profile-name {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
  }

  .profile-aka {
    margin: 0.25rem 0 0;
    font-size: 0.85rem;
    color: var(--ion-color-success);
    font-style: italic;
  }

  .profile-icons {
    display: flex;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  // Dialpad
  .dial-pad {
    width: 100%;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 12px;
  }

  // Passcode Display (inside dialpad)
  .passcode-display {
    padding: 1rem 0;
    margin-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .passcode-dots {
    display: flex;
    gap: 1.25rem;
    justify-content: center;
  }

  .dot {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    font-weight: bold;
    color: var(--ion-color-success);
    transition: all 0.2s ease;

    &.filled {
      background: var(--ion-color-success);
      border-color: var(--ion-color-success);
      box-shadow: 0 0 12px rgba(var(--ion-color-success-rgb), 0.5);
      color: #000;
    }

    &.error {
      background: var(--ion-color-danger);
      border-color: var(--ion-color-danger);
      animation: shake 0.4s ease;
      color: #fff;
    }
  }

  @keyframes shake {

    0%,
    100% {
      transform: translateX(0);
    }

    20%,
    60% {
      transform: translateX(-4px);
    }

    40%,
    80% {
      transform: translateX(4px);
    }
  }

  .dial-button {
    --padding-top: 1rem;
    --padding-bottom: 1rem;
    font-size: 1.5rem;
    font-weight: 600;
    min-height: 56px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.25);
    }

    &:active:not(:disabled) {
      transform: scale(0.95);
      background: rgba(255, 255, 255, 0.15);
    }

    &.action-button {
      font-size: 1.25rem;
    }
  }

  .action-row {
    margin-top: 0.5rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .unlock-button {
    border-color: rgba(255, 255, 255, 0.2);

    .unlock-text {
      margin-left: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    &.unlock-ready {
      border-color: var(--ion-color-success);
      background: rgba(var(--ion-color-success-rgb), 0.15);
      color: var(--ion-color-success);

      &:hover {
        background: rgba(var(--ion-color-success-rgb), 0.25);
      }
    }

    &:disabled {
      opacity: 0.4;
    }
  }
</style>
