# Mapbox Integration Guide

## ⚠️ Current Status

**Mapbox integration is temporarily disabled** due to module resolution issues with Next.js 16 + Turbopack.

The map type toggler is visible in the UI, but clicking Mapbox will show a message that it's under development. The application currently uses **Leaflet** (OpenStreetMap) which is fully functional.

## Overview

Plotfolio is designed to support **two map providers**:

- 🗺️ **Leaflet** (OpenStreetMap) - Free, open-source ✅ **ACTIVE**
- 🚀 **Mapbox GL JS** - Premium, vector-based maps 🚧 **IN PROGRESS**

You can see the map type switcher in the map header (currently shows a work-in-progress message for Mapbox).

## Setup Mapbox

### 1. Get a Mapbox Access Token

1. Go to [Mapbox Account](https://account.mapbox.com/access-tokens/)
2. Sign up for a free account (no credit card required for free tier)
3. Create a new access token or use the default public token
4. Copy the token

### 2. Add Token to Environment Variables

Open `.env.local` and add your token:

```bash
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1Ijoi...your_token_here
```

### 3. Restart Development Server

```bash
npm run dev
```

## Features Comparison

| Feature              | Leaflet       | Mapbox                 |
| -------------------- | ------------- | ---------------------- |
| **Cost**             | Free          | Free (50k loads/month) |
| **Map Quality**      | Raster tiles  | Vector tiles (HD)      |
| **Zoom Smoothness**  | Good          | Excellent              |
| **Performance**      | Good          | Excellent (WebGL)      |
| **3D Buildings**     | ❌            | ✅                     |
| **Heatmaps**         | Plugin needed | Built-in               |
| **Custom Styling**   | Limited       | Extensive              |
| **Drawing Tools**    | ✅ Available  | 🚧 Coming soon         |
| **Nigeria Coverage** | Good          | Excellent              |

## Current Status

### ✅ Implemented (Leaflet)

- Property markers
- Custom boundaries
- Manual boundary drawing
- Zoom controls
- Plot grid overlay
- Survey document integration

### ✅ Implemented (Mapbox)

- Property markers with popups
- Smooth pan and zoom
- Vector-based rendering
- Auto viewport updates

### 🚧 To Be Implemented (Mapbox)

- Custom boundary rendering (GeoJSON layers)
- Manual boundary drawing
- Heatmap visualization
- 3D building view
- Custom map styles
- Clustering for many properties

## Usage

### Toggle Between Map Types

Click the map type buttons in the header:

- **🗺️ Leaflet** - Classic OpenStreetMap view
- **🚀 Mapbox** - Modern vector map

### Drawing Boundaries

Currently only available in **Leaflet mode**:

1. Select a property
2. Click "✏️ Draw Boundary"
3. Click on map to add points
4. Save when complete

## Pricing (Mapbox)

### Free Tier

- ✅ 50,000 map loads per month
- ✅ Unlimited static map requests
- ✅ All features included

### Paid Plans (if exceeded)

- $5 per 1,000 map loads
- Example: 100k loads = $250/month

### Estimation for Plotfolio

- 100 users × 30 sessions = **3,000 loads/month** = **FREE**
- 1,000 users × 30 sessions = **30,000 loads/month** = **FREE**
- 2,000 users × 30 sessions = **60,000 loads/month** = **$50/month**

## Best Practices

### When to Use Leaflet

- ✅ MVP/early development
- ✅ Budget constraints
- ✅ Need drawing tools now
- ✅ Simple map visualization

### When to Use Mapbox

- ✅ Production app
- ✅ Professional appearance needed
- ✅ Many properties (100+)
- ✅ Need heatmaps or 3D views
- ✅ Mobile performance matters

## Troubleshooting

### "Mapbox Token Missing" Error

1. Check `.env.local` has `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
2. Token must start with `pk.`
3. Restart dev server after adding token

### Map Not Loading

1. Check browser console for errors
2. Verify token is valid at [Mapbox Dashboard](https://account.mapbox.com/)
3. Check token permissions include "Public scopes"

### Performance Issues

- Leaflet: Reduce zoom level or property count
- Mapbox: Check network tab for tile loading issues

## Next Steps

1. **Get Mapbox token** from [account.mapbox.com](https://account.mapbox.com/access-tokens/)
2. **Add to `.env.local`**
3. **Restart server**
4. **Toggle to Mapbox** and see the difference!

## Future Enhancements

- [ ] Mapbox boundary drawing
- [ ] Property value heatmaps
- [ ] 3D building visualization
- [ ] Custom map styles (dark mode, satellite)
- [ ] Property clustering
- [ ] Animation between properties
- [ ] Terrain visualization

---

**Recommendation**: Start with Leaflet for MVP, switch to Mapbox when you have paying customers or need advanced features.
