<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button :default-href="'/'" color="primary"></ion-back-button>
        </ion-buttons>
        <ion-title>RPG Text Demo</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-card class="rpg-box">
        <ion-card-header>
          <ion-card-title>RPG Text Animation Demo</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p class="mb-4">
            <xp-typing-text
              ref="demoText1"
              :text="'Welcome to XP! This is a demonstration of the RPG text animation component.'"
              :speed="50"
              @typing-complete="demoText1Complete = true"
            ></xp-typing-text>
          </p>

          <p class="mb-4" v-if="demoText1Complete">
            <xp-typing-text
              ref="demoText2"
              :text="'You can adjust the typing speed, add sound effects, and more!'"
              :speed="30"
              :delay="500"
              @typing-complete="demoText2Complete = true"
            ></xp-typing-text>
          </p>

          <div v-if="demoText2Complete">
            <p class="mb-4">Try different settings:</p>
            
            <ion-item>
              <ion-label>Text Speed</ion-label>
              <ion-range v-model="textSpeed" :min="10" :max="150" :pin="true"></ion-range>
            </ion-item>
            
            <ion-item>
              <ion-label>Play Sound</ion-label>
              <ion-toggle v-model="playSound"></ion-toggle>
            </ion-item>
            
            <ion-item>
              <ion-label>RPG Style</ion-label>
              <ion-toggle v-model="isRpgStyled"></ion-toggle>
            </ion-item>
            
            <ion-button expand="block" class="mt-4" @click="startCustomDemo">
              Start Demo
            </ion-button>
            
            <div class="custom-demo-box mt-4 p-4">
              <xp-typing-text
                ref="customDemo"
                :text="customText"
                :speed="textSpeed"
                :play-sound="playSound"
                :is-rpg-styled="isRpgStyled"
                :auto-start="false"
                @typing-complete="customDemoComplete = true"
              ></xp-typing-text>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-card class="rpg-box mt-4" v-if="demoText2Complete">
        <ion-card-header>
          <ion-card-title>Implementation Examples</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p class="mb-2">Use this component in:</p>
          <ul class="list-disc pl-5 mb-4">
            <li>NPC dialogues</li>
            <li>Tutorial messages</li>
            <li>Quest descriptions</li>
            <li>Battle messages</li>
            <li>Item descriptions</li>
            <li>Level-up notifications</li>
          </ul>
          
          <p class="mb-4">
            <xp-typing-text
              :text="'Click anywhere on the text to skip the animation!'"
              :speed="40"
              :delay="1000"
              :auto-start="customDemoComplete"
            ></xp-typing-text>
          </p>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonRange, IonToggle, IonButton } from "@ionic/vue";
import XpTypingText from "@/components/XpTypingText/XpTypingText.vue";
import Ionic from "@/mixins/ionic";

// Define type for XpTypingText instance that includes exposed methods
interface XpTypingTextInstance {
  resetTyping: () => void;
  startTyping: () => void;
  completeTyping: () => void;
  pauseTyping: () => void;
  resumeTyping: () => void;
}

export default defineComponent({
  name: "RpgTextDemo",
  components: {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonRange,
    IonToggle,
    IonButton,
    XpTypingText
  },
  mixins: [Ionic],
  setup() {
    const demoText1Complete = ref(false);
    const demoText2Complete = ref(false);
    const customDemoComplete = ref(false);
    
    const textSpeed = ref(50);
    const playSound = ref(true);
    const isRpgStyled = ref(true);
    
    const customText = ref('This is your custom text with your chosen settings. Perfect for NPC dialogues, tutorials, and story elements in your RPG app!');
    const customDemo = ref<XpTypingTextInstance | null>(null);
    
    const startCustomDemo = () => {
      if (customDemo.value) {
        customDemo.value.resetTyping();
        customDemo.value.startTyping();
        customDemoComplete.value = false;
      }
    };

    return {
      demoText1Complete,
      demoText2Complete,
      customDemoComplete,
      textSpeed,
      playSound,
      isRpgStyled,
      customText,
      customDemo,
      startCustomDemo
    };
  }
});
</script>

<style lang="scss" scoped>
.custom-demo-box {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  min-height: 100px;
}

ul {
  list-style-type: disc;
  padding-left: 1.5rem;
}
</style>