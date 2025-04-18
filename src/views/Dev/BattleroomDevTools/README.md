# Do It for the XP - Battleroom Developer Tools

## Project Overview

Do It for the XP is an innovative mobile application that transforms everyday tasks, chores, and personal development into an immersive RPG-style experience. Built as a cross-platform application using Vue.js with Ionic/Capacitor, it's essentially a gamified productivity system where users earn experience points, level up characters, collect items, and engage in battles by completing real-world tasks.

### Core Purpose

The application addresses the universal challenge of motivation by applying game mechanics to productivity. Its primary aims are:

- Transform mundane tasks into rewarding adventures
- Create sustainable habit formation through game-like progression
- Facilitate family cooperation through shared quests and profiles
- Build intrinsic motivation by visualizing progress and achievement
- Make personal development fun through narrative and rewards

### Key Technical Components

The application is built with:

- Vue.js frontend with TypeScript for type safety
- Capacitor/Ionic framework for cross-platform mobile deployment
- Android/iOS native packaging
- Local storage for settings and configurations
- Environment-specific development tools

### Core Features & Mechanics

- **Multi-Profile System**: Family-centric design with different user roles
- **Character Progression**: Stats, experience, levels, and customization
- **Task & Quest System**: Daily activities converted into rewarding quests
- **Battle System**: Challenges represented as enemies to defeat
- **World Map & Locations**: Themed regions with unique environments
- **Social Features**: Family connections and collaborative activities
- **Reward Systems**: XP, virtual currency, items, and achievements

## Battleroom Development

This directory contains tools for developing and testing the battleroom component.

### Getting Started

1. **Run the development server with battleroom tools enabled:**
   ```
   npm run battleroom:serve
   ```
   This will start a development server with the battleroom development tools enabled.

2. **Access the Battleroom Dev Tools:**
   Navigate to `/dev/battleroom` in your browser to access the dedicated testing interface.

### Available Tools

#### 1. BattleroomDevTools Component

The BattleroomDevTools component provides a dedicated UI for testing and debugging the battleroom:

- **Background Theme Selector**: Test different battle environments
- **Enemy Type Selector**: Switch between basic enemies, mini-bosses, and bosses
- **Battle State Toggle**: Easily activate or deactivate battles
- **Trigger Battle Button**: Force a battle to start
- **Battle State Viewer**: View the current battle state in real-time

#### 2. BattleroomTestUtils

A utility class with methods for testing and debugging battleroom functionality programmatically:

```typescript
// Import the utility
import { createBattleroomTestUtils } from '@/utils/battleroom';
import { useStore } from 'vuex';

// In your component or test file
const store = useStore();
const battleUtils = createBattleroomTestUtils(store);

// Use the utilities
battleUtils.triggerBattle({ bgIndex: 2 });
battleUtils.logBattleState();
battleUtils.endBattle();
```

#### 3. Test Framework

Run battleroom-specific tests with:
```
npm run battleroom:test
```

### VS Code Tasks

Several VS Code tasks are available to help with battleroom development:

- **battleroom:serve**: Start development server with battleroom tools enabled
- **battleroom:build**: Build the application with battleroom optimizations
- **battleroom:test**: Run battleroom-specific tests

Access these from the VS Code Command Palette (Ctrl+Shift+P) by typing "Tasks: Run Task" and selecting the desired battleroom task.

### Configuration

The battleroom development environment is configured in:

- **battleroom.config.js**: Contains webpack optimizations for battleroom development
- **vue.config.js**: Integrates battleroom configuration when BATTLEROOM_DEV is set

### Best Practices

1. Use the battleroom development tools for isolated testing of battle mechanics
2. Run battleroom-specific tests before making major changes
3. Check the battle state in real-time using the Battle State Viewer
4. Use the BattleroomTestUtils for programmatic testing of battle logic