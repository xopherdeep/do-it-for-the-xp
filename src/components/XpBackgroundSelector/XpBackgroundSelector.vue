<template>
  <div>
    <ion-button
      color="rpg"
      @click="openBgControlsModal"
      class="bg-selector-button"
    >
      <i 
        class="fad fa-image fa-2x"
      ></i>
    </ion-button>

    <!-- Background Controls Modal -->
    <ion-modal
      ref="bgControlsModal"
      :is-open="isBgControlsModalOpen"
      @didDismiss="isBgControlsModalOpen = false"
      :breakpoints="[0, 0.25, 0.5, 0.75, 1]"
      :initial-breakpoint="0.25"
    >
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            
            <ion-button @click="isBgControlsModalOpen = false" color="rpg">
              <ion-icon
                :icon="closeOutline"
                slot="icon-only"
              ></ion-icon>
            </ion-button>
          </ion-buttons>

          <ion-title>Background</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="navigatePrevious" color="rpg">
              <ion-icon
                :icon="chevronBackOutline"
                slot="icon-only"
              ></ion-icon>
            </ion-button>
            <ion-button @click="randomizeBackground"  color="rpg">
              <i class="fad fa-dice fa-lg"></i>
            </ion-button>
            <ion-button @click="navigateNext" color="rpg">
              <ion-icon
                :icon="chevronForwardOutline"
                slot="icon-only"
              ></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-list>
          <ion-grid class="ion-no-padding">
            <ion-row>

              <ion-col>


                <ion-item-divider>
                  <ion-label>Preset Combos</ion-label>
                </ion-item-divider>

                <ion-item>
                  <!-- <ion-label position="stacked">Quick Select Backgrounds</ion-label> -->
                  <ion-select
                    v-model="selectedSuggested"
                    @ionChange="applySuggestedBackground"
                    interface="popover"
                  >
                    <ion-select-option value="-1">Custom</ion-select-option>
                    <ion-select-option value="44,0">Abstract Art</ion-select-option>
                    <ion-select-option value="78,0">Arachnid!</ion-select-option>
                    <ion-select-option value="95,0">Arachnid!!!</ion-select-option>
                    <ion-select-option value="75,0">Attack Slug</ion-select-option>
                    <ion-select-option value="42,0">Annoying Reveler</ion-select-option>
                    <ion-select-option value="316,0">Armored Frog</ion-select-option>
                    <ion-select-option value="30,0">Armored Frog, Farm Zombie</ion-select-option>
                    <ion-select-option value="243,0">Atomic Power Robot, Starman</ion-select-option>
                    <ion-select-option value="287,0">Atomic Power Robot, Military Octobot</ion-select-option>
                    <ion-select-option value="35,0">Bad Buffalo, Desert Wolf</ion-select-option>
                    <ion-select-option value="54,0">Beautiful UFO</ion-select-option>
                    <ion-select-option value="58,0">Big Pile of Puke</ion-select-option>
                    <ion-select-option value="109,0">Bionic Kraken</ion-select-option>
                    <ion-select-option value="79,0">Black Antoid</ion-select-option>
                    <ion-select-option value="9,0">Black Antoid (2)</ion-select-option>
                    <ion-select-option value="81,0">Black Antoid, Attack Slug</ion-select-option>
                    <ion-select-option value="10,0">Black Antoid, Ramblin' Evil Mushroom</ion-select-option>
                    <ion-select-option value="80,0">Black Antoid, Rowdy Mouse</ion-select-option>
                    <ion-select-option value="293,292">Boogey Tent</ion-select-option>
                    <ion-select-option value="322,0">Care Free Bomb</ion-select-option>
                    <ion-select-option value="71,0">Care Free Bomb, Mr. Molecule</ion-select-option>
                    <ion-select-option value="166,165">Carbon Dog</ion-select-option>
                    <ion-select-option value="314,0">Cave Boy</ion-select-option>
                    <ion-select-option value="131,0">Cave Boy, Mighty Bear Seven</ion-select-option>
                    <ion-select-option value="65,0">Chomposaur</ion-select-option>
                    <ion-select-option value="285,0">Clumsy Robot</ion-select-option>
                    <ion-select-option value="306,307">Coil Snake</ion-select-option>
                    <ion-select-option value="103,0">Conducting Spirit</ion-select-option>
                    <ion-select-option value="145,0">Conducting Menace</ion-select-option>
                    <ion-select-option value="184,183">Cop</ion-select-option>
                    <ion-select-option value="14,0">Cranky Lady</ion-select-option>
                    <ion-select-option value="40,0">Crazed Sign</ion-select-option>
                    <ion-select-option value="48,0">Crazed Sign (2)</ion-select-option>
                    <ion-select-option value="36,0">Crested Booka, Bad Buffalo</ion-select-option>
                    <ion-select-option value="319,0">Crested Booka, Cute Li'l UFO, Smilin' Sphere</ion-select-option>
                    <ion-select-option value="266,267">Criminal Caterpillar</ion-select-option>
                    <ion-select-option value="155,0">Cute Li'l UFO</ion-select-option>
                    <ion-select-option value="158,0">Dali's Clock</ion-select-option>
                    <ion-select-option value="43,0">Dali's Clock (2)</ion-select-option>
                    <ion-select-option value="143,0">Deadly Mouse, Stinky Ghost</ion-select-option>
                    <ion-select-option value="59,0">Demonic Petunia</ion-select-option>
                    <ion-select-option value="197,0">Dept. Store Spook</ion-select-option>
                    <ion-select-option value="38,0">Desert Wolf</ion-select-option>
                    <ion-select-option value="56,0">Dread Skelpion, Great Crested Booka</ion-select-option>
                    <ion-select-option value="66,0">Ego Orb</ion-select-option>
                    <ion-select-option value="73,78">Elder Batty, Arachnid!</ion-select-option>
                    <ion-select-option value="164,163">Electro Specter</ion-select-option>
                    <ion-select-option value="268,0">Electro Swoosh</ion-select-option>
                    <ion-select-option value="162,0">Enraged Fire Plug</ion-select-option>
                    <ion-select-option value="189,0">Enraged Fire Plug (2)</ion-select-option>
                    <ion-select-option value="320,0">Enraged Fire Plug (3)</ion-select-option>
                    <ion-select-option value="62,0">Even Slimier Little Pile, Zap Eel</ion-select-option>
                    <ion-select-option value="273,272">Everdred</ion-select-option>
                    <ion-select-option value="104,0">Evil Elemental</ion-select-option>
                    <ion-select-option value="325,0">Evil Elemental, Psychic Psycho</ion-select-option>
                    <ion-select-option value="299,0">Evil Elemental, Soul Consuming Flame</ion-select-option>
                    <ion-select-option value="116,0">Evil Eye, Mechanical Octobot</ion-select-option>
                    <ion-select-option value="302,0">Evil Mani-Mani</ion-select-option>
                    <ion-select-option value="39,0">Extra Cranky Lady</ion-select-option>
                    <ion-select-option value="281,282">Farm Zombie</ion-select-option>
                    <ion-select-option value="140,0">Filthy Attack Roach</ion-select-option>
                    <ion-select-option value="141,0">Filthy Attack Roach (2)</ion-select-option>
                    <ion-select-option value="98,0">Fierce Shattered Man</ion-select-option>
                    <ion-select-option value="294,0">Fierce Shattered Man (2)</ion-select-option>
                    <ion-select-option value="96,0">Fierce Shattered Man, Arachnid!!!</ion-select-option>
                    <ion-select-option value="97,0">Fierce Shattered Man, Petrified Royal Guard</ion-select-option>
                    <ion-select-option value="300,0">Ghost of Starman, Final Starman</ion-select-option>
                    <ion-select-option value="301,0">Ghost of Starman, Final Starman, Nuclear Reactor
                      Robot</ion-select-option>
                    <ion-select-option value="114,0">Ghost of Starman, Evil Eye</ion-select-option>
                    <ion-select-option value="115,0">Ghost of Starman, Mechanical Octobot</ion-select-option>
                    <ion-select-option value="117,0">Ghost of Starman, Mechanical Octobot, Evil Eye</ion-select-option>
                    <ion-select-option value="107,0">Ghost of Starman, Nuclear Reactor Robot</ion-select-option>
                    <ion-select-option value="297,0">Ghost of Starman, Nuclear Reactor Robot (2)</ion-select-option>
                    <ion-select-option value="138,0">Gigantic Ant</ion-select-option>
                    <ion-select-option value="139,0">Gigantic Ant (2)</ion-select-option>
                    <ion-select-option value="224,223">Giygas</ion-select-option>
                    <ion-select-option value="225,0">Giygas (2)</ion-select-option>
                    <ion-select-option value="226,0">Giygas (3)</ion-select-option>
                    <ion-select-option value="227,0">Giygas (4)</ion-select-option>
                    <ion-select-option value="265,0">Giygas (5)</ion-select-option>
                    <ion-select-option value="220,0">Giygas, Heavily Armed Pokey</ion-select-option>
                    <ion-select-option value="222,221">Giygas, Heavily Armed Pokey (2)</ion-select-option>
                    <ion-select-option value="52,0">Great Crested Booka</ion-select-option>
                    <ion-select-option value="122,0">Gruff Goat</ion-select-option>
                    <ion-select-option value="127,0">Gruff Goat (2)</ion-select-option>
                    <ion-select-option value="196,0">Guardian Digger</ion-select-option>
                    <ion-select-option value="208,0">Guardian General</ion-select-option>
                    <ion-select-option value="25,0">Handsome Tom</ion-select-option>
                    <ion-select-option value="15,0">Handsome Tom, Smilin' Sam</ion-select-option>
                    <ion-select-option value="321,0">High-class UFO</ion-select-option>
                    <ion-select-option value="53,0">High-class UFO, Beautiful UFO</ion-select-option>
                    <ion-select-option value="57,0">Hostile Elder Oak</ion-select-option>
                    <ion-select-option value="102,0">Hyper Spinning Robo, Fobby</ion-select-option>
                    <ion-select-option value="310,0">Hyper Spinning Robo, Conducting Spirit</ion-select-option>
                    <ion-select-option value="16,0">Insane Cultist</ion-select-option>
                    <ion-select-option value="144,0">Kiss of Death</ion-select-option>
                    <ion-select-option value="201,200">Kraken</ion-select-option>
                    <ion-select-option value="99,0">Lethal Asp Hieroglyph</ion-select-option>
                    <ion-select-option value="161,0">Lesser Mook</ion-select-option>
                    <ion-select-option value="125,0">Lesser Mook, Whirling Robo</ion-select-option>
                    <ion-select-option value="315,0">Lesser Mook, Whirling Robo (2)</ion-select-option>
                    <ion-select-option value="313,0">Lesser Mook, Wooly Shambler</ion-select-option>
                    <ion-select-option value="20,0">Li'l UFO</ion-select-option>
                    <ion-select-option value="67,0">Loaded Dice</ion-select-option>
                    <ion-select-option value="323,0">Loaded Dice (2)</ion-select-option>
                    <ion-select-option value="33,0">Mad Duck</ion-select-option>
                    <ion-select-option value="213,212">Mad Duck (2)</ion-select-option>
                    <ion-select-option value="137,0">Mad Duck, Thirsty Coil Snake</ion-select-option>
                    <ion-select-option value="41,0">Mad Taxi</ion-select-option>
                    <ion-select-option value="83,0">Mad Taxi (2)</ion-select-option>
                    <ion-select-option value="203,202">Mad Taxi (3)</ion-select-option>
                    <ion-select-option value="63,0">Manly Fish, Hard Crocodile</ion-select-option>
                    <ion-select-option value="55,0">Marauder Octobot</ion-select-option>
                    <ion-select-option value="190,326">Master Criminal Worm</ion-select-option>
                    <ion-select-option value="194,193">Master Belch</ion-select-option>
                    <ion-select-option value="211,210">Master Barf</ion-select-option>
                    <ion-select-option value="76,0">Mighty Bear</ion-select-option>
                    <ion-select-option value="212,213">Mobile Sprout, Ramblin' Evil Mushroom</ion-select-option>
                    <ion-select-option value="11,0">Mobile Sprout, Territorial Oak</ion-select-option>
                    <ion-select-option value="21,0">Mobile Sprout, Li'l UFO</ion-select-option>
                    <ion-select-option value="82,0">Mole Playing Rough</ion-select-option>
                    <ion-select-option value="172,171">Mondo Mole</ion-select-option>
                    <ion-select-option value="151,0">Mook Senior</ion-select-option>
                    <ion-select-option value="160,0">Mook Senior (2)</ion-select-option>
                    <ion-select-option value="198,0">Mook Senior (3)</ion-select-option>
                    <ion-select-option value="324,0">Mook Senior (4)</ion-select-option>
                    <ion-select-option value="280,0">Mostly Bad Fly</ion-select-option>
                    <ion-select-option value="68,0">Mr. Molecule</ion-select-option>
                    <ion-select-option value="73,0">Mr Batty</ion-select-option>
                    <ion-select-option value="89,0">Mr. Batty (2)</ion-select-option>
                    <ion-select-option value="278,0">Mr. Carpainter</ion-select-option>
                    <ion-select-option value="85,0">Musica, Mystical Record</ion-select-option>
                    <ion-select-option value="86,0">Musica, Mystical Record (2)</ion-select-option>
                    <ion-select-option value="298,0">Ness's Nightmare</ion-select-option>
                    <ion-select-option value="28,0">No Good Fly, Putrid Moldyman</ion-select-option>
                    <ion-select-option value="110,0">Nuclear Reactor Robot, Final Starman</ion-select-option>
                    <ion-select-option value="49,0">Over Zealous Cop, Tough Guy</ion-select-option>
                    <ion-select-option value="61,0">Pit Bull Slug</ion-select-option>
                    <ion-select-option value="31,0">Plain Crocodile, Red Antoid</ion-select-option>
                    <ion-select-option value="178,177">Plague Rat of Doom</ion-select-option>
                    <ion-select-option value="7,0">Pogo Punk, Yes Man Junior</ion-select-option>
                    <ion-select-option value="303,0">Psychic Psycho</ion-select-option>
                    <ion-select-option value="105,0">Psychic Psycho, Major Psychic Psycho</ion-select-option>
                    <ion-select-option value="12,0">Ramblin' Evil Mushroom</ion-select-option>
                    <ion-select-option value="132,0">Ranboob</ion-select-option>
                    <ion-select-option value="135,0">Ranboob (2)</ion-select-option>
                    <ion-select-option value="317,0">Red Antoid, Black Antoid</ion-select-option>
                    <ion-select-option value="32,0">Red Antoid, Armored Frog, Farm Zombie</ion-select-option>
                    <ion-select-option value="157,0">Robo-pump</ion-select-option>
                    <ion-select-option value="45,258">Robo-pump, Enraged Fire Plug</ion-select-option>
                    <ion-select-option value="288,0">Robo-pump, Enraged Fire Plug (2)</ion-select-option>
                    <ion-select-option value="217,216">Rowdy Mouse</ion-select-option>
                    <ion-select-option value="72,0">Rowdy Mouse, Attack Slug</ion-select-option>
                    <ion-select-option value="1,0">Runaway Dog, Cop</ion-select-option>
                    <ion-select-option value="260,0">Runaway Dog</ion-select-option>
                    <ion-select-option value="84,0">Scalding Coffee Cup, Mystical Record</ion-select-option>
                    <ion-select-option value="87,0">Scalding Coffee Cup, Mystical Record (2)</ion-select-option>
                    <ion-select-option value="159,0">Scalding Coffee Cup, Mystical Record, Worthless
                      Protoplasm</ion-select-option>
                    <ion-select-option value="284,0">Sentry Robot</ion-select-option>
                    <ion-select-option value="195,0">Shattered Man</ion-select-option>
                    <ion-select-option value="168,167">Shrooom!</ion-select-option>
                    <ion-select-option value="192,191">Slimy Little Pile</ion-select-option>
                    <ion-select-option value="6,0">Skate Punk, Pogo Punk</ion-select-option>
                    <ion-select-option value="5,0">Skate Punk, Yes Man Junior</ion-select-option>
                    <ion-select-option value="8,0">Skate Punk, Yes Man Junior, Pogo Punk</ion-select-option>
                    <ion-select-option value="259,0">Skelpion, Cute Li'l UFO</ion-select-option>
                    <ion-select-option value="318,0">Skelpion, Smilin' Sphere</ion-select-option>
                    <ion-select-option value="106,0">Soul Consuming Flame</ion-select-option>
                    <ion-select-option value="22,0">Spinning Robo</ion-select-option>
                    <ion-select-option value="123,0">Spiteful Crow</ion-select-option>
                    <ion-select-option value="126,0">Spiteful Crow (2)</ion-select-option>
                    <ion-select-option value="262,0">Spiteful Crow (3)</ion-select-option>
                    <ion-select-option value="296,0">Squatter Demon</ion-select-option>
                    <ion-select-option value="271,0">Starman</ion-select-option>
                    <ion-select-option value="283,0">Starman (2)</ion-select-option>
                    <ion-select-option value="219,218">Starman Junior</ion-select-option>
                    <ion-select-option value="148,0">Starman, Starman Super</ion-select-option>
                    <ion-select-option value="199,0">Starman Deluxe</ion-select-option>
                    <ion-select-option value="286,0">Starman Super, Atomic Power Robot</ion-select-option>
                    <ion-select-option value="142,0">Stinky Ghost</ion-select-option>
                    <ion-select-option value="74,0">Strong Crocodile, Arachnid!</ion-select-option>
                    <ion-select-option value="134,0">Struttin' Evil Mushroom, Tough Mobile Sprout</ion-select-option>
                    <ion-select-option value="146,0">Tangoo</ion-select-option>
                    <ion-select-option value="305,0">Tangoo (2)</ion-select-option>
                    <ion-select-option value="304,0">Thunder Mite, Tangoo</ion-select-option>
                    <ion-select-option value="51,0">Thunder Mite</ion-select-option>
                    <ion-select-option value="176,175">Thunder and Storm</ion-select-option>
                    <ion-select-option value="136,0">Thirsty Coil Snake</ion-select-option>
                    <ion-select-option value="170,169">Titanic Ant, Black Antoid</ion-select-option>
                    <ion-select-option value="46,0">Tough Guy</ion-select-option>
                    <ion-select-option value="133,0">Tough Mobile Sprout, Ranboob</ion-select-option>
                    <ion-select-option value="174,173">Trillionage Sprout, Tough Mobile Sprout</ion-select-option>
                    <ion-select-option value="3,0">Trick or Trick Kid, Handsome Tom</ion-select-option>
                    <ion-select-option value="209,0">Ultimate Octobot, Nuclear Reactor Robot</ion-select-option>
                    <ion-select-option value="269,270">Unassuming Local Guy</ion-select-option>
                    <ion-select-option value="307,306">Unassuming Local Guy (2)</ion-select-option>
                    <ion-select-option value="100,0">Uncontrollable Sphere, Fobby</ion-select-option>
                    <ion-select-option value="309,0">Uncontrollable Sphere, Conducting Spirit</ion-select-option>
                    <ion-select-option value="311,0">Uncontrollable Sphere</ion-select-option>
                    <ion-select-option value="27,0">Urban Zombie</ion-select-option>
                    <ion-select-option value="153,0">Urban Zombie, Zombie Dog</ion-select-option>
                    <ion-select-option value="186,185">Violent Roach</ion-select-option>
                    <ion-select-option value="34,0">Violent Roach (2)</ion-select-option>
                    <ion-select-option value="64,0">Wetnosaur</ion-select-option>
                    <ion-select-option value="111,0">Wild 'n Wooly Shambler, Ultimate Octobot</ion-select-option>
                    <ion-select-option value="130,0">Wooly Shambler, Whirling Robo</ion-select-option>
                    <ion-select-option value="156,0">Worthless Protoplasm</ion-select-option>
                    <ion-select-option value="215,214">Worthless Protoplasm (2)</ion-select-option>
                    <ion-select-option value="60,0">Zap Eel, Hard Crocodile</ion-select-option>
                    <ion-select-option value="152,0">Zombie Possessor</ion-select-option>
                    <ion-select-option value="26,0">Zombie Possessor, Urban Zombie</ion-select-option>
                    <ion-select-option value="29,0">Zombie Dog</ion-select-option>
                    <ion-select-option value="154,0">Zombie Dog, No Good Fly</ion-select-option>
                  </ion-select>
                </ion-item>
              </ion-col>
              <ion-col>
                <ion-item-divider>
                  <ion-label>Aspect Ratio</ion-label>
                </ion-item-divider>

                <ion-item>
                  <ion-select
                    v-model="selectedAspectRatio"
                    @ionChange="applyAspectRatio"
                  >
                    <ion-select-option value="0">Full (8:7)</ion-select-option>
                    <ion-select-option value="16">Wide Letterbox (4:3)</ion-select-option>
                    <ion-select-option
                      value="48"
                      selected
                    >Medium Letterbox (2:1)</ion-select-option>
                    <ion-select-option value="64">Narrow Letterbox (8:3)</ion-select-option>
                  </ion-select>
                </ion-item>
              </ion-col>
            </ion-row>
          </ion-grid>




          <ion-item-divider>
            <ion-label>Custom Background Values Layer 1: {{ customBg1 }} - Layer 2: {{ customBg2 }}</ion-label>
          </ion-item-divider>

          <ion-item>
            <!-- <ion-label>Layer 1: {{ customBg1 }}</ion-label> -->
            <ion-range
              min="0"
              max="327"
              step="1"
              v-model="customBg1"
              @ionChange="applyCustomBackground"
              snaps
            >
            </ion-range>
          </ion-item>

          <ion-item>
            <!-- <ion-label position="stacked">Background Layer 2: {{ customBg2 }}</ion-label> -->
            <ion-range
              min="0"
              max="327"
              step="1"
              v-model="customBg2"
              @ionChange="applyCustomBackground"
              snaps
            >
            </ion-range>
          </ion-item>

          <!-- User Custom Presets -->
          <ion-item-divider>
            <ion-label>Your Saved Presets</ion-label>
          </ion-item-divider>
          
          <ion-item v-if="customPresets.length === 0">
            <ion-label class="ion-text-wrap">
              No custom presets yet. Use the "Save As Preset" button to save your favorite backgrounds.
            </ion-label>
          </ion-item>
          
          <ion-item v-else>
            <ion-select
              v-model="selectedCustomPreset"
              @ionChange="applyCustomPreset"
              interface="popover"
              placeholder="Select a saved preset"
            >
              <ion-select-option 
                v-for="(preset, index) in customPresets" 
                :key="index" 
                :value="index"
              >
                {{ preset.name }}
              </ion-select-option>
            </ion-select>
            
            <ion-button 
              slot="end" 
              color="danger" 
              fill="clear" 
              @click="promptDeletePreset" 
              v-if="selectedCustomPreset !== null"
            >
              <ion-icon :icon="trashOutline" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-item>
        </ion-list>
      </ion-content>
      <ion-footer>
        <ion-toolbar>
          <ion-buttons slot="end">
            <ion-button @click="applyCustomBackground">
              Apply Custom Background
            </ion-button>
            <ion-button
              color="tertiary"
              @click="saveAsPreset"
            >
              Save As Preset
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-footer>
    </ion-modal>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch, PropType } from 'vue';
import { toastController, alertController } from '@ionic/vue';
import { closeOutline, imageOutline, chevronBackOutline, chevronForwardOutline, trashOutline } from 'ionicons/icons';
import ionic from "@/mixins/ionic";
import debug from '@/lib/utils/debug';

// Define interface for background presets
interface BackgroundPreset {
  id: string;
  name: string;
  bg1: number;
  bg2: number;
  aspectRatio?: number;
}

// Define interface for the component that uses background
interface BackgroundInstance {
  bg1: number;
  bg2: number;
  aspectRatio?: number;
  enterBattle?: () => void;
}

export default defineComponent({
  name: 'XpBackgroundSelector',
  mixins: [ionic],
  props: {
    initialBg1: {
      type: Number,
      default: 0
    },
    initialBg2: {
      type: Number,
      default: 0
    },
    aspectRatio: {
      type: Number,
      default: 48 // Medium letterbox by default
    },
    targetRef: {
      type: Object as PropType<BackgroundInstance | null>,
      default: null
    }
  },
  emits: ['update:bg1', 'update:bg2', 'update:aspectRatio', 'background-changed'],
  setup(props, { emit }) {
    const bgControlsModal = ref(null);
    const isBgControlsModalOpen = ref(false);
    const selectedBackground = ref(0);
    const customBg1 = ref(props.initialBg1);
    const customBg2 = ref(props.initialBg2);
    const selectedSuggested = ref('-1');
    const selectedAspectRatio = ref(props.aspectRatio.toString());
    const customPresets = ref<BackgroundPreset[]>([]);
    const selectedCustomPreset = ref<number | null>(null);

    // Storage key for custom presets
    const STORAGE_KEY = 'xp-custom-bg-presets';

    // Load saved custom presets from localStorage
    const loadCustomPresets = () => {
      try {
        const savedPresets = localStorage.getItem(STORAGE_KEY);
        if (savedPresets) {
          customPresets.value = JSON.parse(savedPresets);
        }
      } catch (e) {
        debug.error('Failed to load custom background presets:', e);
      }
    };

    // Save custom presets to localStorage
    const saveCustomPresets = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(customPresets.value));
      } catch (e) {
        debug.error('Failed to save custom background presets:', e);
      }
    };

    // Generate a unique ID for presets
    const generateId = () => {
      return Date.now().toString(36) + Math.random().toString(36).substring(2);
    };

    // Apply a custom preset
    const applyCustomPreset = () => {
      if (selectedCustomPreset.value !== null && customPresets.value[selectedCustomPreset.value]) {
        const preset = customPresets.value[selectedCustomPreset.value];
        
        // Update custom values with preset values
        customBg1.value = preset.bg1;
        customBg2.value = preset.bg2;
        
        if (preset.aspectRatio) {
          selectedAspectRatio.value = preset.aspectRatio.toString();
        }
        
        // Apply changes to target
        if (props.targetRef) {
          emit('update:bg1', preset.bg1);
          emit('update:bg2', preset.bg2);
          
          if (preset.aspectRatio) {
            emit('update:aspectRatio', preset.aspectRatio);
          }
          
          // Call the enterBattle function if it exists
          if (props.targetRef.enterBattle) {
            props.targetRef.enterBattle();
          }
        }
        
        // Emit background-changed event
        emit('background-changed', { 
          bg1: preset.bg1, 
          bg2: preset.bg2, 
          aspectRatio: preset.aspectRatio || parseInt(selectedAspectRatio.value, 10) 
        });
        
        // Show a confirmation toast
        toastController.create({
          message: `Applied "${preset.name}" background preset`,
          duration: 2000,
          position: 'top',
          color: 'success'
        }).then(toast => toast.present());
      }
    };

    // Delete a custom preset after confirmation
    const promptDeletePreset = async () => {
      if (selectedCustomPreset.value === null) return;
      
      const preset = customPresets.value[selectedCustomPreset.value];
      
      const alert = await alertController.create({
        header: 'Delete Background Preset',
        message: `Are you sure you want to delete the preset "${preset.name}"?`,
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: 'Delete',
            role: 'destructive',
            handler: () => {
              deleteSelectedPreset();
            }
          }
        ]
      });
      
      await alert.present();
    };
    
    // Delete the selected preset
    const deleteSelectedPreset = () => {
      if (selectedCustomPreset.value !== null) {
        const deletedName = customPresets.value[selectedCustomPreset.value].name;
        
        // Remove the preset
        customPresets.value.splice(selectedCustomPreset.value, 1);
        
        // Save the updated list
        saveCustomPresets();
        
        // Reset selection
        selectedCustomPreset.value = null;
        
        // Show a confirmation toast
        toastController.create({
          message: `Deleted "${deletedName}" background preset`,
          duration: 2000,
          position: 'top',
          color: 'success'
        }).then(toast => toast.present());
      }
    };

    // Sample background options
    const backgrounds = [
      { name: 'Forest', bg1: 0, bg2: 0 },
      { name: 'Cave', bg1: 1, bg2: 1 },
      { name: 'Mountain', bg1: 2, bg2: 2 },
      { name: 'Desert', bg1: 3, bg2: 0 },
      { name: 'Castle', bg1: 4, bg2: 1 },
      { name: 'Black Antoid', bg1: 79, bg2: 0 },
      { name: 'Starman Junior', bg1: 219, bg2: 218 },
      { name: 'Giygas', bg1: 224, bg2: 223 }
    ];

    // Open background controls modal
    const openBgControlsModal = () => {
      if (props.targetRef) {
        customBg1.value = props.targetRef.bg1;
        customBg2.value = props.targetRef.bg2;
        
        // Check if current values match any of the suggested backgrounds
        const currentValues = `${props.targetRef.bg1},${props.targetRef.bg2}`;
        selectedSuggested.value = '-1'; // Default to custom
        
        // Look through select options to see if we match a suggested bg
        const options = document.querySelectorAll('ion-select-option');
        for (const option of options) {
          if (option.value === currentValues) {
            selectedSuggested.value = currentValues;
            break;
          }
        }
      }
      isBgControlsModalOpen.value = true;
    };

    // Change background of the component
    const changeBackground = () => {
      const bg = backgrounds[selectedBackground.value];
      if (props.targetRef) {
        // Instead of mutating props directly, emit events
        emit('update:bg1', bg.bg1);
        emit('update:bg2', bg.bg2);
        
        // Update custom values to match selected preset
        customBg1.value = bg.bg1;
        customBg2.value = bg.bg2;
        
        // Call the enterBattle function if it exists
        if (props.targetRef.enterBattle) {
          props.targetRef.enterBattle();
        }
        
        emit('background-changed', { bg1: bg.bg1, bg2: bg.bg2 });
      }
    };

    // Apply suggested background combination
    const applySuggestedBackground = () => {
      if (selectedSuggested.value !== '-1') {
        const [bg1, bg2] = selectedSuggested.value.split(',').map(Number);
        customBg1.value = bg1;
        customBg2.value = bg2;
        
        if (props.targetRef) {
          // Instead of mutating props directly, emit events
          emit('update:bg1', bg1);
          emit('update:bg2', bg2);
          
          // Call the enterBattle function if it exists
          if (props.targetRef.enterBattle) {
            props.targetRef.enterBattle();
          }
        }
        
        emit('background-changed', { bg1, bg2 });
        
        // Show a toast with the selected background name
        const selectedOption = document.querySelector(`ion-select-option[value="${selectedSuggested.value}"]`);
        if (selectedOption) {
          const backgroundName = selectedOption.textContent || 'Background';
          toastController.create({
            message: `Applied ${backgroundName}`,
            duration: 2000,
            position: 'top',
            color: 'success'
          }).then(toast => toast.present());
        }
      }
    };

    // Randomize background layers when dice button is clicked
    const randomizeBackground = () => {
      // Generate random values for bg1 and bg2 within valid range (0-327)
      const randomBg1 = Math.floor(Math.random() * 328);
      const randomBg2 = Math.floor(Math.random() * 328);
      
      // Update custom values with random values
      customBg1.value = randomBg1;
      customBg2.value = randomBg2;
      
      if (props.targetRef) {
        // Emit events to update the background
        emit('update:bg1', randomBg1);
        emit('update:bg2', randomBg2);
        
        // Call the enterBattle function if it exists
        if (props.targetRef.enterBattle) {
          props.targetRef.enterBattle();
        }
      }
      
      // Emit background-changed event
      emit('background-changed', { bg1: randomBg1, bg2: randomBg2 });
      
      // Set selected suggested to custom since we're using random values
      selectedSuggested.value = '-1';
      
      // Show a toast with the random values
      toastController.create({
        message: `Random background applied! (${randomBg1}, ${randomBg2})`,
        duration: 2000,
        position: 'top',
        color: 'success'
      }).then(toast => toast.present());
    };

    // Apply custom background combination
    const applyCustomBackground = () => {
      if (props.targetRef) {
        // Instead of mutating props directly, emit events
        emit('update:bg1', customBg1.value);
        emit('update:bg2', customBg2.value);
        
        // Call the enterBattle function if it exists
        if (props.targetRef.enterBattle) {
          props.targetRef.enterBattle();
        }
      }
      
      emit('background-changed', { bg1: customBg1.value, bg2: customBg2.value });
      
      // Set selected suggested to custom since we're using custom values
      selectedSuggested.value = '-1';
    };

    // Apply aspect ratio change
    const applyAspectRatio = () => {
      const ratio = parseInt(selectedAspectRatio.value, 10);
      
      if (props.targetRef) {
        // Instead of mutating props directly, emit events
        emit('update:aspectRatio', ratio);
        
        // Call the enterBattle function if it exists
        if (props.targetRef.enterBattle) {
          props.targetRef.enterBattle();
        }
      }
      
      emit('background-changed', { 
        bg1: customBg1.value, 
        bg2: customBg2.value, 
        aspectRatio: ratio 
      });
    };

    // Navigate to previous preset background
    const navigatePrevious = () => {
      // Get all the available background options
      const options = Array.from(document.querySelectorAll('ion-select ion-select-option'));
      if (options.length === 0) return;
      
      // Find index of current selection
      const currentIndex = options.findIndex(option => (option as HTMLSelectElement).value === selectedSuggested.value);
      let newIndex = currentIndex - 1;
      
      // Wrap around to the end if at the beginning
      if (newIndex < 0) newIndex = options.length - 1;
      
      // Set the new selected value
      selectedSuggested.value = (options[newIndex] as HTMLSelectElement).value as string;
      
      // Apply the change
      applySuggestedBackground();
    };

    // Navigate to next preset background
    const navigateNext = () => {
      // Get all the available background options
      const options = Array.from(document.querySelectorAll('ion-select ion-select-option'));
      if (options.length === 0) return;
      
      // Find index of current selection
      const currentIndex = options.findIndex(option => (option as HTMLSelectElement).value === selectedSuggested.value);
      let newIndex = currentIndex + 1;
      
      // Wrap around to the beginning if at the end
      if (newIndex >= options.length) newIndex = 0;
      
      // Set the new selected value
      selectedSuggested.value = (options[newIndex] as HTMLSelectElement).value as string;
      
      // Apply the change
      applySuggestedBackground();
    };

    // Save current custom values as a new preset
    const saveAsPreset = async () => {
      // Create input dialog for preset name
      const alert = await alertController.create({
        header: 'Save Background Preset',
        inputs: [
          {
            name: 'name',
            type: 'text',
            placeholder: `Background (${customBg1.value}/${customBg2.value})`,
            value: `Background (${customBg1.value}/${customBg2.value})`
          }
        ],
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: 'Save',
            handler: (data) => {
              const presetName = data.name || `Background (${customBg1.value}/${customBg2.value})`;
              
              // Create new preset object
              const newPreset: BackgroundPreset = {
                id: generateId(),
                name: presetName,
                bg1: customBg1.value,
                bg2: customBg2.value,
                aspectRatio: parseInt(selectedAspectRatio.value, 10)
              };
              
              // Add to custom presets array
              customPresets.value.push(newPreset);
              
              // Save to localStorage
              saveCustomPresets();
              
              // Set selection to the new preset
              selectedCustomPreset.value = customPresets.value.length - 1;
              
              // Show confirmation toast
              toastController.create({
                message: `Background preset "${presetName}" saved!`,
                duration: 2000,
                position: 'top',
                color: 'success'
              }).then(toast => toast.present());
            }
          }
        ]
      });
      
      await alert.present();
    };

    // Watch for props changes to update internal state
    watch(() => props.initialBg1, (newVal) => {
      customBg1.value = newVal;
    });

    watch(() => props.initialBg2, (newVal) => {
      customBg2.value = newVal;
    });

    onMounted(() => {
      // Initialize with props values
      customBg1.value = props.initialBg1;
      customBg2.value = props.initialBg2;

      // Load custom presets from localStorage
      loadCustomPresets();
    });

    return {
      bgControlsModal,
      isBgControlsModalOpen,
      openBgControlsModal,
      selectedBackground,
      backgrounds,
      changeBackground,
      customBg1,
      customBg2,
      selectedSuggested,
      applySuggestedBackground,
      applyCustomBackground,
      saveAsPreset,
      selectedAspectRatio,
      applyAspectRatio,
      navigatePrevious,
      navigateNext,
      randomizeBackground,
      
      // Custom presets functionality
      customPresets,
      selectedCustomPreset,
      applyCustomPreset,
      promptDeletePreset,
      
      // Icons
      closeOutline,
      imageOutline,
      chevronBackOutline,
      chevronForwardOutline,
      trashOutline
    };
  }
});
</script>

<style scoped>
.bg-selector-button {
  --padding-start: 10px;
  --padding-end: 10px;
}
</style>