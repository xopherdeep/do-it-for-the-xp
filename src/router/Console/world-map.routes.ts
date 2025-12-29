import { RouteRecordRaw } from 'vue-router';

const WorldMapRoutes: Array<RouteRecordRaw> = [
  {
    path: 'plains',
    name: 'world-plains',
    meta: {
      faIcon: 'tornado'
    },
    component: () => import ('@/app/Console/WorldMap/WorldPlains/WorldPlains.vue'),
  },
  {
    path: 'islands',
    name: 'world-islands',
    meta: {
      faIcon: 'island-tropical'
    },
    component: () => import ('@/app/Console/WorldMap/WorldIslands/WorldIslands.vue'),
  },
  {
    path: 'forest',
    name: 'world-forest',
    meta: {
      faIcon: 'trees'
    },
    component: () => import ('@/app/Console/WorldMap/WorldForest/WorldForest.vue'),
  },
  {
    path: 'swamps',
    name: 'world-swamps',
    meta: {
      faIcon: 'skull-crossbones'
    },
    component: () => import ('@/app/Console/WorldMap/WorldSwamps/WorldSwamps.vue'),
  },
  {
    path: 'mountains',
    name: 'world-mountains',
    meta: {
      faIcon: 'mountains'
    },
    component: () => import ('@/app/Console/WorldMap/WorldMountains/WorldMountains.vue'),
  },
  {
    path: 'sands',
    name: 'world-sands',
    meta: {
      faIcon: 'cactus'
    },
    component: () => import ('@/app/Console/WorldMap/WorldDesert/WorldDesert.vue'),
  },
  {
    path: 'clouds',
    name: 'world-clouds',
    meta: {
      faIcon: 'bolt'
    },
    component: () => import ('@/app/Console/WorldMap/WorldClouds/WorldClouds.vue'),
  },
  {
    path: 'world-ice',
    name: 'world-ice',
    meta: {
      faIcon: 'igloo'
    },
    component: () => import ('@/app/Console/WorldMap/WorldIce/WorldIce.vue'),
  },
  {
    path: 'the-moon',
    name: 'the-moon',
    meta: {
      faIcon: 'moon'
    },
    component: () => import ('@/app/Console/WorldMap/WorldMoon/WorldMoon.vue'),
  },
]

export default WorldMapRoutes
