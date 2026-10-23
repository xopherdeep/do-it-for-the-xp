<template>
  <div class="drops-config config-box">
    <div class="config-label">Drops</div>
    <p class="drops-hint">What the beast leaves behind when it falls.</p>

    <!-- Dungeon item: None first, then the temple's own four -->
    <div class="sub-label">Dungeon item</div>
    <div class="item-grid items-3" role="group" aria-label="Dungeon item dropped">
      <button type="button" class="item-option mini" :class="{ active: !heldDungeonItem }"
        :aria-pressed="!heldDungeonItem" @click="pickDungeonItem('')">
        <i class="fad fa-ban"></i>
        <span>None</span>
      </button>
      <button v-for="item in dungeonItems" :key="item.id" type="button" class="item-option mini"
        :class="{ active: isDungeonItemHeld(item.id) }" :aria-pressed="isDungeonItemHeld(item.id)"
        @click="pickDungeonItem(item.id)">
        <i :class="['fad', item.icon]"></i>
        <span>{{ item.label }}</span>
      </button>
    </div>

    <!-- Consumables, the Bomb among them: any number can be ticked -->
    <div class="sub-label mt-15">Items</div>
    <div class="item-grid items-3" role="group" aria-label="Items dropped">
      <button v-for="item in consumableItems" :key="item.id" type="button" class="item-option mini"
        :class="{ active: heldItems.includes(item.id) }" :aria-pressed="heldItems.includes(item.id)"
        @click="toggleItem(item.id)">
        <i :class="['fad', item.icon]"></i>
        <span>{{ item.label }}</span>
      </button>
    </div>

    <!-- Gold -->
    <label class="gold-field mt-15">
      <span class="sub-label">Gold</span>
      <input type="number" inputmode="numeric" min="0" :max="MAX_GOLD" step="1" placeholder="0"
        aria-label="Gold dropped" :value="heldGold || ''" @input="typeGold" @change="showHeldGold" />
      <span class="gold-unit">GP</span>
    </label>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue';
  import type { RoomDrops } from '@/lib/engine/core/dungeons/types';
  import { dungeonItemId } from '@/lib/services/temples/ChestLoot';
  import { CONSUMABLE_ITEMS, DUNGEON_ITEMS } from '../hooks';

  /**
   * The Drops picker of a fight room (monster, mini-boss, boss; a classic room or a quest room alike): what the beast
   * leaves behind once it is beaten. It reads the same four fields a chest does (`chest`, `dungeon`, `items`, `gold`),
   * so a drop can hold a Dungeon Item (a key, the Boss Key, the map, the compass), any of the consumables (the Bomb
   * that blows a cracked wall among them) and some gold, all at once. It keeps no state: it takes the room's drop and
   * emits the drop it should hold next, or null when nothing is left (a drop of nothing is no drop at all).
   */
  const props = defineProps<{
    /** The room's `content.drops`, or null when the beast drops nothing */
    drops: RoomDrops | null;
  }>();

  const emit = defineEmits<{
    (event: 'update:drops', drops: RoomDrops | null): void;
  }>();

  /** The most gold a drop holds, as much as the loot chest's slider allows */
  const MAX_GOLD = 500;

  /** What a drop holds, flattened: the dungeon item as stored ('' for none), the item rows and the gold (0 for none) */
  interface HeldDrop {
    dungeon: string;
    items: string[];
    gold: number;
  }

  const dungeonItems = DUNGEON_ITEMS;
  const consumableItems = CONSUMABLE_ITEMS;

  /** The dungeon item the drop holds, as stored; the engine reads one only under `chest: 'dungeon'` */
  const storedDungeonItem = computed((): string => {
    const drops = props.drops;
    const isDungeonItemDrop = drops?.chest === 'dungeon' && typeof drops.dungeon === 'string';
    return isDungeonItemDrop ? (drops.dungeon as string) : '';
  });

  /** The same, by the id the temples and the take path know ("small-key" is "key"), to light the right tile */
  const heldDungeonItem = computed((): string => dungeonItemId(storedDungeonItem.value));

  const heldItems = computed((): string[] => props.drops?.items ?? []);
  const heldGold = computed((): number => props.drops?.gold ?? 0);

  const isDungeonItemHeld = (id: string): boolean => dungeonItemId(id) === heldDungeonItem.value;

  /**
   * The drop that holds this much, or null for nothing. The `chest` names its main thing, as a chest's does: the
   * dungeon item, else the item rows, else the gold. A field with nothing in it is left out.
   */
  const dropOf = ({ dungeon, items, gold }: HeldDrop): RoomDrops | null => {
    const hasDungeonItem = dungeon !== '';
    const hasItems = items.length > 0;
    const hasGold = gold > 0;
    const holdsNothing = !hasDungeonItem && !hasItems && !hasGold;
    if (holdsNothing) return null;

    let chest = 'gold';
    if (hasItems) chest = 'consumable';
    if (hasDungeonItem) chest = 'dungeon';

    const next: RoomDrops = { chest };
    if (hasDungeonItem) next.dungeon = dungeon;
    if (hasItems) next.items = items;
    if (hasGold) next.gold = gold;
    return next;
  };

  const heldNow = (): HeldDrop => ({ dungeon: storedDungeonItem.value, items: [...heldItems.value], gold: heldGold.value });

  /** Picks the dungeon item, or none ('') */
  const pickDungeonItem = (id: string): void => {
    emit('update:drops', dropOf({ ...heldNow(), dungeon: id }));
  };

  /** Ticks a consumable, or unticks it when it is already there */
  const toggleItem = (id: string): void => {
    const now = heldNow();
    const isTicked = now.items.includes(id);
    const items = isTicked ? now.items.filter((row) => row !== id) : [...now.items, id];
    emit('update:drops', dropOf({ ...now, items }));
  };

  /** What was typed in the gold field as whole GP, never below 0 nor above the most a drop holds (nonsense is 0) */
  const goldOf = (text: string): number => {
    const typed = Math.floor(Number(text));
    const isNumber = Number.isFinite(typed);
    return isNumber ? Math.min(MAX_GOLD, Math.max(0, typed)) : 0;
  };

  const typeGold = (event: Event): void => {
    const field = event.target as HTMLInputElement;
    emit('update:drops', dropOf({ ...heldNow(), gold: goldOf(field.value) }));
  };

  /** When the field is left, it shows the gold the drop holds: what was typed may have been cut to fit */
  const showHeldGold = (event: Event): void => {
    const field = event.target as HTMLInputElement;
    field.value = heldGold.value ? String(heldGold.value) : '';
  };
</script>

<style lang="scss" scoped>
  .config-box {
    .config-label {
      font-family: "Press Start 2P";
      font-size: 0.65rem;
      color: #fff;
      opacity: 0.7;
      margin-bottom: 8px;
      letter-spacing: 0.5px;
    }
  }

  .drops-hint {
    margin: 0 0 14px;
    font-family: "StatusPlz";
    font-size: 0.6rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .sub-label {
    display: block;
    margin-bottom: 8px;
    font-family: "StatusPlz";
    font-size: 0.6rem;
    color: rgba(255, 255, 255, 0.6);
  }

  .item-grid {
    display: grid;
    gap: 8px;

    &.items-3 {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .item-option.mini {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 4px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
    appearance: none;
    font: inherit;

    i {
      font-size: 1.1rem;
      color: rgba(255, 255, 255, 0.4);
    }

    span {
      font-family: "StatusPlz";
      font-size: 0.5rem;
      color: rgba(255, 255, 255, 0.4);
    }

    &.active {
      background: rgba(var(--ion-color-primary-rgb), 0.15);
      border-color: var(--ion-color-primary);

      i {
        color: var(--ion-color-primary);
      }

      span {
        color: #fff;
      }
    }
  }

  .gold-field {
    display: flex;
    align-items: center;
    gap: 10px;

    .sub-label {
      margin-bottom: 0;
    }

    input {
      width: 96px;
      padding: 8px 10px;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      font-family: "Press Start 2P";
      font-size: 0.8rem;
      color: #ffd740;
      text-align: right;

      &:focus {
        outline: none;
        border-color: #ffd740;
      }
    }

    .gold-unit {
      font-family: "Press Start 2P";
      font-size: 0.65rem;
      color: #ffd740;
    }
  }

  .mt-15 {
    margin-top: 15px;
  }
</style>
