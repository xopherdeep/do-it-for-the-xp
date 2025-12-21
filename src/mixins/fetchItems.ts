import {
  IonButton,
  IonButtons,
  IonCol,
  IonContent,
  IonGrid,
  IonModal,
  IonRow,
  IonSearchbar,
  IonToolbar,
  IonicSlides
} from "@ionic/vue";

import 'swiper/scss';
import '@ionic/vue/css/ionic-swiper.css';

import { defineComponent } from "vue";

import { Swiper, SwiperSlide } from 'swiper/vue';
import { useGameStore } from "@/lib/store/stores/game";
import { useUserStore } from "@/lib/store/stores/user";
import { mapStores } from "pinia";
import XpLoading from "@/components/XpLoading/XpLoading.vue";

export default defineComponent({
  props: ["userId"],
  components: {
    Swiper,
    SwiperSlide,
    IonButton,
    IonButtons,
    IonCol,
    IonContent,
    IonGrid,
    IonModal,
    IonRow,
    IonSearchbar,
    IonToolbar, 
    IonicSlides,
    XpLoading,
  },
  data() {
    return {
      isLoading: false,
      activeModal: 0,
      request: {
        type: "",
        params: {
          page: 1,
          search: "",
          per_page: 4,
          order: "asc",
          orderby: "slug",
        },
      },
    };
  },
  computed: {
    ...mapStores(useGameStore, useUserStore),
    user() {
      return (this as any).userStore.getUserById(this.userId);
    },
    items() {
      return (this as any).gameStore.getRequestedItems(this.request.type, this.request.params);
    },
    images() {
      return (this as any).items.map((t: any) => t.featured_media);
    },
    hasNextPage() {
      return (this as any).page < (this as any).nTotalPages
    },
    nTotalPages() {
      return parseInt((this as any).gameStore.getTotalPages((this as any).request.type, (this as any).request.params));
    },
    nTotalItems() {
      return parseInt((this as any).gameStore.getTotalItems((this as any).request.type, (this as any).request.params));
    },
    slides() {
      return this.$refs.slides
    },
    currentPage() {
      return this.request.params.page;
    },

    page: {
      get() {
        return this.request.params.page
      },
      set(page) {
        this.$emit("update:page", page)
      }
    }
  },
  mounted() {
    // if(this.request.type)
    //   this.getItems(1);
  },
  methods: {

    getImages(page: number) {
      return (this as any).gameStore.getRequestedItems((this as any).request.type, {
        ...(this as any).request.params,
        page
      }).map((t: any) => t.featured_media);
    },
    getSlideItems(page: number) {
      return (this as any).gameStore.getRequestedItems((this as any).request.type, {
        ...(this as any).request.params,
        page
      });
    },
    isModalOpen(id) {
      return this.activeModal == id
    },
    async getItems(page = 1) {
      this.showLoading();
      return await this.fetchItems(page).then(this.hideLoading);
    },
    showLoading() {
      this.isLoading = true;
    },
    hideLoading() {
      this.isLoading = false;
    },
    async fetchItems(page = 1) {
      return (this as any).gameStore.fetchWPItems((this as any).request.type, {
        ...(this as any).request.params,
        page
      }).then(() => (this as any).fetchImages(page));
    },
    fetchImages(page: number) {
      const { getImages } = this as any;
      return (this as any).gameStore.fetchWPItems("media", {
        include: getImages(page).join(","),
      });
    },
    getImgObj(id: string) {
      const img = this.getSingleMediaById(id);
      if (img)
        return {
          src: img.source_url,
          alt: img.alt_text,
          title: img.title.rendered,
        };
    },
    getSingleMediaById(id: string) {
      return (this as any).gameStore.getSingleById("media", id);
    },
  },
  watch: {
    request: {
      handler() {
        // This handler will react to request changes
        // Commented out for now:
        // this.getItems(request.params.page);
      },
      deep: true,
    },
  },
});
