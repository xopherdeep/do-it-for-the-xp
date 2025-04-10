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
  IonSegmentButton,
  IonRadio
} from '@ionic/vue'

import {
  arrowBack,
  checkmarkCircle,
  stopCircle, // Keep for potential use, or remove if definitely unused
  calendarOutline, // Keep for potential use, or remove if definitely unused
  calendarClearOutline, // New
  cardOutline,
  helpCircleOutline, // Keep for potential use, or remove if definitely unused
  informationCircleOutline, // Keep for potential use, or remove if definitely unused
  starOutline, // Keep for potential use, or remove if definitely unused
  trendingUpOutline, // Keep for potential use, or remove if definitely unused
  walletOutline, // Keep for potential use, or remove if definitely unused
  refreshOutline, // Keep for potential use, or remove if definitely unused
  shieldCheckmark, // New
  sparklesOutline, // New
  rocketOutline, // New
  peopleOutline, // New
  pauseCircleOutline, // New
  sadOutline, // New
  gameControllerOutline, // New
  banOutline, // New
  lockClosedOutline, // New
  playCircleOutline // New
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
        "Enjoy an Ad-Free Experience",
        "Unlock All Quests & Activities",
        "Access Exclusive Family Challenges",
        "Get Special Avatars & Items",
        "Keep Your Current Price Locked In",
        "Receive Priority Helper Support"
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
    // IonToggle, // Removed if not used
    // IonSegment, // Removed as replaced by cards
    // IonSegmentButton, // Removed as replaced by cards
    IonRadio
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
        header: 'Pause Adventure Pass?',
        message: 'Your pass will remain active until the end of the current period. Are you sure you want to pause?',
        cssClass: 'confirm-cancel-alert',
        buttons: [
          {
            text: 'Keep Adventuring',
            role: 'cancel',
            cssClass: 'keep-button',
            handler: () => {
              this.isModalOpen = false
            }
          },
          {
            text: 'Yes, Pause Pass',
            cssClass: 'pause-button',
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
      // Here you would call your API to cancel the subscription
      this.isModalOpen = false // Set directly instead of using this.closeModal()

      if (toastController) {
        const toast = await toastController.create({
          message: 'Your Adventure Pass is scheduled to pause. You can resume anytime!',
          duration: 3500,
          position: 'bottom',
          color: 'medium', // Less alarming than warning
          icon: pauseCircleOutline
        })
        await toast.present()
      }
    },
    async changePlan(planId: string) {
      this.activePlan = planId;
      // Find the plan in the typed array
      const matchingPlan = (this.plans as Plan[]).find(plan => plan.id === planId);
      const planName = matchingPlan ? matchingPlan.name : planId;
      
      // Add logic here if changing plan requires API call, e.g., updateSubscription(planId)
      if (toastController) {
        const toast = await toastController.create({
          message: `Adventure Pass updated to ${planName}!`,
          duration: 2500,
          position: 'bottom',
          color: 'success',
          icon: checkmarkCircle
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
      // Keep necessary base icons
      arrowBack, 
      checkmarkCircle,
      cardOutline,
      // Add new icons
      shieldCheckmark,
      sparklesOutline,
      rocketOutline,
      peopleOutline,
      calendarClearOutline,
      pauseCircleOutline,
      sadOutline,
      gameControllerOutline,
      banOutline,
      lockClosedOutline,
      playCircleOutline,
      // Remove unused icons if desired (or keep them)
      // stopCircle, calendarOutline, helpCircleOutline, informationCircleOutline, starOutline, trendingUpOutline, walletOutline, refreshOutline,
      router
    }
  }
})
