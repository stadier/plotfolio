# State Borders Feature Documentation

## Overview

The State Borders feature adds administrative boundary overlays to the map with interactive hover effects, similar to popular real estate platforms like Zillow. This enhances the user experience by providing geographical context for property locations within Nigerian states.

## Features

### 1. State Border Display

- **Visual Borders**: Subtle gray borders outline Nigerian state boundaries
- **Hover Effects**: States highlight with blue fill and stronger border when hovered
- **Interactive Cursor**: Cursor changes to pointer when hovering over states

### 2. State Information Display

- **Hover Indicator**: Real-time display of hovered state name in top-right corner
- **State Selection**: Click handler for future state-based filtering functionality
- **Dynamic Positioning**: Hover indicator repositions when climate risk overlay is active

### 3. Layer Control Integration

- **Toggle Control**: State borders can be enabled/disabled via Map Options panel
- **Layer Management**: Integrated with existing layer controls (boundaries, grids)
- **Persistent Settings**: State border visibility state maintained throughout session

## Implementation Details

### Components

#### AdministrativeBoundaries.tsx

```typescript
interface AdministrativeBoundariesProps {
	showBorders?: boolean;
	onRegionHover?: (regionName: string | null) => void;
	onRegionClick?: (regionName: string) => void;
}
```

**Key Features:**

- Uses Google Maps Data Layer API for efficient boundary rendering
- Dynamic styling based on hover state
- Event handlers for mouse interactions
- Nigerian state boundaries with approximate coordinates

#### Integration Points

**GoogleMapComponent.tsx**

- Added `showStateBorders`, `onRegionHover`, `onRegionClick` props
- Integrated AdministrativeBoundaries component into map render tree

**PlotfolioMap.tsx**

- Extended props interface to support state border controls
- Passed through state border props to provider-specific map components

**page.tsx**

- Added state management for border visibility and hover state
- Integrated layer controls in Map Options panel
- Added hover indicator UI overlay

### State Data

The component currently includes 18 major Nigerian states with simplified boundary coordinates:

- Federal Capital Territory (FCT)
- Lagos State
- Kano State
- Rivers State
- Ogun State
- Kaduna State
- Katsina State
- Oyo State
- Niger State
- Borno State
- Cross River State
- Delta State
- Anambra State
- Enugu State
- Imo State
- Abia State
- Bauchi State
- Plateau State

## Usage

### Basic Usage

```typescript
<PlotfolioMap
	// ... other props
	showStateBorders={true}
	onRegionHover={(regionName) => setHoveredState(regionName)}
	onRegionClick={(regionName) => handleStateSelection(regionName)}
/>
```

### Layer Control

Users can toggle state borders via the Map Options panel:

1. Click the "Map" button in bottom controls
2. Navigate to "Map Layers" section
3. Check/uncheck "State Borders" option

### Hover Interaction

When users hover over a state:

1. State fills with semi-transparent blue color
2. Border becomes more prominent
3. State name appears in top-right indicator
4. Cursor changes to pointer

## Future Enhancements

### 1. Accurate GeoJSON Data

Replace simplified coordinates with official Nigerian National Boundary Commission data:

```typescript
// Example: Loading from external GeoJSON source
export function loadGeoJSONBoundaries(
	dataLayer: google.maps.Data,
	geoJsonUrl: string
) {
	dataLayer.loadGeoJson(geoJsonUrl, {}, (features) => {
		console.log(`Loaded ${features.length} administrative boundary features`);
	});
}
```

### 2. Property Filtering by State

Implement state-based property filtering:

```typescript
const handleStateClick = (regionName: string) => {
	const stateProperties = properties.filter(
		(property) => property.state === regionName
	);
	setFilteredProperties(stateProperties);
	// Zoom to state bounds
	setViewport(getStateBounds(regionName));
};
```

### 3. Enhanced Styling

- Custom state colors based on property density
- Property count overlays on states
- Price heat maps by state

### 4. Additional Administrative Levels

- Local Government Areas (LGAs)
- Senatorial districts
- Federal constituencies

### 5. Performance Optimizations

- Boundary simplification based on zoom level
- Lazy loading of detailed boundaries
- Boundary caching strategies

## Technical Considerations

### Performance

- Google Maps Data Layer efficiently handles polygon rendering
- State boundaries are loaded once and cached
- Hover effects use CSS transitions for smooth animations

### Browser Compatibility

- Requires modern browsers supporting Google Maps JavaScript API
- Falls back gracefully if Data Layer API unavailable

### Mobile Responsiveness

- Touch-friendly hover states
- Responsive positioning of state indicator
- Optimized for mobile map interactions

## Troubleshooting

### Common Issues

1. **Boundaries Not Displaying**

   - Check Google Maps API key permissions
   - Verify Data Layer support in browser
   - Ensure `showStateBorders` prop is true

2. **Hover Effects Not Working**

   - Confirm event listeners are properly attached
   - Check for conflicting map interactions
   - Verify cursor styling in CSS

3. **Performance Issues**
   - Consider boundary simplification
   - Implement zoom-based detail levels
   - Monitor Data Layer memory usage

### Debug Mode

Enable console logging for boundary events:

```typescript
dataLayer.addListener("mouseover", (event) => {
	console.log("State hovered:", event.feature.getProperty("name"));
});
```

## Related Documentation

- [MAPBOX_INTEGRATION.md](./MAPBOX_INTEGRATION.md) - For Mapbox implementation
- [BOUNDARY_REGISTRATION_GUIDE.md](./BOUNDARY_REGISTRATION_GUIDE.md) - Property boundary features
- [QUICK_START_BOUNDARIES.md](./QUICK_START_BOUNDARIES.md) - Boundary setup guide

---

**Last Updated:** November 6, 2025  
**Version:** 1.0.0  
**Author:** GitHub Copilot
