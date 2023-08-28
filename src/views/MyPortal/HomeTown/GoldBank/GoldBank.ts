import { defineComponent } from "vue";
import { mapActions, mapGetters } from "vuex";
import ionic from "@/mixins/ionic";

import {
  arrowBack,
  removeCircleOutline,
  addCircleOutline,
  walletOutline,
  chevronBack,
  chevronForward,
  stop,
  play,
  pause,
  colorWand,
  colorWandOutline,
  lockClosedOutline,
  lockOpenOutline,
  sunnyOutline,
  partlySunnyOutline,
  moonOutline,
  cloudyNightOutline,
  fitnessOutline,
  sparklesOutline,
  keyOutline,
  cartOutline,
  starSharp,
  storefrontOutline,
  banOutline,
  bagOutline,
  close

} from "ionicons/icons";
import fetchItems from "@/mixins/fetchItems"
import { actionSheetController, alertController, toastController } from "@ionic/vue";
import Stats from "@/utils/User/stats";
import { ProfileDb } from "@/databases";
import { profileStorage } from "@/views/App/SideMenu/SwitchProfile/SwitchProfile.vue";

export default defineComponent({
  props: ["userId"],
  name: "gold-bank",
  mixins: [ionic, fetchItems],
  data() {
    return {
      isLoading: false,
      shelves: ['affordable'],
      request: {
        type: "xp_accessory",
        params: {
          page: 1,
          search: "",
          per_page: 4,
        },
      },
    };
  },
  computed: {
    ...mapGetters(["getUserById"]),
    user() {
      return this.getUserById(this.userId)
    }

  },
  methods: {
    ...mapActions(["loadUsers"]),
    async presentActionSheet() {
      const actionSheet = await actionSheetController
        .create({
          // header: 'Welcome to the Automatic Teller Machine.',
          cssClass: 'my-custom-class',
          buttons: [
            // {
            //   text: 'Use Atm',
            //   // icon: cashOutline,
            //   id: 'bank-atm',
            //   data: {
            //     type: 'delete'
            //   },
            //   handler: () => {
            //     // console.log('Delete clicked')
            //   },
            // },
            {
              text: 'Withdraw from Savings',
              icon: walletOutline,
              data: 10,
              handler: this.clickWithdraw,
            },
            {
              text: 'Deposit to Savings',
              icon: addCircleOutline,
              data: 'Data value',
              handler: this.clickDeposit,
            },
            {
              text: 'Pay down Debt',
              icon: removeCircleOutline,
              handler: this.clickPayDebt,
            },
            {
              text: 'Cancel',
              icon: close,
              role: 'cancel',
              handler: () => {
                // console.log('Cancel clicked')
              },
            },
          ],
        });
      await actionSheet.present();

      await actionSheet.onDidDismiss();
      // console.log('onDidDismiss resolved with role and data', role, data);
    },

    async clickPayDebt() {
      const { wallet, debt } = this.user.stats.gp
      const isWalletEmpty  = wallet <= 0 
      if(isWalletEmpty){
        const alert = await alertController.create({
          header: "Your wallet is empty!",
          buttons: ["Ok"]
        })
        alert.present()
      }else{
        const alert = await alertController.create({
          header: `Pay Down Debt (₲${debt}.00)`,
          buttons: [{
            text: "Cancel",
            role: "cancel",
            cssClass: "secondary",
            handler: () => {
              // console.log("Confirm Cancel:", blah);
            },
          }, {
            text: "Pay",
            handler: this.payDebt,
          }],
          inputs: [{
            placeholder: 'GP',
            type: 'number',
            name: "gp",
            max: wallet < debt ? wallet : debt,
            min: 0 
          }],
        })
        alert.present()
      }
      },
    payDebt({ gp }: Stats) {
      const wallet = Math.round(Number(this.user.stats.gp.wallet) - Number(gp))
      const debt = Math.round(Number(this.user.stats.gp.debt) - Number(gp))
      const updatedUser = {
        ...this.user.stats,
        gp: {
          ...this.user.stats.gp,
          wallet,
          debt
        }
      }

      const showToast = () => this.showToast(`Thank you for your payment of ${gp}. Your new balance is: ${debt}`) 

      this.profileDb
        .updateStats(this.userId, updatedUser)
        .then(this.loadUsers)
        .then(showToast)

    },

    async clickWithdraw() {
      const { limit, wallet, savings } = this.user.stats.gp
      const isWalletFull  = wallet >= limit
      if(isWalletFull){
        const alert = await alertController.create({
          header: "Your wallet is full!",
          buttons: ["Ok"]
        })
      alert.present()
      }else{
        const holdLimit = limit - wallet
        const alert = await alertController.create({
          header: `Withdraw from Savings: (₲${this.user.stats.gp.savings}.00)`,
          buttons: [{
            text: "Withdraw",
            handler: this.withdrawSavings,
          }],
          inputs: [{
            placeholder: 'GP',
            type: 'number',
            name: 'gp',
            max: holdLimit >= savings ? savings : holdLimit,
            min: 0 
          }],
        })
      alert.present()
      }

    },

    async clickDeposit() {
      const { wallet, savings } = this.user.stats.gp
      const isWalletEmpty  = wallet <= 0 
      if(isWalletEmpty){
        const alert = await alertController.create({
          header: "Your wallet is empty!",
          buttons: ["Ok"]
        })
        alert.present()
      }else{
        const alert = await alertController.create({
          header: `Deposit to Savings: (₲${savings}.00)`,
          buttons: [{
            text: "Deposit",
            handler: this.depositGp,
          }],
          inputs: [{
            placeholder: 'GP',
            type: 'number',
            name: 'gp',
            max: wallet,
            min: 1
          }],
        })
        alert.present()
      }
    },

    withdrawSavings({ gp }: Stats) {
      const savings = Math.round(Number(this.user.stats.gp.savings) - Number(gp))
      const wallet = Math.round(Number(this.user.stats.gp.wallet) + Number(gp))

      const debt = savings < 0
        ? Math.round(Number(this.user.stats.gp.debt) - Number(savings))
        : this.user.stats.gp.debt


      const updatedUser = {
        ...this.user.stats,
        gp: {
          ...this.user.stats.gp,
          wallet,
          savings: savings > 0 ? savings : 0,
          debt
        }
      }

      const showToast = () => this.showToast(`₲${gp} GP Withdrawn. New Balance: ₲${debt}.`) 

      this.profileDb.updateStats(this.user.id, updatedUser)
      .then(this.loadUsers)
      .then(showToast)
    },
    depositGp({ gp }: any) {
      const wallet = Math.round(Number(this.user.stats.gp.wallet) - Number(gp))
      const savings = Math.round(Number(this.user.stats.gp.savings) + Number(gp))
      const debt = wallet < 0
        ? Math.round(Number(this.user.stats.gp.debt) - Number(wallet))
        : this.user.stats.gp.debt

      const updatedUser = {
        ...this.user.stats,
        gp: {
          ...this.user.stats.gp,
          wallet: wallet > 0 ? wallet : 0,
          savings,
          debt
        }
      }

      const showToast = () => this.showToast(`Thank you for your deposit of ₲${gp}. Your new balance is: ₲${savings}`) 

      this.profileDb.updateStats(this.user.id, updatedUser )
        .then(this.loadUsers)
        .then(showToast)
    },

    async showToast(message: string){
        const toast = await toastController.create({
          message,
          duration: 3000,
          position: 'bottom'
        })
        toast.present()
    },
  },


  setup() {
  const profileDb =  new ProfileDb(profileStorage)

    return {
      profileDb,
      storefrontOutline,
      banOutline,
      chevronBack,
      chevronForward,
      stop,
      play,
      pause,
      arrowBack,
      colorWand,
      colorWandOutline,
      lockClosedOutline,
      lockOpenOutline,
      bagOutline,
      sunnyOutline,
      partlySunnyOutline,
      moonOutline,
      cloudyNightOutline,
      fitnessOutline,
      sparklesOutline,
      keyOutline,
      cartOutline,
      starSharp,

    }
  },
});
