const WorldMapRoutes = [
  {
    path: 'plains',
    name: 'world-plains',
    meta: {
      faIcon: 'tornado'
    },
    component: () => import ('@/views/WorldMap/Worlds/WorldPlains/WorldPlains.vue'),
  },
  {
    path: 'islands',
    name: 'world-islands',
    meta: {
      faIcon: 'island-tropical'
    },
    component: () => import ('@/views/WorldMap/Worlds/WorldIslands/WorldIslands.vue'),
  },
  {
    path: 'forest',
    name: 'world-forest',
    meta: {
      faIcon: 'trees'
    },
    component: () => import ('@/views/WorldMap/Worlds/WorldForest/WorldForest.vue'),
  },
  {
    path: 'swamps',
    name: 'world-swamps',
    meta: {
      faIcon: 'skull-crossbones'
    },
    component: () => import ('@/views/WorldMap/Worlds/WorldSwamps/WorldSwamps.vue'),
  },
  {
    path: 'mountains',
    name: 'world-mountains',
    meta: {
      faIcon: 'mountains'
    },
    component: () => import ('@/views/WorldMap/Worlds/WorldMountains/WorldMountains.vue'),
  },
  {
    path: 'sands',
    name: 'world-sands',
    meta: {
      faIcon: 'cactus'
    },
    component: () => import ('@/views/WorldMap/Worlds/WorldDesert/WorldDesert.vue'),
  },
  {
    path: 'world-ice',
    name: 'world-ice',
    meta: {
      faIcon: 'igloo'
    },
    component: () => import ('@/views/WorldMap/Worlds/WorldIce/WorldIce.vue'),
  },
  {
    path: 'the-moon',
    name: 'the-moon',
    meta: {
      faIcon: 'moon'
    },
    component: () => import ('@/views/WorldMap/Worlds/WorldMoon/WorldMoon.vue'),
  },
]

export default WorldMapRoutes
