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
    <div class="dialpad-container" :class="`dialpad--${skin}`">
      <!-- Hero card: the save file being opened -->
      <div class="hero-card">
        <div class="hero-portrait">
          <ion-img v-if="currentAvatar" :src="currentAvatar" class="hero-portrait__img" />
          <i v-else class="fad fa-user-shield hero-portrait__fallback" />
          <span class="hero-level">Lv {{ heroLevel }}</span>
        </div>
        <div class="hero-info">
          <h2 class="hero-name">{{ profile?.name?.nick || profile?.name?.full }}</h2>
          <p class="hero-full" v-if="profile?.name?.nick && profile?.name?.full">
            {{ profile?.name?.full }}
          </p>
          <div class="hero-tags icon-colors">
            <span class="hero-tag">
              <i :class="`fad ${selectedJobIcon}`" />
              {{ profile?.jobClass || "Hero" }}
            </span>
            <span class="hero-tag" v-if="profile?.favoriteFood">
              <i :class="`fad ${selectedFoodIcon}`" />
              {{ profile?.favoriteFood }}
            </span>
          </div>
        </div>
      </div>

      <!-- Keypad -->
      <div class="dial-pad">
        <div
          class="pin-slots"
          :class="{ 'pin-slots--error': hasError }"
          role="status"
          :aria-label="`${inputCode.length} of 4 digits entered`"
        >
          <span
            v-for="i in 4"
            :key="i"
            class="pin-slot"
            :class="{
              'pin-slot--filled': inputCode.length >= i,
              'pin-slot--next': inputCode.length === i - 1,
            }"
          >
            <span v-if="inputCode.length >= i" class="pin-slot__gem">
              {{ showPass ? inputCode[i - 1] : "" }}
            </span>
          </span>
        </div>

        <div class="keys">
          <button
            v-for="n in [1, 2, 3, 4, 5, 6, 7, 8, 9]"
            :key="n"
            type="button"
            class="key ion-activatable"
            :disabled="inputCode.length >= 4"
            @pointerdown="appendToCode(n)"
          >
            {{ n }}
          </button>
          <button
            type="button"
            class="key ion-activatable key--action"
            aria-label="Delete last digit"
            @pointerdown="removeLastDigit()"
          >
            <xp-icon icon="backspace" />
          </button>
          <button
            type="button"
            class="key ion-activatable"
            :disabled="inputCode.length >= 4"
            @pointerdown="appendToCode(0)"
          >
            0
          </button>
          <button
            type="button"
            class="key ion-activatable key--action"
            aria-label="Clear passcode"
            @pointerdown="clearCode()"
          >
            <xp-icon icon="trash" />
          </button>
        </div>

        <div class="action-row">
          <button
            type="button"
            class="key ion-activatable key--action key--eye"
            :aria-label="showPass ? 'Hide passcode' : 'Show passcode'"
            :aria-pressed="showPass"
            @click="toggleShowPass"
          >
            <i class="fad fa-lg" :class="hideIcon" />
          </button>
          <button
            type="button"
            class="key ion-activatable key--unlock"
            :class="{ 'key--ready': isPasscodeValid }"
            :disabled="!isPasscodeValid"
            @click="clickUnlock"
          >
            <i class="fad" :class="lockIcon" />
            <span class="unlock-text">Unlock</span>
          </button>
        </div>
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
  import { useGameStore } from "@/lib/store/stores/game";

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
      const gameStore = useGameStore();

      // The Retro / Modern toggle of the profile modal picks the keypad's skin
      const skin = computed(() => (gameStore.fabStyle === "retro" ? "retro" : "modern"));
      const heroLevel = computed(() => props.profile?.stats?.level || 1);

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
        const canDismiss = typeof modalController?.dismiss === "function";
        if (canDismiss) {
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
          const canToast = typeof toastController?.create === "function";
          if (canToast) {
            const toast = await toastController.create({
              message: "Profile unlocked",
              duration: 1500,
              position: "top",
            });
            await toast.present();
          }

          timers.startTimeout(300, () => {
            const canDismiss = typeof modalController?.dismiss === "function";
            if (canDismiss) {
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
        const canAlert = typeof alertController?.create === "function";
        if (canAlert) {
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
        skin,
        heroLevel,
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
