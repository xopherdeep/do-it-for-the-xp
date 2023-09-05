const HometownRoutes = [
  // TOWN
  {
    path: '/shop/:merchant?/:userId?',
    name: 'shop',
    meta: {
      faIcon: 'store'
    },
    component: () => import('@/views/MyPortal/HomeTown/AccessoryShop/AccessoryShop.vue'),
    props: true,
  },
  {
    path: '/bank/:userId?/',
    name: 'bank',
    meta: {
      faIcon: 'piggy-bank'
    },
    component: () => import('@/views/MyPortal/HomeTown/GoldBank/GoldBank.vue'),
    props: true,
  },
  {
    path: '/hospital/:userId?/',
    name: 'hospital',
    component: () => import('@/views/MyPortal/HomeTown/HospitalHub/HospitalHub.vue'),
    props: true,
  },
  {
    path: '/town-hall/:userId?/',
    name: 'town-hall',
    component: () => import('@/views/MyDialogBox/[AppJig]/[AppJig].vue'),
    props: true,
  },
  {
    path: '/temple',
    name: 'temple',
    component: () => import('@/views/MyDialogBox/[AppJig]/[AppJig].vue'),
    props: true,
  },
  {
    path: '/hotel/:userId?/',
    name: 'hotel',
    component: () => import('@/views/MyPortal/HomeTown/HotelHub/HotelHub.vue'),
    props: true,
  },
  // END TOWN
]

export default HometownRoutes
