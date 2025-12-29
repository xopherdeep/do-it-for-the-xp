import { ref } from 'vue';
import { 
  VisualStyle, 
  PatternOption, 
  EraPixelSizes, 
  StyleColors, 
  EraPalette,
  StyleConfig
} from '../types';

export function useStyleConfig() {
  // Era-specific visual style options
  const visualEraStyles = ref<VisualStyle[]>([
    { id: 'retro80s', name: '80\'s Adventure', description: 'Limited colors, blocky textures (Atari/NES era)' },
    { id: '16bit90s', name: '90\'s SNES Zelda', description: '16-bit style with detailed pixel art' },
    { id: 'rpg00s', name: '00\'s Final Fantasy', description: 'Detailed textures with lighting effects' },
    { id: 'modern', name: 'Modern RPG', description: 'High detail with advanced lighting and effects' }
  ]);

  const selectedEraStyle = ref('16bit90s'); // Default to SNES style

  // Define pixel sizes for different eras (for pixelation effect)
  const eraPixelSizes: EraPixelSizes = {
    'retro80s': 8,  // Large pixels for 8-bit era
    '16bit90s': 4,  // Medium pixels for 16-bit era
    'rpg00s': 2,    // Small pixels for early 3D era
    'modern': 1     // No pixelation for modern
  };

  // Floor and wall style selections
  const floorStyle = ref('stone');
  const wallStyle = ref('brick');

  // Floor and wall pattern types
  const floorPatterns = ref<PatternOption[]>([
    { id: 'basic', name: 'Basic' },
    { id: 'grid', name: 'Grid' },
    { id: 'dots', name: 'Dots' },
    { id: 'checkerboard', name: 'Checkerboard' },
    { id: 'herringbone', name: 'Herringbone' },
    { id: 'hexagonal', name: 'Hexagonal Tiles' },
    { id: 'random', name: 'Random Cracks' }
  ]);

  const wallPatterns = ref<PatternOption[]>([
    { id: 'plain', name: 'Plain' },
    { id: 'blocks', name: 'Blocks' },
    { id: 'bricks', name: 'Bricks' },
    { id: 'cracks', name: 'Cracked' },
    { id: 'detailed', name: 'Detailed' },
    { id: 'engraved', name: 'Engraved' },
  ]);

  // Selected pattern types
  const floorPatternType = ref('grid');
  const wallPatternType = ref('blocks');

  // Base colors for different styles
  const styleColors: StyleColors = {
    floor: {
      stone: '#868686',
      wood: '#8B4513',
      dirt: '#8B5A2B',
      marble: '#D3D3D3',
      grass: '#228B22',
      tile: '#A0A0A0',
      mosaic: '#7D9CA0',
      crystal: '#A5D8F3',
    },
    wall: {
      brick: '#A52A2A',
      stone: '#708090',
      rock: '#4D4D4D',
      marble: '#F5F5F5',
      ice: '#ADD8E6',
      timber: '#CD853F',
      temple: '#8A6642',
      ornate: '#B8860B',
    }
  };

  // Color palettes for different eras
  const eraPalettes: EraPalette = {
    'retro80s': {
      floor: {
        stone: '#777777',
        wood: '#8B4513',
        dirt: '#7a5c3d',
        marble: '#AAAAAA',
        grass: '#228B22',
        tile: '#999999',
        mosaic: '#7D9CA0',
        crystal: '#6495ED',
      },
      wall: {
        brick: '#8B0000',
        stone: '#696969',
        rock: '#4D4D4D',
        marble: '#CCCCCC',
        ice: '#ADD8E6',
        timber: '#A0522D',
        temple: '#8A6642',
        ornate: '#B8860B',
      }
    },
    '16bit90s': {
      floor: {
        stone: '#868686',
        wood: '#9b6a4c',
        dirt: '#8B5A2B',
        marble: '#D3D3D3',
        grass: '#3cb43c',
        tile: '#A0A0A0',
        mosaic: '#7D9CA0',
        crystal: '#A5D8F3',
      },
      wall: {
        brick: '#A52A2A',
        stone: '#708090',
        rock: '#4D4D4D',
        marble: '#F5F5F5',
        ice: '#ADD8E6',
        timber: '#CD853F',
        temple: '#8A6642',
        ornate: '#B8860B',
      }
    },
    'rpg00s': {
      floor: {
        stone: '#969696',
        wood: '#a06841',
        dirt: '#9c7852',
        marble: '#e8e8e8',
        grass: '#4eca4e',
        tile: '#b8b8b8',
        mosaic: '#92b7bc',
        crystal: '#b9e5ff',
      },
      wall: {
        brick: '#c44242',
        stone: '#879cb0',
        rock: '#666666',
        marble: '#ffffff',
        ice: '#d0ebf5',
        timber: '#d9965e',
        temple: '#a37d53',
        ornate: '#dcac36',
      }
    },
    'modern': {
      floor: {
        stone: '#a6a6a6',
        wood: '#b37846',
        dirt: '#ad8c66',
        marble: '#f0f0f0',
        grass: '#5ee25e',
        tile: '#c9c9c9',
        mosaic: '#a7ccd1',
        crystal: '#cceeff',
      },
      wall: {
        brick: '#d25454',
        stone: '#99aec3',
        rock: '#777777',
        marble: '#ffffff',
        ice: '#e0f5ff',
        timber: '#e8a769',
        temple: '#b88d5e',
        ornate: '#f0bc40',
      }
    }
  };

  // Get the color for the current era and style
  const getEraColor = (type: 'floor' | 'wall', style: string): string => {
    const era = selectedEraStyle.value;
    const eraColors = eraPalettes[era as keyof typeof eraPalettes];

    if (eraColors && eraColors[type] && typeof eraColors[type][style] === 'string') {
      return eraColors[type][style];
    }

    // Fallback to default colors
    if (styleColors[type] && typeof styleColors[type][style] === 'string') {
      return styleColors[type][style];
    }

    return '#868686'; // Default fallback color
  };

  // Default style configuration
  const styleConfig = ref<StyleConfig>({
    wallColor: '#333',
    floorColor: '#CCC',
    roomTypeColors: {
      entrance: '#4CAF50',
      exit: '#D32F2F',
      hall: '#EEEEEE',
      loot: '#FFC107',
      monster: '#F44336',
      boss: '#9C27B0',
      miniboss: '#E91E63',
      shop: '#2196F3',
      trap: '#FF9800',
      puzzle: '#00BCD4',
      teleport: '#3F51B5',
      wall: '#333333',
      empty: '#CCCCCC',    // Added missing required room type
      hidden: '#555555'    // Added missing required room type
    },
    doorSize: 10,
    doorColor: '#8D6E63',
    lockedDoorColor: '#C62828'
  });
  
  // Utility function to update styles
  const updateStyles = (newStyles: Partial<StyleConfig>): void => {
    // Update specific style properties
    styleConfig.value = {
      ...styleConfig.value,
      ...newStyles
    };
  };

  return {
    visualEraStyles,
    selectedEraStyle,
    eraPixelSizes,
    floorStyle,
    wallStyle,
    floorPatterns,
    wallPatterns,
    floorPatternType,
    wallPatternType,
    styleColors,
    eraPalettes,
    getEraColor,
    ...styleConfig.value,
    updateStyles
  };
}