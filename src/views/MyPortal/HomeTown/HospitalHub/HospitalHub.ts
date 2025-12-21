import { defineComponent } from "vue";
import ionic from "@/mixins/ionic";

export default defineComponent({
  props: ["userId"],
  name: "hospital-hub",
  mixins: [ionic],
  data() {
    return {
      isLoading: false,
    };
  },
  methods: {
  },
  mounted() {
    // this.$fx.ui[this.$fx.theme.ui].openShop.play()
  },
  setup() {
const customAlertOptions = {
      header: 'Pizza Toppings',
      subHeader: 'Select your toppings',
      message: '$1.00 per topping',
      translucent: true
    };
    return {
      customAlertOptions,
      stop,
    };
  },
});
