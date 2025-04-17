import { RouteRecordRaw } from 'vue-router';

const WorldMapRoutes: Array<RouteRecordRaw> = [
  {
    path: 'plains',
    name: 'world-plains',
    meta: {
      faIcon: 'tornado'
    },
    component: () => import ('@/views/Console/MyPortal/WorldMap/WorldPlains/WorldPlains.vue'),
  },
  {
    path: 'islands',
    name: 'world-islands',
    meta: {
      faIcon: 'island-tropical'
    },
    component: () => import ('@/views/Console/MyPortal/WorldMap/WorldIslands/WorldIslands.vue'),
  },
  {
    path: 'forest',
    name: 'world-forest',
    meta: {
      faIcon: 'trees'
    },
    component: () => import ('@/views/Console/MyPortal/WorldMap/WorldForest/WorldForest.vue'),
  },
  {
    path: 'swamps',
    name: 'world-swamps',
    meta: {
      faIcon: 'skull-crossbones'
    },
    component: () => import ('@/views/Console/MyPortal/WorldMap/WorldSwamps/WorldSwamps.vue'),
  },
  {
    path: 'mountains',
    name: 'world-mountains',
    meta: {
      faIcon: 'mountains'
    },
    component: () => import ('@/views/Console/MyPortal/WorldMap/WorldMountains/WorldMountains.vue'),
  },
  {
    path: 'sands',
    name: 'world-sands',
    meta: {
      faIcon: 'cactus'
    },
    component: () => import ('@/views/Console/MyPortal/WorldMap/WorldDesert/WorldDesert.vue'),
  },
  {
    path: 'world-ice',
    name: 'world-ice',
    meta: {
      faIcon: 'igloo'
    },
    component: () => import ('@/views/Console/MyPortal/WorldMap/WorldIce/WorldIce.vue'),
  },
  {
    path: 'the-moon',
    name: 'the-moon',
    meta: {
      faIcon: 'moon'
    },
    component: () => import ('@/views/Console/MyPortal/WorldMap/WorldMoon/WorldMoon.vue'),
  },
]

export default WorldMapRoutes
