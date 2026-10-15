import { defineComponent } from 'vue'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonTitle,
  IonContent,
  IonCard,
  IonList,
  IonAccordionGroup,
  IonAccordion,
  IonItem,
  IonLabel,
  IonBadge
} from '@ionic/vue'
import { MANUAL_CHAPTERS } from '../helpContent'

export default defineComponent({
  name: 'user-manual',
  components: {
    IonPage,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonTitle,
    IonContent,
    IonCard,
    IonList,
    IonAccordionGroup,
    IonAccordion,
    IonItem,
    IonLabel,
    IonBadge
  },
  setup() {
    // Getting started opens on arrival; every other chapter is one tap away
    return { chapters: MANUAL_CHAPTERS, openChapter: MANUAL_CHAPTERS[0].id }
  }
})
