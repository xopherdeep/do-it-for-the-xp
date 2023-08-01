const HometownRoutes = [
  // TOWN
  {
    path: '/shop/:merchant?/',
    name: 'shop',
    meta: {
      faIcon: 'store'
    },
    component: () => import ('@/views/AccessoryShop/AccessoryShop.vue'),
    props: true,
  },
  {
    path: '/bank',
    name: 'bank',
    meta: {
      faIcon: 'piggy-bank'
    },
    component: () => import ('@/views/GoldBank/GoldBank.vue'),
    props: true,
  },
  {
    path: '/hospital',
    name: 'hospital',
    component: () => import ('@/views/_jig_app/_jig_app.vue'),
  },
  {
    path: '/town-hall',
    name: 'town-hall',
    component: () => import ('@/views/_jig_app/_jig_app.vue'),
  },
  {
    path: '/temple',
    name: 'temple',
    component: () => import ('@/views/_jig_app/_jig_app.vue'),
  },
  {
    path: '/hotel',
    name: 'hotel',
    component: () => import ('@/views/_jig_app/_jig_app.vue'),
  },
  // END TOWN
]

export default HometownRoutes
