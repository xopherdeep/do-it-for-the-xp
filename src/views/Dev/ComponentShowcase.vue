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

        <h2>Segment</h2>
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

      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { h } from 'vue'; // Import h for creating VNodes in modal
import {
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

// --- Script Logic ---

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
    <ion-label>Default</ion-label>
  </ion-segment-button>
  <ion-segment-button value="segment">
    <ion-label>Segment</ion-label>
  </ion-segment-button>
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

// Alert Logic
const presentAlert = async () => {
  const alert = await alertController.create({
    header: 'Alert',
    subHeader: 'Important message',
    message: 'This is an alert!',
    buttons: ['OK'],
  });
  await alert.present();
};

// Show Code Logic using Modal
const showCode = async (code: string) => {
  const modal = await modalController.create({
    component: {
      // Define an inline component for the modal content
      setup() {
        const closeModal = () => modalController.dismiss();
        const formattedCode = escapeHtml(code); // Escape the code once
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
         .replace(/</g, "&lt;")
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

/* Adjust container styling if needed, or remove if default padding is sufficient */
/*
#container {
  text-align: center;
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
}

#container strong {
  font-size: 20px;
  line-height: 26px;
}

#container p {
  font-size: 16px;
  line-height: 22px;
  color: #8c8c8c;
  margin: 0;
}

#container a {
  text-decoration: none;
}
*/

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
