import { RouteRecordRaw } from "vue-router";

export const BestiaryRoutes: RouteRecordRaw[] = [
  {
    path: "bestiary",
    name: "xp-bestiary",
    component: () =>
      import(
        "@/app/Admin/XpBestiary/XpBestiary.vue"
      ),
  },
  {
    path: "bestiary/select",
    name: "xp-bestiary-select",
    component: () =>
      import(
        "@/app/Admin/XpBestiary/XpBeastSelectionPage.vue"
      ),
  },
  {
    path: "bestiary/create-update/:id?",
    name: "xp-create-update-beast",
    component: () =>
      import(
        "@/app/Admin/XpBestiary/components/XpAddBeast.vue"
      ),
    props: true,
  },
];

export default BestiaryRoutes;
