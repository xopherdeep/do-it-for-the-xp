import { defineComponent } from "vue";

const TravelingMerchant = defineComponent({
  data(){
    return {
      merchant: {
        // label: "Traveling Merchant",
        // label: "Douglas",
        label: "Boobeedeedle",
        // label: "The Watcher",
        // label: "Terrance",
        // label: "Dr. Who",
        // label: "Francis",
        faIcon: "wagon-covered",
        side: "start",
        travels : {
          sunday: 'world-plains',
          monday: 'world-islands',
          tuesday: 'world-forest',
          wednesday: 'world-swamps',
          thursday: 'world-mountains',
          friday: 'world-sands',
          saturday: 'world-ice',
        },
      },
    }
  },

  computed: {
    merchantAction(){
      const { merchant: { label, faIcon, side }, $router } = this
      const click = () => $router.push({ 
        name: "shop", 
        params: {
          merchant: "traveling-merchant"
        } 
      })
      return { label, side, faIcon, click }
    },

    areaWhereMerchantIs(){
      return this.merchant.travels[ this.dayOfTheWeek ]  
    },

    dayOfTheWeek(){
      const today = new Date()
      return today
        .toLocaleDateString('en-US', { weekday: 'long', })
        .toLowerCase()
    },
  },

  methods: {
    maybeAddMerchantToActionsIfInArea({ actions, area }){
      if( this.isMerchantInArea(area) )
        actions.push( this.merchantAction )
    },

    isMerchantInArea(area){
      return this.areaWhereMerchantIs == area 
    },

    // click(){
    //   this.
    // },
  },
})

export default TravelingMerchant