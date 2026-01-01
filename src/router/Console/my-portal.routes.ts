import WorldMapRoutes from './world-map.routes';
import { useUserStore } from '@/lib/store/stores/user';

const MyPortalRoutes = [{
  path: '/my-portal/:userId',
  name: 'my-portal',
  component: () => import('@/app/Console/MyPortal/MyPortal.vue'),
  props: true,
  beforeEnter: async (to, from, next) => {
    const userStore = useUserStore();
    const userId = to.params.userId as string;

    // Check if user is already loaded
    if (userStore.getUserById(userId)) {
      next();
      return;
    }

    // Try to load users if not found (e.g. hard refresh)
    await userStore.loadUsers();

    if (userStore.getUserById(userId)) {
      next();
    } else {
      // If still not found, redirect to profile selection
      next({ name: 'xp-profile' });
    }
  },
  children: [{
    path: "",
    name: "my-home-redirect",
    redirect: (to) => ({
      name: "my-home",
      params: { userId: to.params.userId },
    }),
  },
  {
    path: "my-home",
    name: "my-home",
    meta: {
      faIcon: "house-user",
    },
    component: () => import("@/app/Console/MyPortal/MyHome/MyHome.vue"),
    children: [],
  },
  {
    path: "my-party",
    meta: {
      faIcon: "fort-awesome",
      hideUserFab: true,
    },
    component: () => import("@/app/Console/MyPortal/MyParty.vue"),
  },
  {
    path: "home-town",
    name: "home-town",
    meta: {
      faIcon: "archway",
    },
    component: () => import("@/app/Console/MyPortal/HomeTown/HomeTown.vue"),
  },
  {
    path: "world-map",
    name: "world-map",
    meta: {
      faIcon: "pegasus",
    },
    component: () => import("@/app/Console/WorldMap/WorldMap.vue"),
  },
  {
    path: 'my-profile',
    name: 'my-profile',
    meta: {
      faIcon: "user-circle",
      hideUserFab: true,
    },
    component: () => import('@/app/Console/MyPortal/UserProfile/UserProfile.vue'),
    props: true
  },
  ...WorldMapRoutes
  ],
}];

export default MyPortalRoutes;
