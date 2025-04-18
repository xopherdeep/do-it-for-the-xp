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
  IonSlides,
  IonSlide,
  IonicSlides
} from "@ionic/vue";

import 'swiper/scss';
import '@ionic/vue/css/ionic-swiper.css';

import { defineComponent } from "vue";

import { Swiper, SwiperSlide } from 'swiper/vue';
import { mapActions, mapGetters } from "vuex";
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
    IonSlide,
    IonSlides,
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
    ...mapGetters([
      "requestedItems",
      "getUserById",
      "singleById",
      "totalPages",
      "totalItems",
    ]),
    user() {
      return this.getUserById(this.userId);
    },
    items() {
      return this.requestedItems(this.request);
    },
    images() {
      return this.items.map((t) => t.featured_media);
    },
    hasNextPage() {
      return this.page < this.nTotalPages
    },
    nTotalPages() {
      const { totalPages, request } = this;
      return parseInt(totalPages(request));
    },
    nTotalItems() {
      const { totalItems, request } = this;
      return parseInt(totalItems(request));
    },
    slides() {
      return this.$refs.slides
    },
    currentPage() {
      return
      return this.request.params.page
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

    getImages(page) {
      return this.requestedItems({
        ...this.request,
        params: {
          ...this.request.params,
          page
        }
      }).map((t) => t.featured_media);
    },
    getSlideItems(page) {
      return this.requestedItems({
        ...this.request,
        params: {
          ...this.request.params,
          page
        }
      });
    },
    isModalOpen(id) {
      return this.activeModal == id
    },
    ...mapActions(["fetchWPItems"]),
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
    fetchItems(page = 1) {
      return this.fetchWPItems({
        ...this.request,
        params: {
          ...this.request.params,
          page
        }
      }).then(() => this.fetchImages(page));
    },
    fetchImages(page) {
      const { getImages, fetchWPItems } = this;
      return fetchWPItems({
        type: "media",
        params: {
          include: getImages(page).join(","),
        },
      });
    },
    getImgObj(id) {
      const img = this.getSingleMediaById(id);
      if (img)
        return {
          src: img.source_url,
          alt: img.alt_text,
          title: img.title.rendered,
        };
    },
    getSingleMediaById(id) {
      return this.singleById({ type: "media", id });
    },
  },
  watch: {
    request: {
      handler(request) {
        // console.log(request);
        // this.getItems(request.params.page);
      },
      deep: true,
    },
  },
});
