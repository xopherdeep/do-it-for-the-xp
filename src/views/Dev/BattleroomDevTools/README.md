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
import { createBattleroomTestUtils } from '@/lib/utils/battleroom';
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

## Battle System Documentation

### Overview

The battle system is a core feature of the "Do It for the XP" project, representing challenges and tasks as encounters with enemies. This system is designed to be engaging and rewarding, providing a fun way to track progress and achievements.

### Key Components

1.  **BattleField Component**: The main UI component for rendering battles. It displays the environment, enemies, player actions, and dialog.
2.  **BattleService**: A service that encapsulates the battle logic, managing turns, actions, and enemy behavior.
3.  **BattleroomDevTools**: A set of tools for testing and debugging the battle system in isolation.
4.  **Vuex Store**: Manages the global battle state, including active battles, enemy data, and battle counters.

### Core Mechanics

1.  **Turn Management**: Battles are turn-based, with the player and enemy alternating actions.
2.  **Actions**: Players can perform various actions such as attack, defend, use items, or run.
3.  **Enemy AI**: Enemies have basic AI that determines their actions during their turn.
4.  **Battle Dialog**: Dialog boxes display messages and narrate the battle events.
5.  **Rewards**: Upon defeating an enemy, players receive rewards such as XP, virtual currency, and items.

### Development Tools

1.  **BattleroomDevTools Component**:
    *   **Background Theme Selector**: Test different battle environments
    *   **Enemy Type Selector**: Switch between basic enemies, mini-bosses, and bosses
    *   **Battle State Toggle**: Easily activate or deactivate battles
    *   **Trigger Battle Button**: Force a battle to start
    *   **Battle State Viewer**: View the current battle state in real-time
2.  **BattleroomTestUtils**:
    *   `triggerBattle()`: Manually trigger a battle with customizable parameters.
    *   `endBattle()`: End the current battle.
    *   `logBattleState()`: Log the current battle state to the console.
    *   `simulateSteps()`: Simulate random encounters by reducing the battle counter.
3.  **Test Framework**:
    *   Run battleroom-specific tests with:
        ```
        npm run battleroom:test
        ```

### Workflow

1.  **Initialization**: The `BattleField` component initializes the battle by loading the enemy and setting up the environment.
2.  **Turn Cycle**: The battle proceeds in turns, with the player and enemy taking actions.
3.  **Action Handling**: The `BattleService` handles player actions, updating the battle state and triggering animations.
4.  **Enemy Turn**: The `BattleService` determines the enemy's action and applies its effects.
5.  **Victory/Defeat**: The battle ends when either the player or the enemy is defeated.

### Best Practices

1.  Use the battleroom development tools for isolated testing of battle mechanics
2.  Run battleroom-specific tests before making major changes
3.  Check the battle state in real-time using the Battle State Viewer
4.  Use the BattleroomTestUtils for programmatic testing of battle logic