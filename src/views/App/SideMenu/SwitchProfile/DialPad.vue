<template>
  <ion-header>
    <ion-toolbar class="rpg-box">
      <ion-title> Enter Your Passcode </ion-title>
      <ion-buttons slot="start">
        <ion-button @click="dismiss">
          <i class="fad fa-arrow-left fa-3x"></i>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
  <ion-content class="bg-slide flex flex-col">
    <ion-grid
      class="max-w-[500px] max-h-[500px] h-full flex flex-col items-center justify-center"
    >
      <gamer-card :profile="profile" />
      <ion-card class="ion-align-center ion-justify-center ion-items-center">
        <ion-buttons>
          <ion-grid class="dial-pad">
            <ion-row>
              <ion-col>
                <ion-button
                  expand="block"
                  shape="round"
                  :disabled="inputCode.length == 4"
                  @click="appendToCode(1)"
                >
                  1
                </ion-button>
              </ion-col>
              <ion-col>
                <ion-button
                  expand="block"
                  shape="round"
                  :disabled="inputCode.length == 4"
                  @click="appendToCode(2)"
                >
                  2
                </ion-button>
              </ion-col>
              <ion-col>
                <ion-button
                  expand="block"
                  shape="round"
                  :disabled="inputCode.length == 4"
                  @click="appendToCode(3)"
                >
                  3
                </ion-button>
              </ion-col>
            </ion-row>
            <ion-row>
              <ion-col>
                <ion-button
                  expand="block"
                  shape="round"
                  :disabled="inputCode.length == 4"
                  @click="appendToCode(4)"
                >
                  4
                </ion-button>
              </ion-col>
              <ion-col>
                <ion-button
                  expand="block"
                  shape="round"
                  :disabled="inputCode.length == 4"
                  @click="appendToCode(5)"
                >
                  5
                </ion-button>
              </ion-col>
              <ion-col>
                <ion-button
                  expand="block"
                  shape="round"
                  :disabled="inputCode.length == 4"
                  @click="appendToCode(6)"
                >
                  6
                </ion-button>
              </ion-col>
            </ion-row>
            <ion-row>
              <ion-col>
                <ion-button
                  expand="block"
                  shape="round"
                  :disabled="inputCode.length == 4"
                  @click="appendToCode(7)"
                >
                  7
                </ion-button>
              </ion-col>
              <ion-col>
                <ion-button
                  expand="block"
                  shape="round"
                  :disabled="inputCode.length == 4"
                  @click="appendToCode(8)"
                >
                  8
                </ion-button>
              </ion-col>
              <ion-col>
                <ion-button
                  expand="block"
                  shape="round"
                  :disabled="inputCode.length == 4"
                  @click="appendToCode(9)"
                >
                  9
                </ion-button>
              </ion-col>
            </ion-row>
            <ion-row>
              <ion-col>
                <ion-button
                  expand="block"
                  shape="round"
                  @click="removeLastDigit()"
                >
                  ⌫
                </ion-button>
              </ion-col>
              <ion-col>
                <ion-button
                  expand="block"
                  shape="round"
                  :disabled="inputCode.length == 4"
                  @click="appendToCode(0)"
                >
                  0
                </ion-button>
              </ion-col>
              <ion-col>
                <ion-button expand="block" shape="round" @click="clearCode()">
                  C
                </ion-button>
              </ion-col>
            </ion-row>
            <ion-row> </ion-row>
          </ion-grid>
        </ion-buttons>
      </ion-card>
    </ion-grid>
  </ion-content>
  <ion-footer>
    <ion-toolbar class="rpg-box">
      <ion-card-title class="ion-text-center">
        {{ passwordProxy }}
      </ion-card-title>
      <ion-buttons slot="start">
        <ion-button>
          <i class="fad" :class="hideIcon" @click="toggleShowPass" />
        </ion-button>
      </ion-buttons>
      <ion-buttons slot="end">
        <ion-button :disabled="!isPasscodeValid" @click="clickUnlock">
          Unlock
          <i slot="end" class="fad" :class="lockIcon" />
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-footer>
</template>

<script lang="ts">
  import {
    modalController,
    alertController,
    toastController,
  } from "@ionic/vue";
  import ionic from "@/mixins/ionic";
  import GamerCard from "./AddProfile/GamerCard.vue";

  import { defineComponent, onUnmounted } from "vue";
  const KeyPad = defineComponent({
    props: ["profile"],
    mixins: [ionic],
    components: { GamerCard },
    setup(props) {
      // Ensure cleanup when component unmounts
      onUnmounted(() => {
        // Try to dismiss the modal if it somehow wasn't dismissed properly
        try {
          modalController.dismiss().catch(() => {
            // Ignore errors if already dismissed
          });
        } catch (e) {
          // Ignore any errors during cleanup
        }
      });
    },
    data() {
      return {
        inputCode: "",
        showPass: false,
      };
    },
    computed: {
      lockIcon() {
        return this.isPasscodeValid ? "fa-lock-open" : "fa-lock";
      },
      hideIcon() {
        return this.showPass ? "fa-eye" : "fa-eye-slash";
      },
      passwordProxy() {
        const { showPass, inputCode } = this;
        return showPass ? inputCode : inputCode.replace(/./g, "*");
      },
      isPasscodeValid() {
        return this.inputCode.length == 4;
      },
    },

    methods: {
      async dismiss() {
        await modalController.dismiss();
      },
      async clickUnlock() {
        const { inputCode, profile } = this;
        if (this.inputCode != this.profile.passcode) {
          this.alertIncorrectPasscode();
        } else {
          // Dismiss toast first to avoid overlap with loading indicator in parent
          const toast = await toastController.create({
            message: "Profile unlocked",
            duration: 1500, // Shorter duration to avoid overlap with loader
            position: "top",
          });
          await toast.present();

          // Use a slight delay before dismissing to ensure smooth transition
          setTimeout(() => {
            // Dismiss modal with profile data
            modalController.dismiss(profile);
          }, 300);
        }
      },
      toggleShowPass() {
        this.showPass = !this.showPass;
      },

      appendToCode(digit) {
        if (this.inputCode.length < 4) {
          this.inputCode += digit;
        }
      },

      removeLastDigit() {
        this.inputCode = this.inputCode.slice(0, -1);
      },

      clearCode() {
        this.inputCode = "";
      },

      async alertIncorrectPasscode() {
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
      },
    },
  });

  export default KeyPad;
</script>

<style lang="scss" scoped>
  .dial-pad {
    display: grid;
    gap: 10px;
  }

  .dial-pad ion-button {
    // width: 60px;
    // height: 60px;
    justify-content: center;
    align-items: center;
  }
</style>
