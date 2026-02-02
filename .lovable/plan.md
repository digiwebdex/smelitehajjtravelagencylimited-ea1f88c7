

# Hotel Bookings - Separate Page Implementation

## Problem
Currently, when clicking "Hotel Bookings" from the services section on the home page, the hotel selection wizard appears as a full-screen overlay on top of the home page content. The user wants the hotel booking experience to open on its own dedicated page with a proper URL route.

## Solution
Create a dedicated `/hotels` page route that displays the hotel selection wizard as a standalone page, with proper navigation back to the home page.

## Changes Required

### 1. Create New Hotels Page
Create a new page component at `src/pages/Hotels.tsx` that:
- Includes the Header component for consistent navigation
- Renders the hotel selection wizard content
- Uses a "Back to Home" navigation instead of a close button
- Has a proper page layout (not an overlay)

### 2. Convert HotelSection to Page-Based Component
Modify `src/components/HotelSection.tsx` to:
- Remove the fixed overlay styling (`fixed inset-0 z-50`)
- Convert to a regular page section layout
- Replace the close button (X) with a "Back to Home" link
- Keep all the multi-step wizard logic intact

### 3. Update ServicesOverview Navigation
Modify `src/components/ServicesOverview.tsx` to:
- Remove the `hotelSectionOpen` state and overlay rendering
- Navigate to `/hotels` route when clicking the Hotel service
- Use React Router's `useNavigate` hook for navigation

### 4. Add Route to App.tsx
Add a new route `/hotels` that renders the Hotels page.

## Technical Details

### Files to Create
- `src/pages/Hotels.tsx` - New dedicated page for hotel bookings

### Files to Modify
- `src/App.tsx` - Add `/hotels` route
- `src/components/ServicesOverview.tsx` - Change from overlay to navigation
- `src/components/HotelSection.tsx` - Convert from overlay to page content

### Navigation Flow
```text
Home (/) → Click "Hotel Bookings" → Navigate to /hotels
Hotels (/hotels) → Click "Back to Home" → Navigate to /
```

## User Experience Improvements
- Proper browser history - users can use back/forward buttons
- Bookmarkable URL for the hotels page
- Cleaner separation between home page and hotel booking
- Better mobile experience without overlay z-index issues

