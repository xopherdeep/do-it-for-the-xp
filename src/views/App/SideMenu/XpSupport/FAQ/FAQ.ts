import { defineComponent } from 'vue'

import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonAccordionGroup,
  IonAccordion,
  IonItem,
  IonLabel
} from '@ionic/vue'

export default defineComponent({
  name: 'faq-page',
  data() {
    return {
      faqs: [
        {
          question: 'How do I create a new account?',
          answer: 'To create a new account, go to the login screen and click on "Sign Up". Fill in your details and follow the instructions to complete the registration process.'
        },
        {
          question: 'How do I earn experience points?',
          answer: 'Experience points (XP) can be earned by completing achievements, winning battles, and participating in special events. The more challenging the task, the more XP you will earn.'
        },
        {
          question: 'What happens when I level up?',
          answer: 'When you level up, your character becomes stronger. You gain stat points that can be allocated to different attributes like strength, intelligence, etc. You may also unlock new abilities and areas to explore.'
        },
        {
          question: 'How does the battle system work?',
          answer: 'The battle system is turn-based. During your turn, you can choose to attack, use an ability, use an item, or flee. Each action consumes a certain amount of action points. Strategy is key to winning battles.'
        },
        {
          question: 'What is the traveling merchant?',
          answer: 'The traveling merchant is a special character who appears in different areas at random times. He sells rare items that cannot be found elsewhere. Keep an eye out for him during your adventures!'
        },
        {
          question: 'How do I equip items?',
          answer: 'To equip items, go to your inventory, select the item you want to equip, and click on "Equip". Different items can be equipped in different slots like weapon, armor, and accessory.'
        },
        {
          question: 'Can I reset my character stats?',
          answer: 'Yes, you can reset your character stats by using a special item called "Stat Reset Potion" which can be purchased from the merchant or earned through certain achievements.'
        },
        {
          question: 'How do I complete achievements?',
          answer: 'Each achievement has specific requirements that need to be fulfilled. View the achievement details to see what you need to do. Once you meet the requirements, the achievement will be automatically completed.'
        }
      ]
    }
  },
  components: {
    IonPage,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonAccordionGroup,
    IonAccordion,
    IonItem,
    IonLabel
  }
})
