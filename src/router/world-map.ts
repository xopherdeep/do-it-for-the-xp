const WorldMapRoutes = [
  {
    path: 'plains',
    name: 'plains',
    meta: {
      faIcon: 'tornado'
    },
    component: () => import ('@/views/WorldView/WorldPlains/WorldPlains.vue'),
  },
  {
    path: 'islands',
    name: 'islands',
    meta: {
      faIcon: 'island-tropical'
    },
    component: () => import ('@/views/WorldView/WorldIslands/WorldIslands.vue'),
  },
  {
    path: 'forest',
    name: 'forest',
    meta: {
      faIcon: 'trees'
    },
    component: () => import ('@/views/WorldView/WorldForest/WorldForest.vue'),
  },
  {
    path: 'swamps',
    name: 'swamps',
    meta: {
      faIcon: 'skull-crossbones'
    },
    component: () => import ('@/views/WorldView/WorldSwamps/WorldSwamps.vue'),
  },
  {
    path: 'mountain',
    name: 'mountain',
    meta: {
      faIcon: 'mountains'
    },
    component: () => import ('@/views/WorldView/WorldMountains/WorldMountains.vue'),
  },
  {
    path: 'desert',
    name: 'desert',
    meta: {
      faIcon: 'cactus'
    },
    component: () => import ('@/views/WorldView/WorldDesert/WorldDesert.vue'),
  },
  {
    path: 'frozen-tundra',
    name: 'frozen-tundra',
    meta: {
      faIcon: 'igloo'
    },
    component: () => import ('@/views/WorldView/WorldIce/WorldIce.vue'),
  },
  {
    path: 'the-moon',
    name: 'the-moon',
    meta: {
      faIcon: 'rocket'
    },
    component: () => import ('@/views/WorldView/WorldMoon/WorldMoon.vue'),
  },
]

export default WorldMapRoutes
