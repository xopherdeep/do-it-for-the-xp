<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button color="primary"></ion-menu-button>
        </ion-buttons>
        <ion-title>Component Showcase (Dev)</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Component Showcase (Dev)</ion-title>
        </ion-toolbar>
      </ion-header>

      <div class="ion-padding">
        <h2 class="section-header">
          Buttons
          <ion-button fill="clear" size="small" @click="showCode(codeSnippets.buttons)">
            Show Code
          </ion-button>
        </h2>
        <ion-button>Default</ion-button>
        <ion-button color="primary">Primary</ion-button>
        <ion-button color="secondary">Secondary</ion-button>
        <ion-button color="tertiary">Tertiary</ion-button>
        <ion-button color="success">Success</ion-button>
        <ion-button color="warning">Warning</ion-button>
        <ion-button color="danger">Danger</ion-button>
        <ion-button color="light">Light</ion-button>
        <ion-button color="medium">Medium</ion-button>
        <ion-button color="dark">Dark</ion-button>
        <br><br>
        <ion-button expand="full">Full Button</ion-button>
        <ion-button expand="block">Block Button</ion-button>
        <ion-button shape="round">Round Button</ion-button>
        <ion-button fill="outline">Outline Button</ion-button>
        <ion-button fill="clear">Clear Button</ion-button>
        <ion-button size="small">Small</ion-button>
        <ion-button size="default">Default</ion-button>
        <ion-button size="large">Large</ion-button>

        <h2 class="section-header">
          Cards
          <ion-button fill="clear" size="small" @click="showCode(codeSnippets.cards)">
            Show Code
          </ion-button>
        </h2>
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>Card Subtitle</ion-card-subtitle>
            <ion-card-title>Card Title</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            Keep close to Nature's heart... and break clear away, once in awhile,
            and climb a mountain or spend a week in the woods. Wash your spirit clean.
          </ion-card-content>
        </ion-card>

        <h2 class="section-header">
          Inputs
           <ion-button fill="clear" size="small" @click="showCode(codeSnippets.inputs)">
            Show Code
          </ion-button>
        </h2>
        <ion-list>
          <ion-item>
            <ion-input label="Default Input" placeholder="Enter text"></ion-input>
          </ion-item>
          <ion-item>
            <ion-input label="Number Input" type="number" placeholder="000"></ion-input>
          </ion-item>
          <ion-item>
            <ion-input label="Password Input" type="password" value="password"></ion-input>
          </ion-item>
          <ion-item>
            <ion-textarea label="Textarea" placeholder="Enter text"></ion-textarea>
          </ion-item>
        </ion-list>

        <h2 class="section-header">
          List
           <ion-button fill="clear" size="small" @click="showCode(codeSnippets.list)">
            Show Code
          </ion-button>
        </h2>
        <ion-list>
          <ion-list-header>
            <ion-label>List Header</ion-label>
          </ion-list-header>
          <ion-item>
            <ion-label>Item 1</ion-label>
          </ion-item>
          <ion-item>
            <ion-label>Item 2</ion-label>
          </ion-item>
          <ion-item lines="none">
            <ion-label>Item 3 (No Line)</ion-label>
          </ion-item>
        </ion-list>

        <h2 class="section-header">
          Checkbox
           <ion-button fill="clear" size="small" @click="showCode(codeSnippets.checkbox)">
            Show Code
          </ion-button>
        </h2>
        <ion-item>
          <ion-checkbox slot="start"></ion-checkbox>
          <ion-label>Checkbox Label</ion-label>
        </ion-item>

        <h2 class="section-header">
          Radio Group
           <ion-button fill="clear" size="small" @click="showCode(codeSnippets.radioGroup)">
            Show Code
          </ion-button>
        </h2>
        <ion-list>
          <ion-radio-group value="strawberries">
            <ion-list-header>
              <ion-label>Favorite Fruit</ion-label>
            </ion-list-header>
            <ion-item>
              <ion-radio value="apples">Apples</ion-radio>
            </ion-item>
            <ion-item>
              <ion-radio value="oranges">Oranges</ion-radio>
            </ion-item>
            <ion-item>
              <ion-radio value="strawberries">Strawberries</ion-radio>
            </ion-item>
          </ion-radio-group>
        </ion-list>

        <h2 class="section-header">
          Toggle
           <ion-button fill="clear" size="small" @click="showCode(codeSnippets.toggle)">
            Show Code
          </ion-button>
        </h2>
        <ion-item>
          <ion-toggle slot="end">Enable Notifications</ion-toggle>
        </ion-item>

        <h2 class="section-header">
          Range
           <ion-button fill="clear" size="small" @click="showCode(codeSnippets.range)">
            Show Code
          </ion-button>
        </h2>
        <ion-item>
          <ion-range aria-label="Range with pin" :pin="true" :pin-formatter="pinFormatter"></ion-range>
        </ion-item>

        <h2 class="section-header">
          Segment
          <ion-button fill="clear" size="small" @click="showCode(codeSnippets.segment)">
            Show Code
          </ion-button>
        </h2>
        <ion-segment value="default">
          <ion-segment-button value="default">
            <ion-label>Default</ion-label>
          </ion-segment-button>
          <ion-segment-button value="segment">
            <ion-label>Segment</ion-label>
          </ion-segment-button>
        </ion-segment>

        <h2 class="section-header">
          Spinner
           <ion-button fill="clear" size="small" @click="showCode(codeSnippets.spinner)">
            Show Code
          </ion-button>
        </h2>
        <ion-spinner name="dots"></ion-spinner>
        <ion-spinner name="lines"></ion-spinner>
        <ion-spinner name="lines-small"></ion-spinner>
        <ion-spinner name="bubbles"></ion-spinner>
        <ion-spinner name="circles"></ion-spinner>
        <ion-spinner name="crescent"></ion-spinner>

        <h2 class="section-header">
          Toast (Example Trigger)
           <ion-button fill="clear" size="small" @click="showCode(codeSnippets.toast)">
            Show Code
          </ion-button>
        </h2>
        <ion-button @click="presentToast('top')">Present Toast Top</ion-button>

        <h2 class="section-header">
          Alert (Example Trigger)
           <ion-button fill="clear" size="small" @click="showCode(codeSnippets.alert)">
            Show Code
          </ion-button>
        </h2>
        <ion-button @click="presentAlert">Present Alert</ion-button>

        <h2 class="section-header">
          RPG Typing Text
          <ion-button fill="clear" size="small" @click="showCode(codeSnippets.typingText)">
            Show Code
          </ion-button>
        </h2>
        
        <!-- Simple Example -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>Basic Example</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <xp-typing-text 
              :text="demoText" 
              :speed="textSpeed"
              ref="basicTypingDemo"
              @typing-complete="onTypingComplete('Basic demo completed!')"
            ></xp-typing-text>
            <div class="control-buttons mt-2">
              <ion-button size="small" @click="restartTypingDemo('basicTypingDemo')">
                Restart
              </ion-button>
              <ion-button size="small" @click="skipTypingDemo('basicTypingDemo')">
                Skip
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>
        
        <!-- Interactive Demo with Controls -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>Interactive Demo</ion-card-title>
            <ion-card-subtitle>Adjust settings in real-time</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <!-- Text Input -->
            <ion-item>
              <ion-label position="stacked">Custom Text</ion-label>
              <ion-textarea 
                v-model="customText" 
                rows="3" 
                placeholder="Enter text to animate"
              ></ion-textarea>
            </ion-item>
            
            <!-- Speed Control -->
            <ion-item>
              <ion-label>Typing Speed: {{ textSpeed }}ms</ion-label>
              <ion-range 
                v-model="textSpeed" 
                :min="10" 
                :max="200" 
                :step="5"
                aria-label="Typing Speed"
              ></ion-range>
            </ion-item>
            
            <!-- Sound Toggle -->
            <ion-item>
              <ion-label>Play Sound</ion-label>
              <ion-toggle v-model="playSound" slot="end"></ion-toggle>
            </ion-item>
            
            <!-- Cursor Toggle -->
            <ion-item>
              <ion-label>Show Cursor</ion-label>
              <ion-toggle v-model="showCursor" slot="end"></ion-toggle>
            </ion-item>
            
            <!-- RPG Styling Toggle -->
            <ion-item>
              <ion-label>RPG Styling</ion-label>
              <ion-toggle v-model="rpgStyled" slot="end"></ion-toggle>
            </ion-item>
            
            <!-- Initial Delay Control -->
            <ion-item>
              <ion-label>Initial Delay: {{ initialDelay }}ms</ion-label>
              <ion-range 
                v-model="initialDelay" 
                :min="0" 
                :max="2000" 
                :step="100"
                aria-label="Initial Delay"
              ></ion-range>
            </ion-item>
            
            <!-- Demo Display -->
            <div :class="{'rpg-box': rpgStyled}" class="demo-container p-4 mt-3">
              <xp-typing-text 
                :text="customText" 
                :speed="textSpeed"
                :play-sound="playSound"
                :cursor-visible="showCursor"
                :is-rpg-styled="rpgStyled"
                :delay="initialDelay"
                ref="customTypingDemo"
                @typing-complete="onTypingComplete('Custom demo completed!')"
                @typing-start="onTypingStart('Custom typing started')"
                @typing-char="onTypingChar"
              ></xp-typing-text>
              
              <div class="typing-events mt-2">
                <small>Events: {{ latestEvent }}</small>
              </div>
            </div>
            
            <div class="control-buttons mt-3">
              <ion-button @click="restartTypingDemo('customTypingDemo')">
                Restart
              </ion-button>
              <ion-button @click="skipTypingDemo('customTypingDemo')">
                Skip/Complete
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>
        
        <!-- Multiple Examples Card -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>Usage Examples</ion-card-title>
            <ion-card-subtitle>Different configuration options</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <!-- Slow, RPG-styled example -->
            <div class="example-box rpg-box mb-4 p-3">
              <strong>Slow RPG Style:</strong>
              <xp-typing-text 
                text="The old wizard spoke slowly... *pauses* The ancient spell requires 3 items."
                :speed="100" 
                :is-rpg-styled="true"
                ref="slowTypingDemo"
              ></xp-typing-text>
              <div class="control-buttons mt-2">
                <ion-button size="small" @click="restartTypingDemo('slowTypingDemo')">
                  Restart
                </ion-button>
              </div>
            </div>
            
            <!-- Fast, modern example -->
            <div class="example-box mb-4 p-3">
              <strong>Fast Modern Style:</strong>
              <xp-typing-text 
                text="System initialized. Running diagnostics... Complete!"
                :speed="20" 
                :is-rpg-styled="false"
                ref="fastTypingDemo"
              ></xp-typing-text>
              <div class="control-buttons mt-2">
                <ion-button size="small" @click="restartTypingDemo('fastTypingDemo')">
                  Restart
                </ion-button>
              </div>
            </div>
            
            <!-- No sound example -->
            <div class="example-box mb-4 p-3">
              <strong>No Sound:</strong>
              <xp-typing-text 
                text="This text appears silently, without any typing sounds."
                :speed="40" 
                :play-sound="false"
                ref="silentTypingDemo"
              ></xp-typing-text>
              <div class="control-buttons mt-2">
                <ion-button size="small" @click="restartTypingDemo('silentTypingDemo')">
                  Restart
                </ion-button>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { h } from 'vue'; // Import h for creating VNodes in modal
import {
  // alertController, // Removed - No longer used directly on this page
  modalController, // Replaced alertController
  toastController, // Added for Toast example
  IonButton,       // Added
  IonButtons,
  IonCard,         // Added
  IonCardContent,  // Added
  IonCardHeader,   // Added
  IonCardSubtitle, // Added
  IonCardTitle,    // Added
  IonCheckbox,     // Added
  IonContent,
  IonHeader,
  IonInput,        // Added
  IonModal,        // Added for code display
  IonItem,         // Added
  IonLabel,        // Added
  IonList,         // Added
  IonListHeader,   // Added
  IonMenuButton,
  IonPage,
  IonRadio,        // Added
  IonRadioGroup,   // Added
  IonRange,        // Added
  IonSegment,      // Added
  IonSegmentButton,// Added
  IonSpinner,      // Added
  IonTextarea,     // Added
  IonTitle,
  IonToggle,       // Added
  IonToolbar,
} from '@ionic/vue';
import { ref, computed } from 'vue'; // Added ref and computed for reactive state
import XpTypingText from '@/components/XpTypingText/XpTypingText.vue'; // Import our custom typing text component

// --- Script Logic ---

// XpTypingText Demo State
const demoText = ref("Welcome to XP! This is a demo of the RPG-style typing text component.");
const customText = ref("Type your custom text here and see it animate with retro RPG style! Click to skip animation.");
const textSpeed = ref(40);
const playSound = ref(true);
const showCursor = ref(true);
const rpgStyled = ref(true);
const initialDelay = ref(300);
const latestEvent = ref("No events yet");

// XpTypingText Demo Methods
const restartTypingDemo = (refName: string) => {
  if (refName && typeof refName === 'string') {
    const demoRef = ref.value as any; // Get the component instance
    if (demoRef && demoRef.resetTyping && demoRef.startTyping) {
      demoRef.resetTyping();
      demoRef.startTyping();
    }
  }
};

const skipTypingDemo = (refName: string) => {
  if (refName && typeof refName === 'string') {
    const demoRef = ref.value as any; // Get the component instance
    if (demoRef && demoRef.completeTyping) {
      demoRef.completeTyping();
    }
  }
};

const onTypingComplete = (message: string) => {
  latestEvent.value = message;
  presentToast('bottom');
};

const onTypingStart = (message: string) => {
  latestEvent.value = message;
};

const onTypingChar = (index: number, char: string) => {
  latestEvent.value = `Typed char at index ${index}: "${char}"`;
};

// Code Snippets for display
const codeSnippets = {
  buttons: `
<ion-button>Default</ion-button>
<ion-button color="primary">Primary</ion-button>
<ion-button color="secondary">Secondary</ion-button>
<ion-button color="tertiary">Tertiary</ion-button>
<ion-button color="success">Success</ion-button>
<ion-button color="warning">Warning</ion-button>
<ion-button color="danger">Danger</ion-button>
<ion-button color="light">Light</ion-button>
<ion-button color="medium">Medium</ion-button>
<ion-button color="dark">Dark</ion-button>
<br><br>
<ion-button expand="full">Full Button</ion-button>
<ion-button expand="block">Block Button</ion-button>
<ion-button shape="round">Round Button</ion-button>
<ion-button fill="outline">Outline Button</ion-button>
<ion-button fill="clear">Clear Button</ion-button>
<ion-button size="small">Small</ion-button>
<ion-button size="default">Default</ion-button>
<ion-button size="large">Large</ion-button>
  `.trim(),
  cards: `
<ion-card>
  <ion-card-header>
    <ion-card-subtitle>Card Subtitle</ion-card-subtitle>
    <ion-card-title>Card Title</ion-card-title>
  </ion-card-header>
  <ion-card-content>
    Keep close to Nature's heart... and break clear away, once in awhile,
    and climb a mountain or spend a week in the woods. Wash your spirit clean.
  </ion-card-content>
</ion-card>
  `.trim(),
  inputs: `
<ion-list>
  <ion-item>
    <ion-input label="Default Input" placeholder="Enter text"></ion-input>
  </ion-item>
  <ion-item>
    <ion-input label="Number Input" type="number" placeholder="000"></ion-input>
  </ion-item>
  <ion-item>
    <ion-input label="Password Input" type="password" value="password"></ion-input>
  </ion-item>
  <ion-item>
    <ion-textarea label="Textarea" placeholder="Enter text"></ion-textarea>
  </ion-item>
</ion-list>
  `.trim(),
  list: `
<ion-list>
  <ion-list-header>
    <ion-label>List Header</ion-label>
  </ion-list-header>
  <ion-item>
    <ion-label>Item 1</ion-label>
  </ion-item>
  <ion-item>
    <ion-label>Item 2</ion-label>
  </ion-item>
  <ion-item lines="none">
    <ion-label>Item 3 (No Line)</ion-label>
  </ion-item>
</ion-list>
  `.trim(),
  checkbox: `
<ion-item>
  <ion-checkbox slot="start"></ion-checkbox>
  <ion-label>Checkbox Label</ion-label>
</ion-item>
  `.trim(),
  radioGroup: `
<ion-list>
  <ion-radio-group value="strawberries">
    <ion-list-header>
      <ion-label>Favorite Fruit</ion-label>
    </ion-list-header>
    <ion-item>
      <ion-radio value="apples">Apples</ion-radio>
    </ion-item>
    <ion-item>
      <ion-radio value="oranges">Oranges</ion-radio>
    </ion-item>
    <ion-item>
      <ion-radio value="strawberries">Strawberries</ion-radio>
    </ion-item>
  </ion-radio-group>
</ion-list>
  `.trim(),
  toggle: `
<ion-item>
  <ion-toggle slot="end">Enable Notifications</ion-toggle>
</ion-item>
  `.trim(),
  range: `
// Template
<ion-item>
  <ion-range aria-label="Range with pin" :pin="true" :pin-formatter="pinFormatter"></ion-range>
</ion-item>

// Script
const pinFormatter = (value: number) => \`\${value}%\`;
  `.trim(),
  segment: `
<ion-segment value="default">
  <ion-segment-button value="default">
    <ion-label>Default</ion-segment-button>
  </ion-segment-button>
  <ion-segment-button value="segment">
    <ion-label>Segment</ion-segment-button>
</ion-segment>
  `.trim(),
  spinner: `
<ion-spinner name="dots"></ion-spinner>
<ion-spinner name="lines"></ion-spinner>
<ion-spinner name="lines-small"></ion-spinner>
<ion-spinner name="bubbles"></ion-spinner>
<ion-spinner name="circles"></ion-spinner>
<ion-spinner name="crescent"></ion-spinner>
  `.trim(),
  toast: `
// Template
<ion-button @click="presentToast('top')">Present Toast Top</ion-button>

// Script
import { toastController } from '@ionic/vue';

const presentToast = async (position: 'top' | 'middle' | 'bottom') => {
  const toast = await toastController.create({
    message: 'Hello World!',
    duration: 1500,
    position: position,
  });
  await toast.present();
};
  `.trim(),
  alert: `
// Template
<ion-button @click="presentAlert">Present Alert</ion-button>

// Script
import { alertController } from '@ionic/vue';

const presentAlert = async () => {
  const alert = await alertController.create({
    header: 'Alert',
    subHeader: 'Important message',
    message: 'This is an alert!',
    buttons: ['OK'],
  });
  await alert.present();
};
  `.trim(),
  typingText: `
<h2 class="section-header">
  RPG Typing Text
  <ion-button fill="clear" size="small" @click="showCode(codeSnippets.typingText)">
    Show Code
  </ion-button>
</h2>

<!-- Simple Example -->
<ion-card>
  <ion-card-header>
    <ion-card-title>Basic Example</ion-card-title>
  </ion-card-header>
  <ion-card-content>
    <xp-typing-text 
      :text="demoText" 
      :speed="textSpeed"
      ref="basicTypingDemo"
      @typing-complete="onTypingComplete('Basic demo completed!')"
    ></xp-typing-text>
    <div class="control-buttons mt-2">
      <ion-button size="small" @click="restartTypingDemo('basicTypingDemo')">
        Restart
      </ion-button>
      <ion-button size="small" @click="skipTypingDemo('basicTypingDemo')">
        Skip
      </ion-button>
    </div>
  </ion-card-content>
</ion-card>

<!-- Interactive Demo with Controls -->
<ion-card>
  <ion-card-header>
    <ion-card-title>Interactive Demo</ion-card-title>
    <ion-card-subtitle>Adjust settings in real-time</ion-card-subtitle>
  </ion-card-header>
  <ion-card-content>
    <!-- Text Input -->
    <ion-item>
      <ion-label position="stacked">Custom Text</ion-label>
      <ion-textarea 
        v-model="customText" 
        rows="3" 
        placeholder="Enter text to animate"
      ></ion-textarea>
    </ion-item>
    
    <!-- Speed Control -->
    <ion-item>
      <ion-label>Typing Speed: {{ textSpeed }}ms</ion-label>
      <ion-range 
        v-model="textSpeed" 
        :min="10" 
        :max="200" 
        :step="5"
        aria-label="Typing Speed"
      ></ion-range>
    </ion-item>
    
    <!-- Sound Toggle -->
    <ion-item>
      <ion-label>Play Sound</ion-toggle>
      <ion-toggle v-model="playSound" slot="end"></ion-toggle>
    </ion-item>
    
    <!-- Cursor Toggle -->
    <ion-item>
      <ion-label>Show Cursor</ion-toggle>
      <ion-toggle v-model="showCursor" slot="end"></ion-toggle>
    </ion-item>
    
    <!-- RPG Styling Toggle -->
    <ion-item>
      <ion-label>RPG Styling</ion-label>
      <ion-toggle v-model="rpgStyled" slot="end"></ion-toggle>
    </ion-item>
    
    <!-- Initial Delay Control -->
    <ion-item>
      <ion-label>Initial Delay: {{ initialDelay }}ms</ion-label>
      <ion-range 
        v-model="initialDelay" 
        :min="0" 
        :max="2000" 
        :step="100"
        aria-label="Initial Delay"
      ></ion-range>
    </ion-item>
    
    <!-- Demo Display -->
    <div :class="{'rpg-box': rpgStyled}" class="demo-container p-4 mt-3">
      <xp-typing-text 
        :text="customText" 
        :speed="textSpeed"
        :play-sound="playSound"
        :cursor-visible="showCursor"
        :is-rpg-styled="rpgStyled"
        :delay="initialDelay"
        ref="customTypingDemo"
        @typing-complete="onTypingComplete('Custom demo completed!')"
        @typing-start="onTypingStart('Custom typing started')"
        @typing-char="onTypingChar"
      ></xp-typing-text>
      
      <div class="typing-events mt-2">
        <small>Events: {{ latestEvent }}</small>
      </div>
    </div>
    
    <div class="control-buttons mt-3">
      <ion-button @click="restartTypingDemo('customTypingDemo')">
        Restart
      </ion-button>
      <ion-button @click="skipTypingDemo('customTypingDemo')">
        Skip/Complete
      </ion-button>
    </div>
  </ion-card-content>
</ion-card>

<!-- Multiple Examples Card -->
<ion-card>
  <ion-card-header>
    <ion-card-title>Usage Examples</ion-card-title>
    <ion-card-subtitle>Different configuration options</ion-card-subtitle>
  </ion-card-header>
  <ion-card-content>
    <!-- Slow, RPG-styled example -->
    <div class="example-box rpg-box mb-4 p-3">
      <strong>Slow RPG Style:</strong>
      <xp-typing-text 
        text="The old wizard spoke slowly... *pauses* The ancient spell requires 3 items."
        :speed="100" 
        :is-rpg-styled="true"
        ref="slowTypingDemo"
      ></xp-typing-text>
      <div class="control-buttons mt-2">
        <ion-button size="small" @click="restartTypingDemo('slowTypingDemo')">
          Restart
        </ion-button>
      </div>
    </div>
    
    <!-- Fast, modern example -->
    <div class="example-box mb-4 p-3">
      <strong>Fast Modern Style:</strong>
      <xp-typing-text 
        text="System initialized. Running diagnostics... Complete!"
        :speed="20" 
        :is-rpg-styled="false"
        ref="fastTypingDemo"
      ></xp-typing-text>
      <div class="control-buttons mt-2">
        <ion-button size="small" @click="restartTypingDemo('fastTypingDemo')">
          Restart
        </ion-button>
      </div>
    </div>
    
    <!-- No sound example -->
    <div class="example-box mb-4 p-3">
      <strong>No Sound:</strong>
      <xp-typing-text 
        text="This text appears silently, without any typing sounds."
        :speed="40" 
        :play-sound="false"
        ref="silentTypingDemo"
      ></xp-typing-text>
      <div class="control-buttons mt-2">
        <ion-button size="small" @click="restartTypingDemo('silentTypingDemo')">
          Restart
        </ion-button>
      </div>
    </div>
  </ion-card-content>
</ion-card>
  `.trim(),
};


// Range Formatter
const pinFormatter = (value: number) => `${value}%`;

// Toast Logic
const presentToast = async (position: 'top' | 'middle' | 'bottom') => {
  const toast = await toastController.create({
    message: 'Hello World!',
    duration: 1500,
    position: position,
  });
  await toast.present();
};

// Alert Logic (Keep for example trigger, but ensure alertController is imported if needed)
// const presentAlert = async () => {
//   // Ensure alertController is imported from '@ionic/vue' if you uncomment this
//   const alert = await alertController.create({
//     header: 'Alert',
//     subHeader: 'Important message',
//     message: 'This is an alert!',
//     buttons: ['OK'],
//   });
//   await alert.present();
// };
// NOTE: The button still exists, but clicking it will now cause an error unless
//       alertController is re-imported and this function uncommented.
//       Alternatively, remove the Alert section entirely if not needed.

// Show Code Logic using Modal
const showCode = async (code: string) => {
  const modal = await modalController.create({
    component: {
      // Define an inline component for the modal content
      props: { // Define props for the inline component
        codeToShow: { type: String, required: true }
      },
      setup(props) { // Accept props here
        const closeModal = () => modalController.dismiss();
        // Calculate formattedCode based on the passed prop
        const formattedCode = escapeHtml(props.codeToShow);
        return { closeModal, formattedCode };
      },
      template: `
        <ion-header>
          <ion-toolbar>
            <ion-title>Component Code</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeModal">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <ion-card>
            <ion-card-content>
              <pre><code>{{ formattedCode }}</code></pre>
            </ion-card-content>
          </ion-card>
        </ion-content>
      `,
      components: { // Register necessary Ionic components locally for the modal
          IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonCard, IonCardContent
      }
    },
    componentProps: { // Pass the code string as a prop
      codeToShow: code
    },
    // Use CSS variables for auto height and potentially width
    cssClass: 'code-modal', // Add a class for styling
    // Optional: Set breakpoints for sheet-like behavior on smaller screens
    // breakpoints: [0, 0.5, 0.8],
    // initialBreakpoint: 0.8,
  });
  await modal.present();
};


// Helper to escape HTML for display
function escapeHtml(unsafe: string): string {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/<//g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }

</script>

<style scoped>
/* Add some padding and spacing for better readability */
.ion-padding {
  padding: 16px;
}

/* Style for section headers to align title and button */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  border-bottom: 1px solid var(--ion-color-step-150, #d7d8da);
  padding-bottom: 5px;
}

/* Reduce margin for the show code button */
.section-header ion-button {
  margin: 0;
  --padding-start: 4px; /* Fine-tune padding if needed */
  --padding-end: 4px;
}

/* Add spacing between inline buttons */
ion-button {
  margin-right: 8px;
  margin-bottom: 8px;
}

/* Add spacing for spinners */
ion-spinner {
  margin: 16px;
}

/* Ensure list items have some space */
ion-list {
  margin-bottom: 16px;
}

/* XpTypingText demo styles */
.demo-container {
  border: 1px solid var(--ion-color-step-200, #cccccc);
  border-radius: 8px;
  background-color: var(--ion-color-light, #f4f5f8);
  min-height: 100px;
}

.typing-events {
  color: var(--ion-color-medium, #92949c);
  font-style: italic;
}

.control-buttons {
  display: flex;
  gap: 8px;
}

.example-box {
  border: 1px solid var(--ion-color-step-200, #cccccc);
  border-radius: 8px;
  background-color: var(--ion-color-light, #f4f5f8);
}

.rpg-box {
  background-color: #280828 !important;
  color: #f7e8a8 !important;
  font-family: 'StatusPlz', monospace;
  border: 2px solid #f7e8a8 !important;
}

/* Utility classes */
.mt-2 {
  margin-top: 0.5rem;
}

.mt-3 {
  margin-top: 0.75rem;
}

.mb-4 {
  margin-bottom: 1rem;
}

.p-3 {
  padding: 0.75rem;
}

.p-4 {
  padding: 1rem;
}

/* Style the modal for code display */
:global(.code-modal) {
    --height: auto; /* Allow modal height to grow */
    --max-height: 80vh; /* Optional: Set a max height */
    --width: 90vw; /* Optional: Adjust width */
    --max-width: 600px; /* Optional: Set a max width */
}

/* Style the code block inside the modal */
:global(.code-modal pre) {
  font-family: monospace;
  white-space: pre-wrap; /* Allow wrapping */
  word-wrap: break-word; /* Break long lines */
  margin: 0;
  background-color: var(--ion-color-step-100, #f2f2f2); /* Light background for code */
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto; /* Add horizontal scroll if needed */
}

:global(.code-modal ion-card-content) {
    padding: 0; /* Remove card padding if pre has padding */
}

:global(.code-modal ion-card) {
    margin: 0; /* Remove card margin if content has padding */
    box-shadow: none; /* Optional: remove card shadow */
}
</style>
