import { computed, ref, watch } from 'vue';
import type { useTemple } from '@/hooks/temples/useTemple';
import { metadataFor, metadataForAsync, type TempleMetadata } from '@/lib/engine/temples/templeRegistry';
import { templeElementFor } from '@/lib/services/temples/RoomBeast';

/** The temple screen's route props. The composables read them where they use them, so they stay reactive. */
export interface TempleGroundsProps {
  readonly userId?: string;
  readonly temple: string;
}

/** What useTemple hands the temple screen; each composable picks the members it needs. */
export type TempleState = ReturnType<typeof useTemple>;

// Get the appropriate world location for a temple
export const getTempleWorldLocation = (templeId: string) => {
  // Map temples to their world locations and route names
  const templeWorldMap: Record<string, { world: string, route: string }> = {
    'wind-temple': { world: 'plains', route: 'world-plains' },
    'water-temple': { world: 'islands', route: 'world-islands' },
    'earth-temple': { world: 'forest', route: 'world-forest' },
    'fire-temple': { world: 'mountains', route: 'world-mountains' },
    'ice-temple': { world: 'ice', route: 'world-ice' },
    'light-temple': { world: 'sands', route: 'world-sands' },
    'shadow-temple': { world: 'swamps', route: 'world-swamps' },
    'moon-temple': { world: 'the-moon', route: 'the-moon' },
    'storm-temple': { world: 'clouds', route: 'world-clouds' }
  };

  // Return the world location or default to home-town if not found
  return templeWorldMap[templeId] || { world: 'plains', route: 'home-town' };
};

/** Which temple this is: its metadata (the registry's, or the TempleDb's for a generated temple), its names, its element. */
export const useTempleMeta = (props: TempleGroundsProps) => {
  // Format the temple name for display
  // Registry temples and generated ones (gen-<slug>, from the TempleDb) share one metadata ref
  const templeMeta = ref<TempleMetadata | undefined>(metadataFor(props.temple));
  const isGenerated = computed(() => String(props.temple || '').startsWith('gen-'));
  const resolveTempleMeta = (id: string) => {
    templeMeta.value = metadataFor(id);
    if (id.startsWith('gen-')) {
      void metadataForAsync(id).then((meta) => { if (id === props.temple) templeMeta.value = meta; });
    }
  };
  resolveTempleMeta(props.temple);
  watch(() => props.temple, resolveTempleMeta);
  const templeName = computed(() => {
    const generatedName = isGenerated.value ? templeMeta.value?.name : undefined;
    if (generatedName) return generatedName;
    return props.temple.replace(/-/g, ' ');
  });

  const templeElement = computed(() => templeElementFor(props.temple, templeMeta.value?.element));

  // The Area tab names the temple without the markup of the title
  const templeShortName = computed(() => String(templeName.value || 'Temple').replace(/<[^>]*>/g, '').trim() || 'Temple');

  return {
    metadata: templeMeta,
    isGenerated,
    name: templeName,
    element: templeElement,
    shortName: templeShortName
  };
};
