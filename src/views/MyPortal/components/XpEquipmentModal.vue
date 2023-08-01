<template>
  <ion-modal
    trigger="toolbox"
    class="fullscreen"
    :class="$options.name"
    :is-open="isOpen"
    :breakpoints="[1]"
    :initialBreakpoint="1"
    :fullscreen="true"
    @ionModalDidDismiss="didDismiss"
  >
    <ion-header>
      <ion-buttons class="ion-no-padding toolbar ">
        <ion-button class="ion-float-right" size="large" @click="close">
          <i class="fad fa-times fa-2x"></i>
        </ion-button>
      </ion-buttons>
    </ion-header>
    <ion-content class="icon-colors">
      <ion-grid>
        <ion-row>
          <ion-col size="7">
            <ion-card class="equipment mb-4">
              <ion-card-title> Equipment </ion-card-title>
              <ion-card-content class="ion-no-padding h-100 ">
                <ion-buttons class="grid-container">

                <ion-button
                  @mouseover="displayInfo(item)"
                  v-for="item in specialItems"
                  :key="item.faIcon"
                  @click="equipItem(item)"
                  expand="block"
                  size="lg"
                  class="grid-item h-100"
                  draggable="true"
                  @dragstart="drag($event, item)"
                >
                  <i
                    class="ion-float-left fad fa-4x"
                    :class="`fa-${item.faIcon} fad fa-4x`"
                    :style="item.style || {}"
                  ></i>
                </ion-button>
                </ion-buttons>
              </ion-card-content>
            </ion-card>

            <ion-card class="status">
              <ion-card-title> Status </ion-card-title>
              <ion-card-content class="content">
                <i class="fad fa-3x fa-dice-d4"></i>
                <i class="fad fa-3x fa-dice-d6"></i>
                <i class="fad fa-3x fa-dice-d8"></i>
                <i class="fad fa-3x fa-dice-d10"></i>
                <i class="fad fa-3x fa-dice-d12"></i>
                <i class="fad fa-3x fa-dice-d20"></i>
              </ion-card-content>
            </ion-card>
          </ion-col>
          <ion-col size="5">
            <ion-card class="info mb-4 ion-flex">
              <ion-card-title v-if="info"> {{ info.name }} </ion-card-title>
              <i
                class="fad fa-7x"
                :class="`fa-${info.faIcon}`"
                :style="info.style || {}"
              ></i>
              {{ info.desc }}
              <ion-grid>
                <ion-row>
                  <ion-col size="6">
                    <ion-button
                      expand="block"
                      color="dark"
                    >
                      Use 
                    </ion-button>
                  </ion-col>
                  <ion-col size="6">
                    <ion-button
                      expand="block"
                      color="dark"
                      @click="clickAction(info)"
                    >
                      Equip
                    </ion-button>
                  </ion-col>
                </ion-row>
              </ion-grid>
            </ion-card>

            <ion-card class="equipped mb-4 ion-flex">
              <ion-card-title> Equipped </ion-card-title>
              <ion-row>
                <ion-col>
                  <i
                    v-for="item in equipment"
                    :key="item.faIcon"
                    :class="`fa-${item.faIcon}`"
                    class="fad fa-4x ion-padding"
                    draggable="true"
                    @dragstart="drag($event, item)"
                  ></i>
                </ion-col>
              </ion-row>

              <ion-row class="hands">
                <!-- <ion-col>
                  <ion-row class="dropzone">
                    <ion-col v-for="(item, index) in leftHand" :key="index" @drop="drop($event, 'left', index)" @dragOver="allowDrop">
                      <i 
                        v-if="item"
                        :class="`fa-${item.faIcon}`" 
                        class="fad fa-4x ion-padding"
                        draggable="true"
                        @dragstart="drag($event, item)"
                      ></i>
                    </ion-col>
                    <ion-col v-for="(item, index) in rightHand" :key="index" @drop="drop($event, 'right', index)" @dragOver="allowDrop">
                      <i 
                        v-if="item"
                        :class="`fa-${item.faIcon}`" 
                        class="fad fa-4x ion-padding"
                        draggable="true"
                        @dragstart="drag($event, item)"
                      ></i>
                    </ion-col>
                  </ion-row>
                </ion-col> -->
                <ion-col>
                  <ion-row class="dropzone">
                    <ion-col @drop="drop($event, 'left')" @dragover="allowDrop" >
                      <i
                        v-for="item in equipmentOnLeft"
                        :key="item.faIcon"
                        :class="`fa-${item.faIcon}`"
                        class="fad fa-4x ion-padding"

                        draggable="true"
                        @dragstart="drag($event, item)"
                      ></i>
                    </ion-col>
                    <ion-col @drop="drop($event, 'left')" @dragover="allowDrop">
                    </ion-col>
                    <ion-col @drop="drop($event, 'left')" @dragover="allowDrop">
                    </ion-col>
                  </ion-row>
                </ion-col>
                <ion-col>
                  <ion-row class="dropzone">
                    <ion-col @drop="drop($event, 'right')" @dragover="allowDrop" >
                      <i
                        v-for="item in equipmentOnRight"
                        :key="item.faIcon"
                        :class="`fa-${item.faIcon}`"
                        class="fad fa-4x ion-padding"
                        draggable="true"
                        @dragstart="drag($event, item)"
                      ></i>
                    </ion-col>
                    <ion-col @drop="drop($event, 'right')" @dragover="allowDrop">
                    </ion-col>
                    <ion-col @drop="drop($event, 'right')" @dragover="allowDrop">
                    </ion-col>

                  </ion-row>
                </ion-col>
              </ion-row>
            </ion-card>
            <ion-card class="todays-achievements">
              <ion-card-title> Achievements </ion-card-title>
              <ion-button @click="changeBG" size="" expand="block">
                <i class="fad fa-ankh fa-2x"></i>
              </ion-button>
              <i class="fad fa-diamond fa-lg"></i>
              <i class="fad fa-diamond fa-lg"></i>
              <i class="fad fa-diamond fa-lg"></i>
              <i class="fad fa-diamond fa-lg"></i>
              <i class="fad fa-diamond fa-lg"></i>
              <i class="fad fa-diamond fa-lg"></i>
              <i class="fad fa-diamond fa-lg"></i>
              <!-- <i class="fad fa-ankh fa-lg"></i>
              <i class="fad fa-ankh fa-lg"></i>
              <i class="fad fa-ankh fa-lg"></i> -->
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
    <ion-toolbar class="rpg-box"> </ion-toolbar>
  </ion-modal>
</template>

<script lang="ts">
  import { defineComponent, ref } from "vue"
  import { useRoute, useRouter } from "vue-router";
  import ionic from "@/mixins/ionic";

  export default defineComponent({
    name: 'xp-equipment-modal',
    props: ['isOpen', 'equipment'],
    mixins: [ionic],
    data() {
      return {
        info: {
          name: "Choose item...",
          faIcon: "question",
          desc: "Hover/Touch an item to learn more.",
          leftHand: Array(3).fill({
            faIcon: "question",
          }) as any,
          rightHand: Array(3).fill({}) as any,
        },
      }
    },
    computed: {
      equipmentOnLeft() {
        return this.equipment.filter((item, index) => item.hand === 'left');
      },
      equipmentOnRigt(){
        return this.equipment.filter((item, index) => item.hand === 'right');
      },
    },
    methods: {
      drag(event, item) {
          // Store the item data in the event
          event.dataTransfer.setData('item', JSON.stringify(item));
      },
      allowDrop(event) {
          // Prevent the default behavior to allow a drop
          event.preventDefault();
      },
      drop(event, hand, index) {
          // Prevent the default behavior
          event.preventDefault();
          
          // Get the item data from the event
          const data = event.dataTransfer.getData('item');
          const item = JSON.parse(data);
          
          this.$emit('equip', item,  hand);

          this.setHand(item, hand, index);

          // Add the item to the appropriate slot in your data
      },
      setHand(item, hand, index){
        if (hand === 'left') {
            // this.leftHand.push(item);
        } else {
            // this.rightHand[index] = item;
        }
      },
      displayInfo(item) {
        this.info = item;
      },

      changeBG() {
        //remove
      },

      didDismiss(){
        this.$emit('didDismiss')
      },

      close(){
        this.$emit('close')
      },

      equipItem(item){
        this.$emit('equip', item)
      }
    },
    setup() {
      const router = useRouter()
      const route = useRoute()
      const { userId } = route.params;
      const clickAction = (action) => action.click() || null;
      
      return {
        clickAction,
        userId,
        specialItems: [
          {
            faIcon: "staff quest",
            name: "My Quests",
            desc: "5HP | Open My Quests...",
            click(){
              router.push({name: 'my-tasks', params: {userId}})
            }
          },
          {
            faIcon: "book-spells",
            name: "Book Of Spells",
            desc: "It does stuff...",
            click(){
              router.push({name: 'my-abilities', params: {userId}})
            }
          },
          {
            faIcon: "backpack",
            name: "Goods",
            desc: "Open currently held inventory.",
            click(){
              router.push({name: 'my-inventory', params: {userId}})
            }
          },

          {
            faIcon: "wallet",
            name: "Wallet",
            desc: "Open wallet to see GP earnings",
            click(){
              router.push({name: 'my-gold-points', params: {userId}})
            }
          },
          {
            faIcon: "flame",
            name: "Sol's Flare",
            desc: "100MP | Set everything ablaze! All tasks take 100HP damage.",
          },
          {
            faIcon: "bolt",
            name: "Tesla's Bolt",
            desc: "100MP | Move like lightning for 1hr and take your turns instantly. Takes 2hr to recharge. ",
          },
          {
            faIcon: "wave-sine",
            name: "Gaia's Quake",
            desc: "100MP | Shuffle all tasks. Takes 24 Hour to recharge.",
          },
          {
            faIcon: "flux-capacitor",
            name: "Chronos' Clock",
            desc: "100MP | Pause time for 1hr... (wouldn't that make infinity?)",
          },
          {
            faIcon: "moon-stars",
            name: "Night's Light",
            desc: "100MP | Removes any bedtime curfew for the night. Takes 3 days to recharge",
          },
          // {
          //   faIcon: 'waveform',
          //   name: 'Satori\'s Vibe',
          //   desc: 'It does stuff...'
          // },
          {
            faIcon: "wind",
            name: "Gale's Wind",
            desc: "300MP | Blow off all chores for the next 24 hours. Takes 7days to recharge.",
          },
          {
            faIcon: "shield-virus",
            name: "Yve's Shield",
            desc: "300MP | Protects against all attacks for the next 24 hours. Takes 2days to recharge.",
          },
          {
            faIcon: "hat-wizard",
            name: "X's Invisibility",
            desc: "300MP | Avoid random encounters for the next 24 hours. Takes 2 days to recharge.",
          },
          {
            faIcon: "wand-magic fire",
            name: "Fire Wand",
            desc: "It does stuff...",
          },
          {
            faIcon: "wand-magic ice",
            name: "Ice Wand",
            desc: "It does stuff...",
          },
          {
            faIcon: "staff fire",
            name: "",
            desc: "It does stuff...",
          },
          {
            faIcon: "bow-arrow",
            name: "Silver Arrow",
            desc: "25MP | Immediately removes task from battle",
          },
          {
            faIcon: "expand-alt",
            name: "Hook Shot",
            desc: "It does stuff...",
          },
          {
            faIcon: "bomb",
            name: "Bombs",
            desc: "It does stuff...",
          },
          {
            faIcon: "hammer-war",
            name: "Thor's Hammer",
            desc: "It does stuff...",
          },
          {
            faIcon: "flashlight",
            name: "Lantern",
            desc: "It does stuff...",
          },
          {
            faIcon: "flask-potion",
            name: "Bottles",
            desc: "Quick access to your potions and ethers",
          },
          {
            name: "Portal Home",
            faIcon: "portal-enter",
            desc: "10MP | Open portal to go directly home. Takes 15min to recharge.",
            click($ev){
              router.push({name: 'my-home', params: {userId}})
            }
          },
        ],
      }
    },
  })
</script>

<style lang="scss" scoped>
  .xp-equipment-modal {
    background: transparent;
    .toolbar{
      height: 5vh;
    }
    ion-content {

      background: transparent;
      .h-100 {
        height: 100%;
      }
      .mb-4{
        margin-bottom: 4vh !important;
      }
      &.bg-transparent{
        background: transparent !important;
      }

      .equipment{
        height: calc(100vh - 25vh - 5vh - 5em);
        // margin: 2em !important;

        .grid-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(10vw, 1fr)); /* Adjust the '100px' to match your desired square size */
          grid-gap: .5em; /* Adjust gap between squares */
          margin: .5em;
          height: calc(100% - 1em);
        }

        .grid-item {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
          width: 100%;
          border-radius: 100px !important;
          i {
            font-size: calc(6vh) !important; 
          }
        }

      }

      .status{ 
        height: 20vh;
      }

      .info {
        height: 15vh;
        i {
          // float: right;
          margin: 0 0.15em 0.15em;
        }
        
      }

      .equipped {
        height: 25vh;
        display: flex;

        .hands {
          // background: yellow;
          height: 100%;
          max-height: 45%;
          ion-row{
            gap: .5em;
            height: 100%;
            &.dropzone {
                // border: 2px dashed #ccc;
                // min-height: 100px;
                padding: 10px;
            }

            ion-col{
              border: 1px dashed #ccc;
              border-radius: 10px;
              height: 100%;
            }
          }


          .draggable-item {
            margin: 10px;
          }
        }

        ion-button {
          width: 100%;
          height: 10vh;
          font-size: inherit;

          i {
            margin: 2px 1px 0 2px;
          }
        }

      }

      .todays-achievements {

        ion-button {
          width: 100%;
        }

        padding: 1em 0 !important;
        // height: 40vh !important;
        height: calc(100vh - 50vh - 20vh - 5em) !important;

        text-align: center;

        i {
          width: calc((100% / 7) - 5px);
        }
      }


    }
  }
</style>

@/mixins/ionic@/mixins/ionic