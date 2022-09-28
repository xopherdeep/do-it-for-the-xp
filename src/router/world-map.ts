const WorldMapRoutes = [
  {
    path: 'plains',
    name: 'world-plains',
    meta: {
      faIcon: 'tornado'
    },
    component: () => import ('@/views/WorldView/WorldPlains/WorldPlains.vue'),
  },
  {
    path: 'islands',
    name: 'world-islands',
    meta: {
      faIcon: 'island-tropical'
    },
    component: () => import ('@/views/WorldView/WorldIslands/WorldIslands.vue'),
  },
  {
    path: 'forest',
    name: 'world-forest',
    meta: {
      faIcon: 'trees'
    },
    component: () => import ('@/views/WorldView/WorldForest/WorldForest.vue'),
  },
  {
    path: 'swamps',
    name: 'world-swamps',
    meta: {
      faIcon: 'skull-crossbones'
    },
    component: () => import ('@/views/WorldView/WorldSwamps/WorldSwamps.vue'),
  },
  {
    path: 'mountains',
    name: 'world-mountains',
    meta: {
      faIcon: 'mountains'
    },
    component: () => import ('@/views/WorldView/WorldMountains/WorldMountains.vue'),
  },
  {
    path: 'sands',
    name: 'world-sands',
    meta: {
      faIcon: 'cactus'
    },
    component: () => import ('@/views/WorldView/WorldDesert/WorldDesert.vue'),
  },
  {
    path: 'world-ice',
    name: 'world-ice',
    meta: {
      faIcon: 'igloo'
    },
    component: () => import ('@/views/WorldView/WorldIce/WorldIce.vue'),
  },
  {
    path: 'the-moon',
    name: 'the-moon',
    meta: {
      faIcon: 'moon'
    },
    component: () => import ('@/views/WorldView/WorldMoon/WorldMoon.vue'),
  },
]

export default WorldMapRoutes
