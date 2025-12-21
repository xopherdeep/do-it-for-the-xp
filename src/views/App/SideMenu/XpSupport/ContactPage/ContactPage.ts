import { defineComponent, ref } from 'vue'
import { useRouter } from 'vue-router'

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
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonList,
  IonIcon,
  IonToast
} from '@ionic/vue'

import {
  mailOutline,
  callOutline,
  logoTwitter,
  logoDiscord
} from 'ionicons/icons'

interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default defineComponent({
  name: 'ContactPage',
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
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonList,
    IonIcon,
    IonToast
  },
  setup() {
    const router = useRouter();
    const showToast = ref(false);
    const toastMessage = ref('');

    const navigateToFAQ = () => {
      router.push('/support/faq');
    };

    const presentToast = (message: string) => {
      toastMessage.value = message;
      showToast.value = true;
    };

    return {
      navigateToFAQ,
      showToast,
      toastMessage,
      presentToast,
      mailOutline,
      callOutline,
      logoTwitter,
      logoDiscord
    };
  },
  data() {
    return {
      contactForm: {
        name: '',
        email: '',
        subject: 'question',
        message: ''
      } as ContactForm
    };
  },
  methods: {
    submitContactForm() {
      // Here you would typically send the form data to a server
      // For now, we'll just show a success message
      this.presentToast('Your message has been sent successfully! We\'ll get back to you soon.');
      
      // Reset the form
      this.contactForm = {
        name: '',
        email: '',
        subject: 'question',
        message: ''
      };
    }
  }
})
