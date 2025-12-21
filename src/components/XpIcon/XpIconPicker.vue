<template>
  <ion-content>
    <ion-searchbar
      v-model="searchQuery"
      placeholder="Search icons..."
      debounce="300"
      @ionChange="filterIcons"
    ></ion-searchbar>
    
    <div class="icon-categories">
      <ion-segment v-model="currentCategory" @ionChange="filterIcons">
        <ion-segment-button value="all">
          <ion-label>All</ion-label>
        </ion-segment-button>
        <ion-segment-button value="regular">
          <ion-label>Regular</ion-label>
        </ion-segment-button>
        <ion-segment-button value="solid">
          <ion-label>Solid</ion-label>
        </ion-segment-button>
        <ion-segment-button value="light">
          <ion-label>Light</ion-label>
        </ion-segment-button>
        <ion-segment-button value="brands">
          <ion-label>Brands</ion-label>
        </ion-segment-button>
      </ion-segment>
    </div>

    <div class="icons-grid" v-if="filteredIcons.length > 0">
      <div 
        v-for="icon in filteredIcons" 
        :key="icon.name"
        class="icon-item"
        :class="{ 'selected': selectedIcon === icon.name }"
        @click="selectIcon(icon.name)"
      >
        <i :class="[icon.prefix, 'fa-' + icon.name]"></i>
        <div class="icon-name">{{ icon.name }}</div>
      </div>
    </div>
    
    <div v-else class="empty-state">
      <ion-icon name="search"></ion-icon>
      <p>No icons found for "{{ searchQuery }}".</p>
    </div>
    
    <div class="selection-footer" v-if="selectedIcon">
      <p>Selected: <span>{{ selectedIcon }}</span></p>
      <div class="preview">
        <i :class="[selectedIconPrefix, 'fa-' + selectedIcon]"></i>
      </div>
      <ion-button expand="block" @click="confirmSelection">
        Confirm
      </ion-button>
    </div>
  </ion-content>
</template>

<script>
import { defineComponent, ref, computed } from 'vue';

// Icon categories with most commonly used icons per category
// In a real implementation, you would import a more complete list
const ICONS = {
  regular: [
    'address-book', 'address-card', 'angry', 'arrow-alt-circle-down', 'arrow-alt-circle-left', 
    'arrow-alt-circle-right', 'arrow-alt-circle-up', 'bell', 'bell-slash', 'bookmark',
    'building', 'calendar', 'calendar-alt', 'calendar-check', 'calendar-minus',
    'calendar-plus', 'calendar-times', 'chart-bar', 'check-circle', 'check-square',
    'circle', 'clipboard', 'clock', 'clone', 'closed-captioning',
    'comment', 'comment-alt', 'comment-dots', 'comments', 'compass',
    'copy', 'copyright', 'credit-card', 'edit', 'envelope',
    'envelope-open', 'eye', 'eye-slash', 'file', 'file-alt',
    'file-archive', 'file-audio', 'file-code', 'file-excel', 'file-image',
    'file-pdf', 'file-powerpoint', 'file-video', 'file-word', 'flag',
    'folder', 'folder-open', 'frown', 'gem', 'hand-paper',
    'hand-peace', 'hand-point-down', 'hand-point-left', 'hand-point-right', 'hand-point-up',
    'hand-rock', 'heart', 'hospital', 'hourglass', 'id-badge',
    'id-card', 'image', 'images', 'keyboard', 'life-ring',
    'lightbulb', 'list-alt', 'map', 'meh', 'minus-square',
    'money-bill-alt', 'moon', 'newspaper', 'object-group', 'object-ungroup',
    'paper-plane', 'pause-circle', 'play-circle', 'plus-square', 'question-circle',
    'registered', 'save', 'share-square', 'smile', 'snowflake',
    'square', 'star', 'star-half', 'sticky-note', 'stop-circle',
    'sun', 'thumbs-down', 'thumbs-up', 'times-circle', 'trash-alt',
    'user', 'user-circle', 'window-close', 'window-maximize', 'window-minimize',
    'window-restore'
  ],
  solid: [
    'ad', 'address-book', 'address-card', 'adjust', 'air-freshener',
    'align-center', 'align-justify', 'align-left', 'align-right', 'allergies',
    'ambulance', 'american-sign-language-interpreting', 'anchor', 'angle-double-down', 'angle-double-left',
    'angle-double-right', 'angle-double-up', 'angle-down', 'angle-left', 'angle-right',
    'angle-up', 'angry', 'ankh', 'apple-alt', 'archive',
    'archway', 'arrow-alt-circle-down', 'arrow-alt-circle-left', 'arrow-alt-circle-right', 'arrow-alt-circle-up',
    'arrow-circle-down', 'arrow-circle-left', 'arrow-circle-right', 'arrow-circle-up', 'arrow-down',
    'arrow-left', 'arrow-right', 'arrow-up', 'arrows-alt', 'arrows-alt-h',
    'arrows-alt-v', 'assistive-listening-systems', 'asterisk', 'at', 'atlas',
    'atom', 'audio-description', 'award', 'baby', 'baby-carriage',
    'backspace', 'backward', 'bacon', 'balance-scale', 'balance-scale-left',
    'balance-scale-right', 'ban', 'band-aid', 'barcode', 'bars',
    'baseball-ball', 'basketball-ball', 'bath', 'battery-empty', 'battery-full',
    'battery-half', 'battery-quarter', 'battery-three-quarters', 'bed', 'beer',
    'bell', 'bell-slash', 'bezier-curve', 'bible', 'bicycle',
    'biking', 'binoculars', 'biohazard', 'birthday-cake', 'blender',
    'blender-phone', 'blind', 'blog', 'bold', 'bolt',
    'bomb', 'bone', 'bong', 'book', 'book-dead'
  ],
  light: [
    'address-book', 'address-card', 'adjust', 'air-freshener', 'align-center',
    'align-justify', 'align-left', 'align-right', 'allergies', 'ambulance',
    'american-sign-language-interpreting', 'anchor', 'angle-double-down', 'angle-double-left', 'angle-double-right',
    'angle-double-up', 'angle-down', 'angle-left', 'angle-right', 'angle-up',
    'angry', 'ankh', 'apple-alt', 'archive', 'archway',
    'arrow-alt-circle-down', 'arrow-alt-circle-left', 'arrow-alt-circle-right', 'arrow-alt-circle-up', 'arrow-circle-down',
    'arrow-circle-left', 'arrow-circle-right', 'arrow-circle-up', 'arrow-down', 'arrow-left',
    'arrow-right', 'arrow-up', 'arrows-alt', 'arrows-alt-h', 'arrows-alt-v'
  ],
  brands: [
    'accessible-icon', 'accusoft', 'acquisitions-incorporated', 'adn', 'adobe',
    'adversal', 'affiliatetheme', 'airbnb', 'algolia', 'alipay',
    'amazon', 'amazon-pay', 'amilia', 'android', 'angellist',
    'angrycreative', 'angular', 'app-store', 'app-store-ios', 'apper',
    'apple', 'apple-pay', 'artstation', 'asymmetrik', 'atlassian',
    'audible', 'autoprefixer', 'avianex', 'aviato', 'aws',
    'bandcamp', 'battle-net', 'behance', 'behance-square', 'bimobject',
    'bitbucket', 'bitcoin', 'bity', 'black-tie', 'blackberry',
    'blogger', 'blogger-b', 'bluetooth', 'bluetooth-b', 'bootstrap',
    'btc', 'buffer', 'buromobelexperte', 'buy-n-large', 'buysellads',
    'canadian-maple-leaf', 'cc-amazon-pay', 'cc-amex', 'cc-apple-pay', 'cc-diners-club',
    'cc-discover', 'cc-jcb', 'cc-mastercard', 'cc-paypal', 'cc-stripe',
    'cc-visa', 'centercode', 'centos', 'chrome', 'chromecast'
  ],
  // Add more common icons based on categories
  gaming: [
    'gamepad', 'dice', 'dice-d20', 'dice-d6', 'dice-five',
    'dice-four', 'dice-one', 'dice-six', 'dice-three', 'dice-two',
    'chess', 'chess-bishop', 'chess-board', 'chess-king', 'chess-knight',
    'chess-pawn', 'chess-queen', 'chess-rook', 'ghost', 'headset',
    'heart', 'trophy', 'medal', 'crown', 'dragon', 
    'dungeon', 'swords', 'hat-wizard', 'shield-alt', 'skull',
    'skull-crossbones'
  ],
  weather: [
    'bolt', 'cloud', 'cloud-moon', 'cloud-moon-rain', 'cloud-rain',
    'cloud-showers-heavy', 'cloud-sun', 'cloud-sun-rain', 'meteor', 'moon',
    'rainbow', 'smog', 'snowflake', 'sun', 'temperature-high',
    'temperature-low', 'umbrella', 'water', 'wind'
  ],
  // Flow-related icons
  time: [
    'clock', 'hourglass', 'calendar', 'calendar-alt', 'calendar-check',
    'calendar-day', 'calendar-week', 'stopwatch', 'history', 'alarm-clock',
    'timer', 'watch'
  ],
  rewards: [
    'award', 'badge', 'certificate', 'crown', 'gem',
    'gift', 'gifts', 'medal', 'ribbon', 'star',
    'star-half', 'trophy', 'coins', 'money-bill', 'hand-holding-usd'
  ],
  rpg: [
    'hat-wizard', 'scroll', 'book-dead', 'dungeon', 'dragon',
    'swords', 'shield-alt', 'ring', 'skull', 'skull-crossbones',
    'beer', 'flask', 'fire', 'fire-alt', 'bolt',
    'magic', 'wand', 'hand-holding-magic', 'broom', 'staff'
  ]
};

export default defineComponent({
  name: 'XpIconPicker',
  props: {
    initialIcon: {
      type: String,
      default: ''
    },
    initialCategory: {
      type: String,
      default: 'all'
    }
  },
  setup(props, { emit }) {
    const searchQuery = ref('');
    const currentCategory = ref(props.initialCategory || 'all');
    const selectedIcon = ref(props.initialIcon || '');
    const selectedIconPrefix = ref('fas');
    
    // Process icons for display format
    const processedIcons = computed(() => {
      const result = [];
      
      // Add regular icons
      ICONS.regular.forEach(name => {
        result.push({ name, prefix: 'far', category: 'regular' });
      });
      
      // Add solid icons
      ICONS.solid.forEach(name => {
        result.push({ name, prefix: 'fas', category: 'solid' });
      });
      
      // Add light icons
      ICONS.light.forEach(name => {
        result.push({ name, prefix: 'fal', category: 'light' });
      });
      
      // Add brand icons
      ICONS.brands.forEach(name => {
        result.push({ name, prefix: 'fab', category: 'brands' });
      });
      
      // Add gaming icons with solid style
      ICONS.gaming.forEach(name => {
        if (!result.some(icon => icon.name === name && icon.category === 'gaming')) {
          result.push({ name, prefix: 'fas', category: 'gaming' });
        }
      });
      
      // Add weather icons with solid style
      ICONS.weather.forEach(name => {
        if (!result.some(icon => icon.name === name && icon.category === 'weather')) {
          result.push({ name, prefix: 'fas', category: 'weather' });
        }
      });
      
      // Add time icons with solid style
      ICONS.time.forEach(name => {
        if (!result.some(icon => icon.name === name && icon.category === 'time')) {
          result.push({ name, prefix: 'fas', category: 'time' });
        }
      });
      
      // Add rewards icons with solid style
      ICONS.rewards.forEach(name => {
        if (!result.some(icon => icon.name === name && icon.category === 'rewards')) {
          result.push({ name, prefix: 'fas', category: 'rewards' });
        }
      });
      
      // Add RPG icons with solid style
      ICONS.rpg.forEach(name => {
        if (!result.some(icon => icon.name === name && icon.category === 'rpg')) {
          result.push({ name, prefix: 'fas', category: 'rpg' });
        }
      });
      
      return result;
    });
    
    // Filter icons based on search and category
    const filteredIcons = computed(() => {
      let filtered = processedIcons.value;
      
      // Filter by category if not 'all'
      if (currentCategory.value !== 'all') {
        filtered = filtered.filter(icon => icon.category === currentCategory.value);
      }
      
      // Filter by search query
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        filtered = filtered.filter(icon => icon.name.toLowerCase().includes(query));
      }
      
      return filtered;
    });
    
    // Select an icon
    const selectIcon = (iconName) => {
      selectedIcon.value = iconName;
      
      // Find the selected icon to get its prefix
      const icon = processedIcons.value.find(i => i.name === iconName);
      if (icon) {
        selectedIconPrefix.value = icon.prefix;
      }
    };
    
    // Filter icons based on search query and category
    const filterIcons = () => {
      // No explicit action needed here as computed properties will update
    };
    
    // Confirm the selected icon
    const confirmSelection = () => {
      if (selectedIcon.value) {
        emit('select', {
          iconName: selectedIcon.value,
          iconPrefix: selectedIconPrefix.value
        });
      }
    };
    
    // If an initial icon was provided, find its prefix
    if (props.initialIcon) {
      const icon = processedIcons.value.find(i => i.name === props.initialIcon);
      if (icon) {
        selectedIconPrefix.value = icon.prefix;
      }
    }
    
    return {
      searchQuery,
      currentCategory,
      selectedIcon,
      selectedIconPrefix,
      filteredIcons,
      selectIcon,
      filterIcons,
      confirmSelection
    };
  }
});
</script>

<style lang="scss" scoped>
.icon-categories {
  margin-bottom: 16px;
  
  ion-segment {
    overflow-x: auto;
    
    ion-segment-button {
      min-width: auto;
    }
  }
}

.icons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 16px;
  padding: 16px;
  
  .icon-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    padding: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    
    i {
      font-size: 1.5rem;
      margin-bottom: 4px;
    }
    
    .icon-name {
      font-size: 0.7rem;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    
    &:hover {
      background-color: var(--ion-color-light);
    }
    
    &.selected {
      background-color: var(--ion-color-primary-tint);
      color: var(--ion-color-primary-contrast);
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  
  ion-icon {
    font-size: 48px;
    margin-bottom: 16px;
    color: var(--ion-color-medium);
  }
  
  p {
    color: var(--ion-color-medium);
  }
}

.selection-footer {
  position: sticky;
  bottom: 0;
  background-color: var(--ion-background-color);
  border-top: 1px solid var(--ion-color-light);
  padding: 16px;
  text-align: center;
  
  p {
    margin-bottom: 8px;
    
    span {
      font-weight: bold;
    }
  }
  
  .preview {
    margin-bottom: 16px;
    
    i {
      font-size: 2rem;
    }
  }
}
</style>