import { useRouter, useRoute } from "vue-router";
import { useGameStore } from "@/lib/store/stores/game";
import { describeItem, itemRule } from "@/lib/services/items/ItemRules";

export interface EquipmentItem {
  faIcon: string;
  name: string;
  desc: string;
  hand?: string;
  mpCost?: number;
  rechargeTime?: string;
  click?: () => void;
  isPegasusItem?: boolean;  // Marks items unlocked via Pegasus liberation
}

/** A tool's catalogue entry: its text and MP come from the rules table (ItemRules) by name, never typed twice. */
const tool = (faIcon: string, name: string): EquipmentItem => ({
  faIcon,
  name,
  desc: describeItem(name) ?? "",
  mpCost: itemRule(name)?.mp,
});

export function useEquipmentItems(callbacks?: { onOpenPegasusModal?: () => void }) {
  const router = useRouter();
  const route = useRoute();
  const gameStore = useGameStore();
  const { userId } = route.params;

  const specialItems: EquipmentItem[] = [
    // =============================================
    // PEGASUS ITEMS (Liberation Rewards)
    // =============================================
    {
      faIcon: "boot",
      name: "Pegasus Boots",
      desc: "Magical boots gifted by Aura. Toggle between Retro and Modern Area Menu styles!",
      isPegasusItem: true,
      click() {
        const newStyle = gameStore.fabStyle === 'retro' ? 'modern' : 'retro';
        gameStore.setFabStyle(newStyle);
      }
    },
    {
      faIcon: "whistle",
      name: "Wind Whistle",
      desc: "A mystical whistle gifted by Ventus. Summon the Sacred Pegasi for fast travel!",
      isPegasusItem: true,
      click() {
        callbacks?.onOpenPegasusModal?.();
      }
    },
    // =============================================
    // CORE ITEMS
    // =============================================
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
    tool("bow-arrow", "Silver Arrow"),
    tool("expand-alt", "Hook Shot"),
    tool("bomb", "Bombs"),
    tool("hammer-war", "Thor's Hammer"),
    tool("flashlight", "Lantern"),

    tool("flame", "Sol's Flare"),
    tool("bolt", "Tesla's Bolt"),
    tool("wave-sine", "Gaia's Quake"),
    tool("flux-capacitor", "Chronos' Clock"),
    tool("moon-stars", "Night's Light"),
    tool("wind", "Gale's Wind"),
    // {
    //   faIcon: "shield-virus",
    //   name: "Yve's Shield",
    //   desc: "300MP | Create a magical barrier that protects against all negative effects for 24 hours. Takes 2 days to recharge.",
    //   mpCost: 300,
    //   rechargeTime: "2 days"
    // },
    tool("hat-wizard", "X's Invisibility"),
    tool("wand-magic fire", "Fire Wand"),
    tool("wand-magic ice", "Ice Wand"),
    // {
    //   faIcon: "staff fire",
    //   name: "Flame Staff",
    //   desc: "75MP | A powerful staff that amplifies fire magic. Reduces the difficulty of challenging tasks by 30%.",
    //   mpCost: 75
    // },
    tool("flask-potion", "Bottles"),
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
