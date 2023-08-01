const HometownRoutes = [
  // TOWN
  {
    path: '/shop/:merchant?/',
    name: 'shop',
    meta: {
      faIcon: 'store'
    },
    component: () => import ('@/views/MyPortal/HomeTown/AccessoryShop/AccessoryShop.vue'),
    props: true,
  },
  {
    path: '/bank',
    name: 'bank',
    meta: {
      faIcon: 'piggy-bank'
    },
    component: () => import ('@/views/MyPortal/HomeTown/GoldBank/GoldBank.vue'),
    props: true,
  },
  {
    path: '/hospital',
    name: 'hospital',
    component: () => import ('@/views/MyDialogBox/[AppJig]/[AppJig].vue'),
  },
  {
    path: '/town-hall',
    name: 'town-hall',
    component: () => import ('@/views/MyDialogBox/[AppJig]/[AppJig].vue'),
  },
  {
    path: '/temple',
    name: 'temple',
    component: () => import ('@/views/MyDialogBox/[AppJig]/[AppJig].vue'),
  },
  {
    path: '/hotel',
    name: 'hotel',
    component: () => import ('@/views/MyDialogBox/[AppJig]/[AppJig].vue'),
  },
  // END TOWN
]

export default HometownRoutes
