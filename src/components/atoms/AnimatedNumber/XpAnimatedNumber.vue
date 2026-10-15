<template>
  <div>
    {{displayNumber}}
  </div>
</template>

<script>
  import { defineComponent } from "vue";

  export default defineComponent({
    template: "{{displayNumber}}",
    props: { number: { default: 0 } },
    data: function () {
      return {
        displayNumber: 0,
        interval: false,
      };
    },

    ready: function () {
      this.displayNumber = this.number ? this.number : 0;
    },

    methods:{
      doneCounting(){
          this.$fx.rpg[this.$fx.theme.rpg].countCoins.pause();

              this.$emit('finished')
      }
    },

    watch: {
      number: function () {
        clearInterval(this.interval);

        const isSettled = this.number == this.displayNumber;
        if (isSettled) {
          return;
        }

        this.interval = window.setInterval(()=>{
            const isCounting = this.displayNumber != this.number;
            if (isCounting) {
              var change = (this.number - this.displayNumber) / 10;

              change = change >= 0 ? Math.ceil(change) : Math.floor(change);

              this.displayNumber = this.displayNumber + change;
            }
        }
          ,
          20
        );
      },
    },
  });
</script>
