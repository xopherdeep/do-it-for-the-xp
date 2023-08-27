<template>
  <swiper
    :navigation="swiperNavigation"
    :modules="modules"
    ref="slides"
    @slidePrevTransitionStart="prev"
    @slideNextTransitionStart="next"
    @swiper="setControlledSwiper"
  >
    <swiper-slide 
      v-for="page in nTotalPages" pager="true" 
      :key="page"
      :data-page="page"
    >
      <ion-grid>
        <ion-row>
          <ion-col
            size="6"
            size-md="3"
            v-for="item in items"
            :key="`${page}-${item.id}`"
            class="ion-no-padding"
          >
            <ion-card
              @click="clickItem(item)"
              button
              class="item ion-no-padding"
              :id="item.id"
            >
              <!-- :router-link="`/my-tasks/${userId}/task/${item.id}`" -->
              <ion-card-title v-if="isFetching">
                <ion-skeleton-text :animated="true" style="width: 100px;"></ion-skeleton-text>
              </ion-card-title>
              <ion-card-title
                v-else
                v-html="item.title.rendered"
              ></ion-card-title>

              <ion-thumbnail v-if="isFetching">
                <ion-skeleton-text :animated="true" style="width: 100%;"></ion-skeleton-text>
              </ion-thumbnail>
              <ion-img v-else-if="item._embedded" v-bind="getFeaturedImg(item._embedded)"/>

              <!-- <ion-button v-if="isFetching" expand="block">
                <ion-skeleton-text :animated="true" style="width: 100%;"></ion-skeleton-text>
              </ion-button> -->
              <!-- <ion-button v-else color="primary">
                View Quest
              </ion-button> -->

              <ion-card-content class="ion-no-margin ion-no-padding">
                <!-- <ion-badge color="warning">
                  {{item.meta._xp_achievement_gp}}
                  &nbsp;
                  <strong>GP</strong>
                </ion-badge>
                <ion-badge color="tertiary">
                  {{item.meta._xp_achievement_ap}}
                  &nbsp;
                  <strong>AP</strong>
                </ion-badge>
                <ion-badge color="success">
                  {{item.meta._xp_achievement_xp}}
                  &nbsp;
                  <strong>XP</strong>
                </ion-badge> -->
              </ion-card-content>
            </ion-card>
            <MyTask
              @didDismiss="activeModal = 0"
              :item="item"
              :user="user"
              v-if="activeModal == item.id"
            />
          </ion-col>
        </ion-row>
      </ion-grid>
    </swiper-slide>
  </swiper>
</template>


<script lang="ts">
  import { computed, defineComponent, reactive, ref } from 'vue'
  import { Controller, Navigation } from "swiper";
  import { IonicSlides } from '@ionic/vue';
  import { useQueryClient } from 'vue-query';
  import fetchItems from '@/mixins/fetchItems';

  import ionic from "@/mixins/ionic"

  export default defineComponent({
    props: ["items", "nTotalPages", "nTotal", "isFetching", "params"],
    mixins: [fetchItems, ionic],
    data(){
      return{
        activeModal: 0,
        swiperNavigation: {
          nextEl: "#swiper-forward",
          prevEl: "#swiper-back",
        },
      }
    },

    computed: {
      page: {
        get(){
          return this.$props.params.page
        },
        set(page){
          this.$emit("update:changePage", page)
        } 
      }
    },
    methods: {
      // searchChanged() {
      //   this.$refs.slides.slideTo(0);
      //   this.currentSlide = 0;
      //   this.params.page = 1;
      // },
      prev() {
        this.$emit('prev')
      },
      next() {
        this.$emit('next')
      },

      clickItem(item) {
        this.activeModal = item.id;
      },

      isModalOpen(id) {
        return this.activeModal == id;
      },

      getFeaturedImg(embedded){
        const [ img ] = embedded["wp:featuredmedia"] || [{}] 
        return {
          src: img?.source_url,
          alt: img?.alt_text,
        };
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
    },
    setup(props) {
      // const queryClient = useQueryClient();
      const controlledSwiper = ref(null);
      const setControlledSwiper = (swiper) => {
        controlledSwiper.value = swiper;
      };


      return {
        setControlledSwiper,
        modules: [IonicSlides, Navigation, Controller],
      }
    },
  })
</script>
