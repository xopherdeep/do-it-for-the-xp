# Battleroom Developer Tools

This directory contains tools for developing and testing the battleroom component.

## Getting Started

1. **Run the development server with battleroom tools enabled:**
   ```
   npm run battleroom:serve
   ```
   This will start a development server with the battleroom development tools enabled.

2. **Access the Battleroom Dev Tools:**
   Navigate to `/dev/battleroom` in your browser to access the dedicated testing interface.

## Available Tools

### 1. BattleroomDevTools Component

The BattleroomDevTools component provides a dedicated UI for testing and debugging the battleroom:

- **Background Theme Selector**: Test different battle environments
- **Enemy Type Selector**: Switch between basic enemies, mini-bosses, and bosses
- **Battle State Toggle**: Easily activate or deactivate battles
- **Trigger Battle Button**: Force a battle to start
- **Battle State Viewer**: View the current battle state in real-time

### 2. BattleroomTestUtils

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

### 3. Test Framework

Run battleroom-specific tests with:
```
npm run battleroom:test
```

## VS Code Tasks

Several VS Code tasks are available to help with battleroom development:

- **battleroom:serve**: Start development server with battleroom tools enabled
- **battleroom:build**: Build the application with battleroom optimizations
- **battleroom:test**: Run battleroom-specific tests

Access these from the VS Code Command Palette (Ctrl+Shift+P) by typing "Tasks: Run Task" and selecting the desired battleroom task.

## Configuration

The battleroom development environment is configured in:

- **battleroom.config.js**: Contains webpack optimizations for battleroom development
- **vue.config.js**: Integrates battleroom configuration when BATTLEROOM_DEV is set

## Best Practices

1. Use the battleroom development tools for isolated testing of battle mechanics
2. Run battleroom-specific tests before making major changes
3. Check the battle state in real-time using the Battle State Viewer
4. Use the BattleroomTestUtils for programmatic testing of battle logic