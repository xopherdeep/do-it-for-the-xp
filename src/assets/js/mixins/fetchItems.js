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
} from "@ionic/vue";

import { defineComponent } from "vue";
import { mapActions, mapGetters } from "vuex";
import XpLoading from "@/views/XpLoading/XpLoading.vue";

export default defineComponent({
  props: ["userId"],
  components: {
    IonButton,
    IonButtons,
    IonCol,
    IonContent,
    IonGrid,
    IonModal,
    IonRow,
    IonSearchbar,
    IonToolbar,
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
      const { nTotalPages, request } = this;
      return nTotalPages != request.params.page || nTotalPages > 2;
    },
    nTotalPages(){
      const { totalPages, request } = this;
      return parseInt(totalPages(request));
    },
    nTotalItems(){
      const { totalItems, request } = this;
      return parseInt(totalItems(request));
    },
  },
  mounted() {
    if(this.request.type)
      this.getItems();
  },
  methods: {
    clickPrev(){
      this.$refs.slides.slidePrev()
    },
    getImages(page){
      return this.requestedItems({
        ...this.request,
        params: {
          ...this.request.params,
          page
        }
      }).map((t) => t.featured_media);
    },
    clickNext(){
      this.$refs.slides.slideNext()
    },
    getSlideItems(page){
      return this.requestedItems({
        ...this.request,
        params: {
          ...this.request.params,
          page
        }
      });
    },
    isModalOpen(id){
      return this.activeModal == id
    },
    ...mapActions(["fetchWPItems"]),
    async getItems(page) {
      this.showLoading();
      return await this.fetchItems(page).then(this.hideLoading);
    },
    showLoading() {
      this.isLoading = true;
    },
    hideLoading() {
      this.isLoading = false;
    },
    fetchItems(page=1) {
      return this.fetchWPItems({
        ...this.request,
        params: { 
          ...this.request.params,
          page 
        }
      }).then(()=>this.fetchImages(page));
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
        this.getItems(request.params.page);
      },
      deep: true,
    },
  },
});
