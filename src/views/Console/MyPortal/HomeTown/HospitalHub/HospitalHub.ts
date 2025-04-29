import { defineComponent } from "vue";
import ionic from "@/mixins/ionic";
import { actionSheetController, alertController } from "@ionic/vue";
import XpIcon from "@/components/XpIcon";
import XpTypingText from "@/components/XpTypingText/XpTypingText.vue";
import { mapGetters } from "vuex";
import { close, heart, infinite, logOut, people, statsChart } from "ionicons/icons";
import debug from "@/lib/utils/debug";

export default defineComponent({
  props: ["userId"],
  name: "hospital-hub",
  mixins: [ionic],
  components: {
    XpIcon,
    XpTypingText
  },
  data() {
    return {
      isLoading: false,
      isModalOpen: false,
      isDialogVisible: false,
      currentDialogIndex: 0,
      currentDialogText: "",
      hasMoreDialog: true,
      isTyping: false
    };
  },
  computed: {
    ...mapGetters({
      users: "usersAz"
    }),
    actionButtons() {
      return [
        {
          text: "Heal Ailments",
          role: "heal",
          icon: heart,
          handler: this.handleHeal,
          cssClass: "action-heal",
        },
        {
          text: "Revive Heroes",
          role: "revive",
          icon: infinite,
          handler: this.handleRevive,
          cssClass: "action-revive",
        },
        {
          text: "Check Vital Stats",
          role: "stats",
          icon: statsChart,
          handler: this.handleStats,
          cssClass: "action-stats",
        },
        {
          text: "View Patients",
          role: "patients",
          icon: people,
          handler: this.openPatientsModal,
          cssClass: "action-patients",
        },
        {
          text: "Leave Hospital",
          role: "leave",
          icon: logOut,
          handler: () => {
            this.$router.go(-1);
          },
          cssClass: "action-leave",
        },
        {
          text: "Cancel",
          role: "cancel",
          icon: close,
          cssClass: "action-cancel",
        },
      ];
    },
    dialogBlocks() {
      return [
        "Welcome to the Hospital Hub! *adjusts stethoscope* I'm Nurse Joy. How are you feeling today?",
        "You look like you've had quite an adventure out there! We're here to help you recover and get back on your feet.",
        "Our hospital offers several services to help adventurers like yourself. What can I assist you with today?"
      ];
    }
  },
  mounted() {
    // Set initial dialog text
    this.currentDialogText = this.dialogBlocks[0];
  },
  methods: {
    showNurseDialog() {
      // Play a sound effect for immersion
      this.play$fx("select");
      
      // Reset and show the dialog
      this.currentDialogIndex = 0;
      this.currentDialogText = this.dialogBlocks[0];
      this.hasMoreDialog = this.dialogBlocks.length > 1;
      this.isDialogVisible = true;
      this.isTyping = true;
    },
    
    advanceDialog() {
      // If typing is in progress, complete the current text immediately
      if (this.isTyping) {
        this.isTyping = false;
        // Skip typing animation by immediately showing the full text
        this.currentDialogText = this.dialogBlocks[this.currentDialogIndex];
        return;
      }
      
      // If not typing, advance to next dialog block
      if (this.currentDialogIndex < this.dialogBlocks.length - 1) {
        this.currentDialogIndex++;
        this.currentDialogText = this.dialogBlocks[this.currentDialogIndex];
        this.hasMoreDialog = this.currentDialogIndex < this.dialogBlocks.length - 1;
        this.isTyping = true;
      } else {
        // End of dialog, close and show options
        this.isDialogVisible = false;
        this.showActionSheet();
      }
    },
    
    onTypingComplete() {
      // The current text block has finished typing
      debug.log(`Dialog block ${this.currentDialogIndex} completed`);
      this.isTyping = false;
      
      // Play subtle sound effect between blocks if there are more blocks
      if (this.currentDialogIndex < this.dialogBlocks.length - 1) {
        this.play$fx("text");
      }
    },
    
    openPatientsModal() {
      this.isModalOpen = true;
    },
    
    closePatientsModal() {
      this.isModalOpen = false;
    },
    
    async showActionSheet() {
      const action = await actionSheetController.create({
        header: "How can we assist you today?",
        buttons: this.actionButtons,
        cssClass: 'hospital-action-sheet',
        mode: "ios",
        backdropDismiss: true,
      });
      
      await action.present();
    },

    async handleHeal() {
      const alert = await alertController.create({
        header: 'Healing Cost',
        message: 'The cost to heal is 50GP. Would you like to proceed?',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            cssClass: 'alert-cancel'
          },
          {
            text: 'Pay & Heal',
            role: 'confirm',
            cssClass: 'alert-confirm',
            handler: () => {
              this.payCoPay();
            }
          }
        ],
        cssClass: 'hospital-alert'
      });

      await alert.present();
    },

    async payCoPay() {
      // Add healing logic here
      this.isLoading = true;
      setTimeout(() => {
        this.isLoading = false;
      }, 2000);
    },

    async handleRevive() {
      const alert = await alertController.create({
        header: 'Revive Cost',
        message: 'The cost to revive is 100GP. Would you like to proceed?',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            cssClass: 'alert-cancel'
          },
          {
            text: 'Pay & Revive',
            role: 'confirm',
            cssClass: 'alert-confirm',
            handler: () => {
              this.payCoPay();
            }
          }
        ],
        cssClass: 'hospital-alert'
      });

      await alert.present();
    },

    async handleStats() {
      const alert = await alertController.create({
        header: 'Vital Stats Check',
        message: 'Would you like to check your vital stats?',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            cssClass: 'alert-cancel'
          },
          {
            text: 'Check Stats',
            role: 'confirm',
            cssClass: 'alert-confirm',
            handler: () => {
              this.$router.push(`/my-portal/${this.userId}/hospital/stats`);
            }
          }
        ],
        cssClass: 'hospital-alert'
      });

      await alert.present();
    }
  }
});
