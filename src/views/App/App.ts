import { computed, defineComponent, getCurrentInstance, ref } from "vue"
import { useRoute } from "vue-router";
import {
  IonApp,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenu,
  IonMenuToggle,
  IonNote,
  IonRouterOutlet,
  IonSplitPane,
  alertController
} from "@ionic/vue";

import {
  archiveOutline,
  archiveSharp,
  bookmarkOutline,
  bookmarkSharp,
  heartOutline,
  heartSharp,
  mailOutline,
  mailSharp,
  paperPlaneOutline,
  paperPlaneSharp,
  trashOutline,
  trashSharp,
  warningOutline,
  warningSharp,
} from "ionicons/icons";
import { mapActions, mapState, useStore } from "vuex";


import appPages from "./App.Pages";
import appPagesAnon from "./App.Pages.Anon";

export default defineComponent({
  name: "App",
  components: {
    IonApp,
    IonContent,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonMenu,
    IonMenuToggle,
    IonNote,
    IonRouterOutlet,
    IonSplitPane,
  },
  computed: {
    ...mapState(['users', 'user']),
  },
  methods: {
    ...mapActions(['loadUsers']),
    clickSound(){
      const vm = getCurrentInstance()
      console.log(vm);
      
      // vm.$fx.ui[vm.$fx.theme.ui].select.play()
    },
    getCurrentMenu(){
      return this.isLoggedIn
        ? appPages
        : appPagesAnon
    },
    async presentAlertConfirm() {
      const alert = await alertController
        .create({
          cssClass: 'my-custom-class',
          header: 'Confirm!',
          message: 'Message <strong>text</strong>!!!',
          buttons: [
            {
              text: 'Cancel',
              role: 'cancel',
              cssClass: 'secondary',
              id: 'cancel-button',
              handler: blah => {
                console.log('Confirm Cancel:', blah)
              },
            },
            {
              text: 'Okay',
              id: 'confirm-button',
              handler: () => {
                console.log('Confirm Okay')
              },
            },
          ],
        });
      return alert.present();
    },
  },
  watch:{

  },
  setup() {
    const selectedIndex = ref(0);
    const menus = { 
      app: {

      },
      user: {

      },
      support: {

      }
    } 
    const userMenu = []
    const labels = [
      "Family",
      "Friends",
      "Notes",
      "Work",
      "Travel",
      "Reminders",
    ];

    const path = window.location.pathname.split("folder/")[1];
    if (path !== undefined) {
      selectedIndex.value = appPages.findIndex(
        (page) => page.title.toLowerCase() === path.toLowerCase()
      );
    }

    const route = useRoute();
    const store = useStore();
    store.dispatch('loadUsers');


    return {
      isLoggedIn: computed( () => store.getters.isLoggedIn ),
      selectedIndex,
      appPages,
      appPagesAnon,
      labels,
      archiveOutline,
      archiveSharp,
      bookmarkOutline,
      bookmarkSharp,
      heartOutline,
      heartSharp,
      mailOutline,
      mailSharp,
      paperPlaneOutline,
      paperPlaneSharp,
      trashOutline,
      trashSharp,
      warningOutline,
      warningSharp,
      isSelected: (url: string) => (url === route.path ? "selected" : ""),
    };
  },
});
