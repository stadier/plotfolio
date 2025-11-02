# 🗺️ Land Boundary Registration Guide

## How to Register Your Land Boundaries in Plotfolio

There are **THREE methods** to register land boundaries in the Plotfolio application:

---

## Method 1: Upload Survey Documents (Recommended) ✅

This is the **most accurate method** for Nigerian land plots as it uses official survey documents.

### Steps:

1. **Select Your Property**
   - Click on any property from the sidebar
   - The property details will appear in the left panel

2. **Navigate to Survey Section**
   - Scroll down to the "Survey Documents" section in the property detail card
   - Look for the upload area

3. **Upload Your Survey Document**
   - Click "Upload Survey Document" button
   - Select your survey plan file (PDF, JPG, PNG, or SVG)
   - Supported files: Official survey plans, cadastral maps, plot plans

4. **Automatic Processing**
   - The system will automatically extract:
     - Corner coordinates (A, B, C, D points)
     - Boundary lines with distances
     - Plot dimensions and bearings
     - Survey reference number
     - Surveyor information

5. **View on Map**
   - The extracted boundary will automatically appear on the map
   - Custom boundary lines will show the exact plot shape
   - Corner markers will be labeled (A, B, C, D, etc.)

### What You Need:
- Official survey document from a licensed surveyor
- Document showing plot coordinates or boundary points
- Clear survey plan with readable text

---

## Method 2: Manual Boundary Drawing 🆕

Draw your boundaries directly on the interactive map by clicking points.

### Steps:

1. **Select Your Property**
   - Choose a property from the sidebar

2. **Enable Drawing Mode**
   - Click the "✏️ Draw Boundary" button in the map header
   - A drawing panel will appear on the left side of the map

3. **Start Drawing**
   - Click "Start Drawing" button
   - Click on the map to add boundary points
   - Each click adds a corner point to your boundary
   - Points are numbered automatically (1, 2, 3, etc.)

4. **Adjust Points**
   - Drag any marker to adjust its position
   - The boundary line updates automatically
   - Use "Undo Last Point" to remove mistakes

5. **Complete the Boundary**
   - Add at least 3 points to create a valid boundary
   - The system connects points automatically
   - Area is calculated using the Shoelace formula

6. **Save Boundary**
   - Click "Save Boundary" when finished
   - The boundary is saved to the database
   - It appears on the map with your property

### Controls Available:
- **Start Drawing**: Begin adding points
- **Stop Drawing**: Pause point addition
- **Undo Last Point**: Remove the most recent point
- **Clear All**: Delete all points and start over
- **Save Boundary**: Save to database (requires 3+ points)

### Tips:
- Zoom in for better accuracy
- Start from one corner and go clockwise
- Click close to the actual property edges
- Drag markers to fine-tune positions
- Save frequently to avoid losing work

---

## Method 3: API Integration (For Developers)

Use the REST API to programmatically add boundaries from external systems.

### API Endpoint:
```
POST /api/properties/{propertyId}/survey
```

### Request Body:
```json
{
  "coordinates": [
    { "point": "A", "lat": 9.0765, "lng": 7.4951 },
    { "point": "B", "lat": 9.0770, "lng": 7.4955 },
    { "point": "C", "lat": 9.0768, "lng": 7.4960 },
    { "point": "D", "lat": 9.0763, "lng": 7.4956 }
  ],
  "boundaries": [
    { "from": "A", "to": "B", "distance": 25.5 },
    { "from": "B", "to": "C", "distance": 30.2 },
    { "from": "C", "to": "D", "distance": 25.8 },
    { "from": "D", "to": "A", "distance": 30.0 }
  ],
  "area": 750,
  "registrationNumber": "PLOT-1234/2024",
  "surveyDate": "2024-01-15",
  "surveyor": "John Doe & Associates"
}
```

### Example using cURL:
```bash
curl -X POST http://localhost:3000/api/properties/1/survey \
  -H "Content-Type: application/json" \
  -d '{
    "coordinates": [...],
    "boundaries": [...],
    "area": 750
  }'
```

### Example using JavaScript:
```javascript
const response = await fetch('/api/properties/1/survey', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    coordinates: [...],
    boundaries: [...],
    area: 750
  })
});
```

---

## Understanding Boundary Data

### Coordinates Format:
Each corner point needs:
- **point**: Label (A, B, C, D, etc.)
- **lat**: Latitude (decimal degrees)
- **lng**: Longitude (decimal degrees)

### Boundaries Format:
Each boundary line needs:
- **from**: Starting point label
- **to**: Ending point label
- **distance**: Length in meters
- **bearing**: Direction in degrees (optional)

### Example Nigerian Plot:
For a 25m × 30m rectangular plot in Abuja:
- 4 corner points (A, B, C, D)
- 4 boundary lines (AB, BC, CD, DA)
- Total area: 750 sqm
- Coordinates in decimal degrees

---

## Best Practices

### For Survey Documents:
✅ Use official survey plans from licensed surveyors
✅ Ensure documents are clear and readable
✅ Include survey reference numbers
✅ Upload high-resolution images (300 DPI+)

### For Manual Drawing:
✅ Zoom in to street level before drawing
✅ Use satellite view for accuracy
✅ Match visible property boundaries
✅ Verify corners against known landmarks
✅ Double-check before saving

### For API Integration:
✅ Validate coordinates before submission
✅ Use decimal degrees (not DMS format)
✅ Calculate area accurately
✅ Include all required fields
✅ Handle errors appropriately

---

## Troubleshooting

### Boundary Not Showing on Map?
1. Check if "Show Boundaries" is enabled
2. Verify survey data was saved successfully
3. Zoom to the property location
4. Refresh the page

### Can't Save Manual Boundary?
1. Ensure you have at least 3 points
2. Check that the property is selected
3. Verify points form a valid polygon
4. Try clearing and redrawing

### Survey Upload Failed?
1. Check file format (PDF, JPG, PNG, SVG)
2. Ensure file size is under 10MB
3. Verify file is not corrupted
4. Try a different file format

---

## Need Help?

- Check the property detail card for survey status
- Use browser console (F12) to see errors
- Verify MongoDB connection is working
- Check API endpoints are responding

---

## Summary Comparison

| Method | Accuracy | Ease of Use | Best For |
|--------|----------|-------------|----------|
| Survey Upload | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Official plots with documents |
| Manual Drawing | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Quick marking, visual plots |
| API Integration | ⭐⭐⭐⭐⭐ | ⭐⭐ | Bulk imports, automation |

**Recommendation**: Use survey upload for official records, manual drawing for quick visualization, and API for system integration.
