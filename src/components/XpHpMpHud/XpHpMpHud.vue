<template>
  <ion-card class="cbox cbox-shadow">
    <div class="cbox-inner-four">
      <div class="cbox-row">
        <div class="cbox-name m-3">
          {{ user.name.nick }}
        </div>
      </div>
      <div class="cbox-row">
        <label class="cbox-health-label"> hp </label>
        <div class="cbox-health-value">
          <div class="cbox-health-thou cbox-digit">
            {{ hp.thou }}
          </div>
          <div class="cbox-health-hun cbox-digit">
            {{ hp.hun }}
          </div>
          <div class="cbox-health-ten cbox-digit">
            {{ hp.ten }}
          </div>
        </div>
      </div>
      <div class="cbox-row">
        <label class="cbox-health-label"> MP </label>
        <div class="cbox-health-value">
          <div class="cbox-health-thou cbox-digit">
            {{ mp.thou }}
          </div>
          <div class="cbox-health-hun cbox-digit">
            {{ mp.hun }}
          </div>
          <div class="cbox-health-ten cbox-digit">
            {{ mp.ten }}
          </div>
        </div>
      </div>
    </div>
  </ion-card>
</template>
<script lang="ts">
  import { defineComponent } from "vue";

  export default defineComponent({
    props: ["user"],
    name: "XpHpMpHud",
    computed: {
      hp() {
        const {
          hp: { now: hp },
        } = this.user.stats;
        const [thou, hun, ten] = String(hp).padStart(3, "0");

        return {
          thou: thou == "0" ? "" : thou,
          hun: hun == "0" ? "" : hun,
          ten,
          hp,
        };
      },
      mp() {
        const {
          mp: { now: mp },
        } = this.user.stats;
        const [thou, hun, ten] = String(mp).padStart(3, "0");

        return {
          thou: thou == "0" ? "" : thou,
          hun: hun == "0" ? "" : hun,
          ten,
          mp,
        };
      },
    },
  });
</script>
<style lang="scss">
  .cbox {
    max-width: 245px;
    height: 264px;
    // border: 4px solid #101010;
    border-radius: 4px;
    position: relative;
    display: inline-block;
    font-size: 55px;
    text-align: center;
    box-shadow: 0 0 0 8px #98a080, 0 0 0 16px #f0f0f0, 0 0 0 24px #98a080,
      0 0 0 27px #101010, 0 0 15px 25px #101010 !important;
  }

  /* The Frame */
  .cbox-inner-four {
    border-radius: 4px;
    border: 1px solid #101010;
    /* Thanks to Lea Verou's super helpful collection at: http://lea.verou.me/css3patterns/ */
    background-color: #9090e8;
    background-image: linear-gradient(
        45deg,
        #9080a8 25%,
        transparent 25%,
        transparent 75%,
        #9080a8 75%,
        #9080a8
      ),
      linear-gradient(
        45deg,
        #9080a8 25%,
        transparent 25%,
        transparent 75%,
        #9080a8 75%,
        #9080a8
      );
    background-size: 60px 60px;
    background-position: 0 0, 30px 30px;
  }

  /* The inside */
  .cbox-name {
    font-family: StatusPlz;
    font-size: 25px;
    // margin: 10px;
    font-weight: 600;
  }
  .cbox-row {
    color: #f0f0f0;
    display: flex;
    align-items: center;
  }
  .cbox-health-label {
    display: inline-block;
    // font-family: StatusPlz;
    font-family: "Fourside";
    font-size: 85%;
    -webkit-text-stroke: 1px #f0f0f0;
    // -webkit-text-fill-color: transparent;
    float: left;
    width: 100px;
    text-align: center;
    margin: 0 0.5rem;
    letter-spacing: -10px;

    // position: absolute;
    // top: 12px;
    // left: 10px;
  }
  .cbox-health-value {
    font-family: "Orange Kid";
    background: #101010;
    padding-bottom: 10px;
    width: 100%;
    height: 100%;

    display: flex;
    flex-direction: row;
  }
  .cbox-digit {
    width: 100%;
    // height: 67px;
    background: #ddd;
    background: radial-gradient(
      ellipse at 60% 45%,
      rgba(255, 255, 255, 1) 45%,
      rgba(155, 155, 155, 1) 80%
    );
    color: #000;

    border: 5px solid #000;
    text-align: center;
    line-height: 65px;
    font-size: 80px;
    font-weight: 600;
    padding: 3px 4px;
    &::before {
      border-left: 4px solid #ccc;
    }
  }

  .cbox-health-thou {
    // position: absolute;
    // left: 4px;
    // top: 4px;
    border-right-width: 2px;
  }
  .cbox-health-hun {
    // position: absolute;
    // left: 54px;
    // top: 4px;
    border-left-width: 4px;
    border-right-width: 2px;
  }
  .cbox-health-ten {
    // position: absolute;
    // left: 104px;
    // top: 4px;
    border-left-width: 4px;
    border-right-width: 2px;
  }
</style>
