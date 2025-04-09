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
      desc: "5HP | View and manage all your active quests and daily tasks.",
      click() {
        router.push({ name: "my-tasks", params: { userId } });
      },
    },
    {
      faIcon: "book-spells",
      name: "Book Of Spells",
      desc: "Access your magical abilities and learn new spells as you level up.",
      click() {
        router.push({ name: "my-abilities", params: { userId } });
      },
    },
    {
      faIcon: "backpack",
      name: "Goods",
      desc: "View all items you've collected on your journey. Organize and equip them here.",
      click() {
        router.push({ name: "my-inventory", params: { userId } });
      },
    },
    {
      faIcon: "wallet",
      name: "Wallet",
      desc: "Check your Gold Points balance and transaction history.",
      click() {
        router.push({ name: "my-gold-points", params: { userId } });
      },
    },
    {
      faIcon: "flame",
      name: "Sol's Flare",
      desc: "100MP | Unleash the power of the sun! All tasks take 100HP damage, making them easier to complete.",
      mpCost: 100
    },
    {
      faIcon: "bolt",
      name: "Tesla's Bolt",
      desc: "100MP | Channel lightning energy for 1hr, allowing instant task completion. Takes 2hr to recharge.",
      mpCost: 100,
      rechargeTime: "2hr"
    },
    {
      faIcon: "wave-sine",
      name: "Gaia's Quake",
      desc: "100MP | Shake up your task list! Randomly reorders all tasks for a fresh perspective. Takes 24hr to recharge.",
      mpCost: 100,
      rechargeTime: "24hr"
    },
    {
      faIcon: "flux-capacitor",
      name: "Chronos' Clock",
      desc: "100MP | Manipulate time itself! Pause all task timers for 1hr, giving you extra time to complete them.",
      mpCost: 100
    },
    {
      faIcon: "moon-stars",
      name: "Night's Light",
      desc: "100MP | Harness lunar energy to remove bedtime restrictions for one night. Takes 3 days to recharge.",
      mpCost: 100,
      rechargeTime: "3 days"
    },
    {
      faIcon: "wind",
      name: "Gale's Wind",
      desc: "300MP | Summon a powerful wind that blows away all chore tasks for 24 hours. Takes 7 days to recharge.",
      mpCost: 300,
      rechargeTime: "7 days"
    },
    {
      faIcon: "shield-virus",
      name: "Yve's Shield",
      desc: "300MP | Create a magical barrier that protects against all negative effects for 24 hours. Takes 2 days to recharge.",
      mpCost: 300,
      rechargeTime: "2 days"
    },
    {
      faIcon: "hat-wizard",
      name: "X's Invisibility",
      desc: "300MP | Don the cloak of invisibility to avoid random task encounters for 24 hours. Takes 2 days to recharge.",
      mpCost: 300,
      rechargeTime: "2 days"
    },
    {
      faIcon: "wand-magic fire",
      name: "Fire Wand",
      desc: "50MP | Channel fire magic to burn away small obstacles. Reduces the time needed for quick tasks by 50%.",
      mpCost: 50
    },
    {
      faIcon: "wand-magic ice",
      name: "Ice Wand",
      desc: "50MP | Freeze distractions in their tracks, allowing better focus. Extends task deadlines by 24 hours.",
      mpCost: 50
    },
    {
      faIcon: "staff fire",
      name: "Flame Staff",
      desc: "75MP | A powerful staff that amplifies fire magic. Reduces the difficulty of challenging tasks by 30%.",
      mpCost: 75
    },
    {
      faIcon: "bow-arrow",
      name: "Silver Arrow",
      desc: "25MP | A precise magical arrow that instantly removes one task from your battle queue.",
      mpCost: 25
    },
    {
      faIcon: "expand-alt",
      name: "Hook Shot",
      desc: "15MP | Quickly grab distant objectives and bring them into focus. Moves a future task to your current day.",
      mpCost: 15
    },
    {
      faIcon: "bomb",
      name: "Bombs",
      desc: "40MP | Blast through tough obstacles! Breaks down one large task into three smaller, manageable pieces.",
      mpCost: 40
    },
    {
      faIcon: "hammer-war",
      name: "Thor's Hammer",
      desc: "60MP | A mighty hammer that smashes through the toughest challenges. Completes 50% of any single task.",
      mpCost: 60
    },
    {
      faIcon: "flashlight",
      name: "Lantern",
      desc: "5MP | Illuminate dark areas to reveal hidden tasks. Shows all forgotten or overdue responsibilities.",
      mpCost: 5
    },
    {
      faIcon: "flask-potion",
      name: "Bottles",
      desc: "Store and access your potions and ethers. Health potions restore 50HP, while ethers restore 30MP each.",
    },
    {
      name: "Portal Home",
      faIcon: "portal-enter",
      desc: "10MP | Open a magical portal to instantly return home from anywhere. Takes 15min to recharge.",
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
