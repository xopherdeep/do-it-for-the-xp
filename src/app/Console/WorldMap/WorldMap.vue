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

    <ion-content :fullscreen="true">
      <div class="world-map-plaza" ref="plazaRef">
        <xp-draggable-spot
          v-for="node in stageNodes"
          :key="node.stageId"
          screen="world-map"
          :spot-id="node.stageId"
          :default-x="node.defaultX"
          :default-y="node.defaultY"
        >
          <xp-stage-model
            :stage-id="node.stageId"
            :size="100"
            :interactive="false"
            :navigate-on-click="false"
            @click="handleStageTravel(node.stageId)"
          />
        </xp-draggable-spot>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./WorldMap.ts" />
<style lang="scss" src="./_WorldMap.scss" scoped />
