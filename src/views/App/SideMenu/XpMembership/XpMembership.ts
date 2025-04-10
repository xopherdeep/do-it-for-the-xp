import { defineComponent } from 'vue'
import { useRouter } from 'vue-router'
import { toastController, alertController } from '@ionic/vue'

import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent,
  IonText,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardTitle,
  IonCardHeader,
  IonCardContent,
  IonChip,
  IonBadge,
  IonList,
  IonItem,
  IonIcon,
  IonButton,
  IonModal,
  IonLabel,
  IonToggle,
  IonSegment,
  IonSegmentButton
} from '@ionic/vue'

import {
  arrowBack,
  checkmarkCircle,
  stopCircle,
  calendarOutline,
  cardOutline,
  helpCircleOutline,
  informationCircleOutline,
  starOutline,
  trendingUpOutline,
  walletOutline,
  refreshOutline
} from "ionicons/icons"

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  savings: number;
}

export default defineComponent({
  name: 'xp-membership',
  data() {
    return {
      benefits: [
        "No-Ads Experience",
        "Unlimited Usage & Access",
        "Exclusive Member Offers",
        "Premium Features & Content",
        "Price Lock Guaranteed",
        "Priority Customer Support"
      ],
      plans: [
        { 
          id: 'monthly',
          name: 'Monthly',
          price: 4.99,
          interval: 'month',
          savings: 0
        },
        { 
          id: 'annual',
          name: 'Annual',
          price: 49.99,
          interval: 'year',
          savings: 20
        }
      ],
      activePlan: 'annual',
      isModalOpen: false,
      nextPaymentDate: 'Friday, 12 August 2022',
      memberSince: 'January 15, 2022',
      paymentMethod: {
        type: 'Visa',
        last4: '4242'
      }
    }
  },
  components: {
    IonPage,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonText,
    IonTitle,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardTitle,
    IonCardHeader,
    IonCardContent,
    IonChip,
    IonBadge,
    IonList,
    IonItem,
    IonIcon,
    IonButton,
    IonModal,
    IonLabel,
    IonToggle,
    IonSegment,
    IonSegmentButton
  },
  computed: {
    currentPlan() {
      return this.plans.find(plan => plan.id === this.activePlan)
    }
  },
  methods: {
    async openCancelModal() {
      this.isModalOpen = true
    },
    closeModal() {
      this.isModalOpen = false
    },
    async confirmCancel() {
      const alert = await alertController.create({
        header: 'Confirm Cancellation',
        message: 'Are you sure you want to cancel your membership? You will lose access to premium features at the end of your billing period.',
        buttons: [
          {
            text: 'No, Keep It',
            role: 'cancel',
            handler: () => {
              // Make sure isModalOpen is set to false directly
              this.isModalOpen = false
            }
          },
          {
            text: 'Yes, Cancel',
            handler: () => {
              this.processCancellation()
            }
          }
        ]
      })
      await alert.present()
    },
    async processCancellation() {
      // Here you would call your API to cancel the subscription
      this.isModalOpen = false // Set directly instead of using this.closeModal()
      
      // Check if toastController exists before using it
      if (toastController) {
        const toast = await toastController.create({
          message: 'Your membership has been canceled. It will remain active until the end of your billing period.',
          duration: 3000,
          position: 'bottom',
          color: 'warning'
        })
        await toast.present()
      }
    },
    async changePlan(planId: string) {
      this.activePlan = planId;
      // Find the plan in the typed array
      const matchingPlan = (this.plans as Plan[]).find(plan => plan.id === planId);
      const planName = matchingPlan ? matchingPlan.name : planId;
      
      if (toastController) {
        const toast = await toastController.create({
          message: `Your plan preference has been updated to ${planName}`,
          duration: 2000,
          position: 'bottom',
          color: 'success'
        });
        await toast.present();
      }
    },
    formatCurrency(amount) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount)
    }
  },
  setup() {
    const router = useRouter()
    
    return {
      arrowBack,
      checkmarkCircle,
      stopCircle,
      calendarOutline,
      cardOutline,
      helpCircleOutline,
      informationCircleOutline,
      starOutline,
      trendingUpOutline,
      walletOutline,
      refreshOutline,
      router
    }
  }
})
