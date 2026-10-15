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
      <ion-title class="earthbound-title"> Enter Your Passcode </ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content class="bg-slide bg-slide-modal ion-padding dialpad-content">
    <div class="dialpad-container">
      <!-- Profile Card -->
      <div class="profile-card rpg-box">
        <ion-avatar class="profile-avatar">
          <ion-img v-if="profile?.avatarImage || profile?.avatar" :src="currentAvatar" />
        </ion-avatar>
        <div class="profile-info">
          <h2 class="profile-name earthbound-text">
            {{ profile?.name?.full }}
          </h2>
          <p class="profile-aka" v-if="profile?.name?.nick">
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
              <template v-if="inputCode.length >= i">
                {{ showPass ? inputCode[i - 1] : "*" }}
              </template>
            </span>
          </div>
        </div>

        <ion-grid>
          <ion-row>
            <ion-col v-for="n in [1, 2, 3]" :key="n">
              <ion-button
                expand="block"
                fill="clear"
                class="dial-button"
                :disabled="inputCode.length >= 4"
                @pointerdown="appendToCode(n)"
              >
                {{ n }}
              </ion-button>
            </ion-col>
          </ion-row>
          <ion-row>
            <ion-col v-for="n in [4, 5, 6]" :key="n">
              <ion-button
                expand="block"
                fill="clear"
                class="dial-button"
                :disabled="inputCode.length >= 4"
                @pointerdown="appendToCode(n)"
              >
                {{ n }}
              </ion-button>
            </ion-col>
          </ion-row>
          <ion-row>
            <ion-col v-for="n in [7, 8, 9]" :key="n">
              <ion-button
                expand="block"
                fill="clear"
                class="dial-button"
                :disabled="inputCode.length >= 4"
                @pointerdown="appendToCode(n)"
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
                @pointerdown="removeLastDigit()"
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
                @pointerdown="appendToCode(0)"
              >
                0
              </ion-button>
            </ion-col>
            <ion-col>
              <ion-button
                expand="block"
                fill="clear"
                class="dial-button action-button"
                @pointerdown="clearCode()"
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
                <i class="fad fa-lg" :class="hideIcon" />
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
  import ionic from "@/lib/mixins/ionic";
  import XpIcon from "@/components/atoms/Icon/XpIcon.vue";
  import { defineComponent, onUnmounted, computed, ref } from "vue";
  import { FOOD_OPTIONS, JOB_CLASS_OPTIONS } from "@/constants";
  import debug from "@/lib/utils/debug";
  import { heroAvatarSrc } from "@/lib/hero-look/look";
  import { fingerPrintOutline, fingerPrintSharp } from "ionicons/icons";
  import { play$fx } from "@/assets/fx";
  import { useTimers } from "@/hooks/useTimers";

  const $requireAvatar = require.context(
    "@/assets/images/avatars",
    false,
    /\.svg$/
  );

  const KeyPad = defineComponent({
    props: ["profile"],
    mixins: [ionic],
    components: {
      XpIcon,
      IonBackButton,
    },
    setup(props) {
      debug.log(
        "Setting up DialPad for profile:",
        props.profile?.username || "Unknown user"
      );

      const inputCode = ref("");
      const showPass = ref(false);
      const hasError = ref(false);
      const timers = useTimers();

      // Avatar
      const currentAvatar = computed(() => {
        const hasNoAvatar = !props.profile?.avatarImage && !props.profile?.avatar;
        if (hasNoAvatar) return null;
        return heroAvatarSrc(props.profile, $requireAvatar) || $requireAvatar("./001-gamer.svg");
      });

      // Icons
      const selectedFoodIcon = computed(() => {
        const findFavoriteFood = (food: any) =>
          food.value === props.profile?.favoriteFood;
        const selectedFood = FOOD_OPTIONS.find(findFavoriteFood);
        return selectedFood ? selectedFood.icon : "fa-utensils";
      });

      const selectedJobIcon = computed(() => {
        const findJobClass = (job: any) =>
          job?.name === props.profile?.jobClass;
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
        return showPass.value
          ? inputCode.value
          : inputCode.value.replace(/./g, "●");
      });

      const isPasscodeValid = computed(() => {
        return inputCode.value.length === 4;
      });

      const dismiss = async () => {
        play$fx("select");
        if (typeof modalController?.dismiss === "function") {
          await modalController.dismiss();
        }
      };

      const clickUnlock = async () => {
        debug.log(
          `Attempting to unlock profile with code: ${inputCode.value.replace(
            /./g,
            "*"
          )}`
        );

        const isPasscodeMatch = inputCode.value === props.profile.passcode;
        if (!isPasscodeMatch) {
          play$fx("no");
          hasError.value = true;
          timers.startTimeout(500, () => {
            hasError.value = false;
            inputCode.value = "";
          });
          alertIncorrectPasscode();
        } else {
          play$fx("yes");
          if (typeof toastController?.create === "function") {
            const toast = await toastController.create({
              message: "Profile unlocked",
              duration: 1500,
              position: "top",
            });
            await toast.present();
          }

          timers.startTimeout(300, () => {
            if (typeof modalController?.dismiss === "function") {
              modalController.dismiss(props.profile);
            }
          });
        }
      };

      const toggleShowPass = () => {
        play$fx("click");
        showPass.value = !showPass.value;
      };

      const appendToCode = (digit: number) => {
        const canAddDigit = inputCode.value.length < 4;
        if (canAddDigit) {
          play$fx("click");
          inputCode.value += digit;
        }
      };

      const removeLastDigit = () => {
        play$fx("click");
        inputCode.value = inputCode.value.slice(0, -1);
      };

      const clearCode = () => {
        play$fx("click");
        inputCode.value = "";
      };

      const alertIncorrectPasscode = async () => {
        if (typeof alertController?.create === "function") {
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
        }
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

<style lang="scss" scoped src="./_DialPad.scss" />
