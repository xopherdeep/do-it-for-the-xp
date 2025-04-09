import { useRouter, useRoute } from "vue-router";

export interface EquipmentItem {
  faIcon: string;
  name: string;
  desc: string;
  hand?: string;
  mpCost?: number;
  rechargeTime?: string;
  click?: () => void;
}

export function useEquipmentItems() {
  const router = useRouter();
  const route = useRoute();
  const { userId } = route.params;

  const specialItems: EquipmentItem[] = [
    {
      faIcon: "staff quest",
      name: "My Quests",
      desc: "5HP | Open My Quests...",
      click() {
        router.push({ name: "my-tasks", params: { userId } });
      },
    },
    {
      faIcon: "book-spells",
      name: "Book Of Spells",
      desc: "It does stuff...",
      click() {
        router.push({ name: "my-abilities", params: { userId } });
      },
    },
    {
      faIcon: "backpack",
      name: "Goods",
      desc: "Open currently held inventory.",
      click() {
        router.push({ name: "my-inventory", params: { userId } });
      },
    },
    {
      faIcon: "wallet",
      name: "Wallet",
      desc: "Open wallet to see GP earnings",
      click() {
        router.push({ name: "my-gold-points", params: { userId } });
      },
    },
    {
      faIcon: "flame",
      name: "Sol's Flare",
      desc: "100MP | Set everything ablaze! All tasks take 100HP damage.",
      mpCost: 100
    },
    {
      faIcon: "bolt",
      name: "Tesla's Bolt",
      desc: "100MP | Move like lightning for 1hr and take your turns instantly. Takes 2hr to recharge.",
      mpCost: 100,
      rechargeTime: "2hr"
    },
    {
      faIcon: "wave-sine",
      name: "Gaia's Quake",
      desc: "100MP | Shuffle all tasks. Takes 24 Hour to recharge.",
      mpCost: 100,
      rechargeTime: "24hr"
    },
    {
      faIcon: "flux-capacitor",
      name: "Chronos' Clock",
      desc: "100MP | Pause time for 1hr... (wouldn't that make infinity?)",
      mpCost: 100
    },
    {
      faIcon: "moon-stars",
      name: "Night's Light",
      desc: "100MP | Removes any bedtime curfew for the night. Takes 3 days to recharge",
      mpCost: 100,
      rechargeTime: "3 days"
    },
    {
      faIcon: "wind",
      name: "Gale's Wind",
      desc: "300MP | Blow off all chores for the next 24 hours. Takes 7days to recharge.",
      mpCost: 300,
      rechargeTime: "7 days"
    },
    {
      faIcon: "shield-virus",
      name: "Yve's Shield",
      desc: "300MP | Protects against all attacks for the next 24 hours. Takes 2days to recharge.",
      mpCost: 300,
      rechargeTime: "2 days"
    },
    {
      faIcon: "hat-wizard",
      name: "X's Invisibility",
      desc: "300MP | Avoid random encounters for the next 24 hours. Takes 2 days to recharge.",
      mpCost: 300,
      rechargeTime: "2 days"
    },
    {
      faIcon: "wand-magic fire",
      name: "Fire Wand",
      desc: "It does stuff...",
    },
    {
      faIcon: "wand-magic ice",
      name: "Ice Wand",
      desc: "It does stuff...",
    },
    {
      faIcon: "staff fire",
      name: "",
      desc: "It does stuff...",
    },
    {
      faIcon: "bow-arrow",
      name: "Silver Arrow",
      desc: "25MP | Immediately removes task from battle",
      mpCost: 25
    },
    {
      faIcon: "expand-alt",
      name: "Hook Shot",
      desc: "It does stuff...",
    },
    {
      faIcon: "bomb",
      name: "Bombs",
      desc: "It does stuff...",
    },
    {
      faIcon: "hammer-war",
      name: "Thor's Hammer",
      desc: "It does stuff...",
    },
    {
      faIcon: "flashlight",
      name: "Lantern",
      desc: "It does stuff...",
    },
    {
      faIcon: "flask-potion",
      name: "Bottles",
      desc: "Quick access to your potions and ethers",
    },
    {
      name: "Portal Home",
      faIcon: "portal-enter",
      desc: "10MP | Open portal to go directly home. Takes 15min to recharge.",
      mpCost: 10,
      rechargeTime: "15min",
      click() {
        router.push({ name: "my-home", params: { userId } });
      },
    },
  ];

  return {
    specialItems
  };
}
