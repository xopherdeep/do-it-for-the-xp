import { RouteRecordRaw } from "vue-router";

export const AbilityRoutes: RouteRecordRaw[] = [
  {
    path: "abilities",
    name: "xp-abilities",
    component: () =>
      import(
        "@/app/Admin/XpAbilities/XpAbilities.vue"
      ),
  },
  {
    path: "abilities/create-update/:id?",
    name: "xp-create-update-ability",
    component: () =>
      import(
        "@/app/Admin/XpAbilities/components/XpCreateUpdateAbility.vue"
      ),
    props: true,
  },
];

export default AbilityRoutes;
