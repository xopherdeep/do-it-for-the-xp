import { defineComponent } from 'vue'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonList,
  IonItemDivider,
  IonAccordionGroup,
  IonAccordion,
  IonItem,
  IonLabel
} from '@ionic/vue'
import { FAQ_GROUPS } from '../helpContent'

export default defineComponent({
  name: 'faq-page',
  components: {
    IonPage,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonTitle,
    IonContent,
    IonCard,
    IonCardContent,
    IonList,
    IonItemDivider,
    IonAccordionGroup,
    IonAccordion,
    IonItem,
    IonLabel
  },
  setup() {
    return { groups: FAQ_GROUPS }
  }
})
