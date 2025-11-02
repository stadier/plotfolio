# 🎯 Quick Start: Registering Land Boundaries

## 3 Simple Methods to Add Your Property Boundaries

---

## 🔥 Method 1: Upload Survey Document (Most Accurate)

```
1. Click property → 2. Find "Survey Documents" → 3. Upload file → 4. Done!
```

**Visual Flow:**
```
┌─────────────────┐
│  Select Plot    │
│  from Sidebar   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Property Detail │
│     Panel       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Survey Manager  │
│    Section      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Click "Upload   │
│ Survey Doc"     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Select PDF/IMG  │
│   file          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ AI Extracts     │
│ Boundaries      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ✅ Boundary     │
│ Shows on Map!   │
└─────────────────┘
```

**What Gets Extracted:**
- ✅ Corner Points (A, B, C, D)
- ✅ Distances between corners
- ✅ Plot area in sqm
- ✅ Survey reference number
- ✅ Surveyor information

---

## ✏️ Method 2: Draw Manually on Map (Interactive)

```
1. Select property → 2. Click "Draw Boundary" → 3. Click map points → 4. Save!
```

**Visual Flow:**
```
┌─────────────────┐
│  Select Plot    │
│  from Sidebar   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Map View Shows  │
│   Property      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Click "✏️ Draw  │
│   Boundary"     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Drawing Panel   │
│   Appears       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Click "Start    │
│   Drawing"      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Click Map to    │
│  Add Points     │  ← Repeat for each corner
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Drag Markers    │  ← Adjust positions
│  to Adjust      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Click "Save     │
│ Boundary"       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ✅ Boundary     │
│ Saved & Shown!  │
└─────────────────┘
```

**Interactive Controls:**

```
┌─────────────────────────────────┐
│   Manual Boundary Drawing       │
├─────────────────────────────────┤
│                                 │
│  Points Added: 4                │
│                                 │
│  [Start Drawing]                │
│  [Stop Drawing]                 │
│  [Undo Last Point]              │
│  [Clear All]                    │
│  [Save Boundary (4 points)]     │
│                                 │
│  Tips:                          │
│  • Add at least 3 points        │
│  • Drag markers to adjust       │
│  • Click Save when done         │
└─────────────────────────────────┘
```

---

## 🔌 Method 3: API Integration (For Developers)

```javascript
// POST to /api/properties/{id}/survey
const boundaryData = {
  coordinates: [
    { point: "A", lat: 9.0765, lng: 7.4951 },
    { point: "B", lat: 9.0770, lng: 7.4955 },
    { point: "C", lat: 9.0768, lng: 7.4960 },
    { point: "D", lat: 9.0763, lng: 7.4956 }
  ],
  boundaries: [
    { from: "A", to: "B", distance: 25.5 },
    { from: "B", to: "C", distance: 30.2 },
    { from: "C", to: "D", distance: 25.8 },
    { from: "D", to: "A", distance: 30.0 }
  ],
  area: 750,
  registrationNumber: "PLOT-1234/2024"
};

await fetch(`/api/properties/1/survey`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(boundaryData)
});
```

---

## 📊 Example: Typical Abuja Residential Plot

### Plot Specifications:
- **Location**: Maitama District, Abuja
- **Size**: 25m × 30m = 750 sqm
- **Corners**: 4 (A, B, C, D)
- **Shape**: Rectangle

### Boundary Points:
```
Point A: 9.0765°N, 7.4951°E  (Southwest corner)
Point B: 9.0770°N, 7.4951°E  (Northwest corner)
Point C: 9.0770°N, 7.4960°E  (Northeast corner)
Point D: 9.0765°N, 7.4960°E  (Southeast corner)
```

### Map Visualization:
```
         N
         ↑
         
    B ←────────→ C
    │            │
    │   750sqm   │ 30m
    │   Plot     │
    │            │
    A ←────────→ D
         25m
```

---

## 🎬 Step-by-Step Screenshots

### Survey Upload Method:

**Step 1: Property Selected**
```
┌───────────────────────────────────────────────────┐
│ Plotfolio                                         │
├───────────┬───────────────────────────────────────┤
│           │  Plot A47 - Maitama District         │
│ Sidebar   │  ─────────────────────────────────   │
│ with      │  Address: Plot A47, Maitama...       │
│ Properties│  Area: 800 sqm                        │
│           │  Status: [Owned]                      │
│ ✓ Plot A47│                                       │
│   Plot C23│  Survey Documents                     │
│   Plot B15│  ─────────────────────────────────   │
│           │  [Upload Survey Document]             │
│           │                                       │
└───────────┴───────────────────────────────────────┘
```

**Step 2: File Uploaded & Processing**
```
┌────────────────────────────────────────┐
│ Processing Survey Document...          │
│                                        │
│ 🔄 Extracting boundary data            │
│ 🔄 Analyzing corner points             │
│ 🔄 Calculating dimensions              │
│                                        │
│ Please wait...                         │
└────────────────────────────────────────┘
```

**Step 3: Boundaries Displayed**
```
┌──────────────────────────────────────────────────┐
│  Map View                    [Hide Boundaries]   │
├──────────────────────────────────────────────────┤
│                                                  │
│        B ●────────────● C                        │
│          │            │                          │
│          │   Plot A47 │                          │
│          │   800 sqm  │                          │
│          │            │                          │
│        A ●────────────● D                        │
│                                                  │
│  Legend: ● Corner Point  ──── Boundary Line     │
└──────────────────────────────────────────────────┘
```

### Manual Drawing Method:

**Step 1: Drawing Mode Active**
```
┌──────────────────────────────────────────────────┐
│  Map View          [✏️ Draw Boundary] [Hide...]  │
├──────────────────┬───────────────────────────────┤
│ Drawing Panel    │                               │
│ ─────────────    │      Click to add points      │
│ Points: 0        │           on map              │
│                  │                               │
│ [Start Drawing]  │         👆 Click here         │
│                  │                               │
└──────────────────┴───────────────────────────────┘
```

**Step 2: Adding Points**
```
┌──────────────────────────────────────────────────┐
│  Map View          [✏️ Draw Boundary] [Hide...]  │
├──────────────────┬───────────────────────────────┤
│ Drawing Panel    │                               │
│ ─────────────    │      ● 1                      │
│ Points: 4        │         ╲                     │
│                  │           ╲                   │
│ [Stop Drawing]   │             ● 2               │
│ [Undo Last]      │         ● 4   ╲               │
│ [Clear All]      │           ╲     ● 3           │
│ [Save (4 pts)]   │             ╲ ╱               │
│                  │               ●               │
└──────────────────┴───────────────────────────────┘
```

**Step 3: Saved Boundary**
```
┌──────────────────────────────────────────────────┐
│  Map View                    [Show Boundaries]   │
├──────────────────────────────────────────────────┤
│                                                  │
│        1 ●────────────● 2                        │
│          │            │                          │
│          │ Your Plot  │                          │
│          │  (saved)   │                          │
│          │            │                          │
│        4 ●────────────● 3                        │
│                                                  │
│  ✅ Boundary saved successfully!                 │
└──────────────────────────────────────────────────┘
```

---

## 💡 Pro Tips

### For Best Results:

**Survey Upload:**
- 📄 Use official survey plans
- 🎯 High resolution (300+ DPI)
- ✅ Clear, readable text
- 📏 Include scale/dimensions

**Manual Drawing:**
- 🔍 Zoom in before drawing
- 🛰️ Use satellite view
- 📍 Start from known corner
- ⭕ Go clockwise
- 💾 Save frequently

**API Integration:**
- ✔️ Validate coordinates
- 📊 Double-check area calculations
- 🔐 Handle authentication
- 🔄 Implement error handling

---

## ✅ Verification Checklist

After adding boundaries, verify:

- [ ] All corner points are visible on map
- [ ] Boundary lines connect correctly
- [ ] Area calculation looks reasonable
- [ ] Property details show survey data
- [ ] Boundaries toggle on/off works
- [ ] Data persists after page reload

---

## 🆘 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Boundary not showing | Toggle "Show Boundaries" button |
| Can't upload file | Check file format (PDF, JPG, PNG, SVG) |
| Drawing won't save | Need minimum 3 points |
| Points in wrong place | Drag markers to adjust position |
| API returns 404 | Check property ID exists |
| Database error | Verify MongoDB connection |

---

## 📞 Need More Help?

See the full guide: `BOUNDARY_REGISTRATION_GUIDE.md`

Or check the implementation files:
- Survey Upload: `/src/components/survey/SurveyUpload.tsx`
- Manual Drawing: `/src/components/maps/ManualBoundaryDrawer.tsx`
- API Routes: `/src/app/api/properties/[id]/survey/route.ts`
