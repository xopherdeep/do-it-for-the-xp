# WeatherFX Developer Tools

## Overview

The WeatherFX Developer Tools is a specialized testing interface for developing and debugging the WeatherFX component system in the Do It for the XP application. This tool allows you to visualize and interact with all weather effects, including the newly implemented Plains weather effect.

## Features

### 1. Interactive Weather Preview

- **Live Weather Visualization**: See weather effects rendered in real-time on different scene types
- **Effect Comparison**: Easily switch between different weather types to compare visuals
- **Background Environment Selection**: Test weather effects on different environments (plains, beach, forest, etc.)

### 2. Comprehensive Controls

- **Weather Type Selector**: Choose from all available weather types (tropical, rainy, cloudy, sunny, stormy, snowy, plains)
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
4. Click "Apply Weather" to see the changes take effect

## Key Components

### PlainsFx Component

The newly implemented PlainsFx component provides a visual representation of plains weather conditions:

- Dynamically generated clouds with customizable density and opacity
- Wind-affected grass elements that respond to intensity changes
- Optional heat wave effects for high-intensity conditions
- Custom sky color that adapts to intensity levels

### Customization Options

For the plains weather type, special customization options include:

- `windDirection`: Set the direction of wind movement
- `particleDensity`: Adjust the number of particles (clouds, grass)
- `showHeatWaves`: Toggle heat wave effects for desert-like conditions

## Best Practices

1. Use the WeatherFX Developer Tools when implementing new weather effects or debugging existing ones
2. Test on different scene types to ensure weather effects work in all environments
3. Check both visual and audio elements of weather effects
4. Utilize the debug information panel to understand the underlying state

## Implementation Details

The core weather effects system consists of:

1. **WeatherFX Component**: The main component that renders weather effects
2. **Weather Type Components**: Specialized components for each weather type (e.g., PlainsFx)
3. **useWeatherFX Composable**: Manages sound playback and weather state
4. **Weather Type System**: Defines available weather types and their properties