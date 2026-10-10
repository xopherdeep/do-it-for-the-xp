# WeatherFX Developer Tools

## Overview

The WeatherFX Developer Tools is a specialized testing interface for developing and debugging the WeatherFX component system in the Do It for the XP application. This tool allows you to visualize and interact with every canvas weather effect.

## Features

### 1. Interactive Weather Preview

- **Live Weather Visualization**: See weather effects rendered in real-time on different scene types
- **Effect Comparison**: Easily switch between different weather types to compare visuals
- **Background Environment Selection**: Test weather effects on different environments (plains, beach, forest, etc.)

### 2. Comprehensive Controls

- **Weather Type Selector**: Choose from all available weather types
- **Intensity Adjustment**: Fine-tune the weather intensity on a scale of 0-10
- **Sound Toggle**: Enable/disable weather sound effects
- **Volume Control**: Adjust the volume of weather sounds
- **Scene Type Selection**: Test weather effects in different environments

### 3. Debug Information

- **Real-time State Display**: See the current state of the WeatherFX component
- **Event Notifications**: Get notifications when effects are loaded or changed
- **Parameter Visualization**: View all active parameters affecting the weather display

## Getting Started

1. Navigate to `/dev/weatherfx` in the application to access the WeatherFXDevTools interface
2. Select a weather type from the dropdown menu
3. Adjust the intensity and other parameters as needed
4. Changes apply live

## Key Components

### Canvas engine

Every weather type is drawn by one canvas and one `requestAnimationFrame` loop (`engine/`), composed from the layers in `presets.ts`. The overlay in the preview shows the page FPS and the engine's current particle `budget` (0.25-1, lowered automatically on slow devices).

- All 16 weather types are in the select: none, sunny, tropical, rainy, stormy, snowy, cloudy, plains, desert, swamp, forest, mountains, moon, cave, dungeon, urban.
- **Stress** switches to stormy at intensity 10 so you can watch the budget fall.
- Sound is off by default; the toggle plays the preset's ambient loop (`src/assets/audio/weather/*`).

## Best Practices

1. Use the WeatherFX Developer Tools when implementing new weather effects or debugging existing ones
2. Test on different scene types to ensure weather effects work in all environments
3. Check both visual and audio elements of weather effects
4. Utilize the debug information panel to understand the underlying state

## Implementation Details

1. **WeatherFX Component**: renders the canvas and wires props to the engine and to the ambient sound.
2. **Engine and presets**: `engine/useWeatherCanvas.ts`, `effects/*.ts`, `presets.ts`.
3. **useWeatherFX Composable**: lazily created, looped `Audio` per sound with 600 ms fades; respects the app mute.
4. **sounds.ts**: resolves the `.ogg`/`.mp3` files and the default volume of each loop.
