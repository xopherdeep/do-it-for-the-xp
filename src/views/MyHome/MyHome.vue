<template>
  <ion-page :class="$options.name">
    <!-- <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button :router-link="`/my-portal/${userId}`" >
            <ion-icon :icon="arrowBack" slot="icon-only"/>
          </ion-button>
        </ion-buttons>
        <ion-title> 
        </ion-title>
      </ion-toolbar>
    </ion-header> -->
    <ion-fab vertical="center" horizontal="center">
      <ion-fab-button expand="block">
        <i class="fad fa-house-user fa-2x"></i>
      </ion-fab-button>
      <ion-fab-list side="end">
        <ion-fab-button>
          <i class="fad fa-hammer fa-2x"></i>
        </ion-fab-button>
        <ion-fab-button>
          <i class="fad fa-hat-chef fa-2x"></i>
        </ion-fab-button>
      </ion-fab-list>
      <!-- <ion-fab-list side="bottom">
        <ion-fab-button>
          <i class="fad fa-door-open fa-2x"></i>
        </ion-fab-button>
      </ion-fab-list> -->
      <ion-fab-list side="top">
        <ion-fab-button size="large">
          <i class="fad fa-garage fa-2x"></i>
        </ion-fab-button>
      </ion-fab-list>
      <ion-fab-list side="start">
        <ion-fab-button>
          <i class="fad fa-calendar fa-2x"></i>
        </ion-fab-button>
        <ion-fab-button>
          <i class="fad fa-bed fa-2x"></i>
        </ion-fab-button>
      </ion-fab-list>
    </ion-fab>

    <ion-content :fullscreen="true">
      <IonRouterOutlet />
      <!-- <ion-router-outlet></ion-router-outlet> -->
      <!-- <ion-grid>

        <ion-row>
          <ion-col offset-sm="5" offset-xl="6" size="12" size-sm="7" size-xl="6">
            <ion-card>
              <ion-buttons class="ion-float-right">
                <ion-button :router-link="`/my-portal/${user.id}/world-map`">
                  <i class="fad fa-door-open fa-2x"></i>
                </ion-button>
              </ion-buttons>
              <ion-buttons>
                <ion-grid>
                  <ion-row>
                    <ion-col>
                      <ion-button id="adventure-time" >
                        <i class="fad fa-watch-fitness fa-2x"></i>
                        &nbsp; Adventure Time
                      </ion-button>
                    </ion-col>
                    <ion-col size="">
                      <ion-button id="storage">
                        <i class="fad fa-treasure-chest fa-2x"></i>
                        &nbsp; Storage
                      </ion-button>
                    </ion-col>
                  </ion-row>
                  <ion-row>
                    <ion-col>
                      <ion-button id="cook">
                        <i class="fad fa-hat-chef fa-2x"></i>
                        &nbsp; Cook
                      </ion-button>
                    </ion-col>
                    <ion-col>
                      <ion-button id="rest">
                        <i class="fad fa-bed fa-2x"></i>
                        &nbsp; Rest
                      </ion-button>
                    </ion-col>
                  </ion-row>
                  <ion-row>
                    <ion-col>
                      <ion-button id="craft">
                        <i class="fad fa-tools fa-2x"></i>
                        &nbsp; Craft
                      </ion-button>
                    </ion-col>
                    <ion-col size="6"> 
                      <ion-button id="save-quit">
                        <i class="fad fa-save fa-2x"></i>
                        &nbsp; Save & Quit
                      </ion-button>

                    </ion-col>
                  </ion-row>
                  <ion-row>
                    <ion-col>
                    </ion-col>
                  </ion-row>
                </ion-grid>
              </ion-buttons>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid> -->
      <!-- <ion-modal
        trigger="adventure-time"
        :breakpoints="[0.9]"
        :initialBreakpoint="0.9"
      >
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              <i class="fad fa-clock fa-2x ion-float-right"></i>
              Adventure Time
            </ion-card-title>
          </ion-card-header>
        </ion-card>
      </ion-modal>
      <ion-modal trigger="rest" :breakpoints="[0.9]" :initialBreakpoint="0.9">
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              <i class="fad fa-bed fa-2x ion-float-right"></i>
              Rest
            </ion-card-title>
          </ion-card-header>
        </ion-card>
      </ion-modal>
      <ion-modal trigger="cook" :breakpoints="[0.9]" :initialBreakpoint="0.9">
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              <i class="fad fa-hat-chef fa-2x ion-float-right"></i>
              Cook
            </ion-card-title>
          </ion-card-header>
        </ion-card>
      </ion-modal>
      <ion-modal trigger="craft" :breakpoints="[0.9]" :initialBreakpoint="0.9">
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              <i class="fad fa-tools fa-2x ion-float-right"></i>
              Craft
            </ion-card-title>
          </ion-card-header>
        </ion-card>
      </ion-modal> -->
      <ion-modal
        trigger="world-map"
        :breakpoints="[0.9]"
        :initialBreakpoint="0.9"
      >
        <ion-card>
            <ion-card-title>
              World Map
            </ion-card-title>
            <i class="fad fa-globe fa-3x ion-float-right"></i>
          <ion-card-header>
          </ion-card-header>
        </ion-card>
      </ion-modal>
      <ion-modal
        trigger="save-quit"
        :breakpoints="[0.9]"
        :initialBreakpoint="0.9"
      >
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              <i class="fad fa-save fa-2x ion-float-right"></i>
              Save & Quit
            </ion-card-title>
            <ion-card-subtitle>
              Would you like to save current progress and quit for now?
            </ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <ion-grid>
              <ion-row>
                <ion-col>
                  <ion-button color="success" expand="block" @click="clickSave"> Yes. </ion-button>
                </ion-col>
                <ion-col>
                  <ion-button color="danger" expand="block" @click="closeModal">
                    No.
                  </ion-button>
                </ion-col>
              </ion-row>
            </ion-grid>
          </ion-card-content>
        </ion-card>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script src="./MyHome.js" />
<style lang="scss" src="./_MyHome.scss" scoped />
