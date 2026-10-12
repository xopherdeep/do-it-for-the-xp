<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="danger">
        <ion-buttons slot="start">
          <xp-back-button>
          </xp-back-button>
          <i class="fad fa-backpack fa-lg" />
        </ion-buttons>
        <ion-title>
          My Goods
        </ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment
          @ionChange="segmentChanged($event)"
          color="danger"
          scrollable
          :value="tab"
        >
          <ion-segment-button
            v-for="t in tabs"
            :key="t.value"
            :value="t.value"
          >
            <ion-icon
              :icon="tabIcons[t.value]"
              :color="t.color"
            ></ion-icon>
            {{ t.label }}
            <ion-badge
              v-if="counts[t.value]"
              class="tab-count"
              color="dark"
            >{{ counts[t.value] }}</ion-badge>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="my-goods">
      <ion-list
        v-if="shown.length"
        class="goods-list"
        lines="none"
      >
        <ion-item
          v-for="entry in shown"
          :key="entry.id"
          class="goods-row"
          :data-kind="entry.kind"
        >
          <span
            slot="start"
            class="goods-icon icon-colors"
          >
            <i :class="iconClass(entry)" />
          </span>
          <ion-label>
            <h2 class="goods-name">{{ entry.name }}</h2>
            <p
              v-if="entry.description"
              class="goods-blurb"
            >{{ entry.description }}</p>
          </ion-label>
          <ion-badge
            slot="end"
            class="goods-qty"
            color="dark"
          >&times;{{ entry.qty }}</ion-badge>
        </ion-item>
      </ion-list>

      <div
        v-else
        class="goods-empty"
      >
        <i class="fad fa-backpack fa-3x" />
        <p>{{ emptyLine }}</p>
      </div>
    </ion-content>

    <ion-footer>
      <ion-toolbar color="danger">
        <ion-grid>
          <ion-row>
            <ion-col>
              <ion-button
                color="dark"
                :router-link="`/my-portal/${userId}`"
                expand="block"
              >
                <ion-icon
                  :icon="chevronBack"
                  slot="icon-only"
                />
              </ion-button>
            </ion-col>
            <ion-col>
              <ion-button
                color="dark"
                :router-link="`/my-portal/${userId}`"
                expand="block"
              >
                <ion-icon
                  :icon="chevronForward"
                  slot="icon-only"
                />
              </ion-button>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script lang="ts" src="./MyInventory.ts" />
<style lang="scss" src="./_MyInventory.scss" scoped />
