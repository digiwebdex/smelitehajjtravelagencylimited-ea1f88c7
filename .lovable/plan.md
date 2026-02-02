
# Hotel Booking Multi-Step Selection Flow

## Overview
Implementing an enhanced hotel booking experience with a multi-step wizard flow that guides users through: Country Selection → Star Category Selection → Hotel Listings.

## Current State
- The existing `HotelSection.tsx` uses tabs for Makkah/Madinah cities only
- Hotels are stored in the `hotels` table with `city`, `star_rating`, and other fields
- The current `city` field only supports "makkah" and "madinah" values

## Proposed Changes

### 1. Database Schema Update
Add a `country` column to the `hotels` table to support multiple countries (Saudi Arabia, Dubai, etc.):

- Add `country` column (text, default "Saudi Arabia") to `hotels` table
- Update existing hotels to have the default country value
- This allows hotels to be grouped by country first

### 2. Update Admin Hotels Management
Modify `AdminHotels.tsx` to:
- Add a country dropdown when creating/editing hotels
- Default options: "Saudi Arabia", "Dubai", "Malaysia", "Turkey" (configurable)
- Filter hotels by country in the admin table

### 3. Redesign HotelSection Component
Replace the current tab-based layout with a step-by-step wizard:

**Step 1 - Country Selection**
- Display country cards with flags/icons
- Fetch unique countries from the database
- Show hotel count per country

**Step 2 - Star Category Selection**
- Show 3/4/5 Star category cards
- Back button to return to countries
- Display hotel count per category

**Step 3 - Hotel Listings**
- Display hotels matching selected country + star rating
- Back button to return to categories
- Each hotel card shows: image, name, city, distance, facilities
- Book Now button triggers the existing booking modal

### 4. UI/UX Design
- Use animated transitions between steps (framer-motion)
- Consistent styling with the existing design system
- Mobile-responsive layout (grid cols adjust by screen size)
- Visual breadcrumb showing current step

## Technical Details

### Database Migration
```sql
ALTER TABLE hotels 
ADD COLUMN country TEXT DEFAULT 'Saudi Arabia';
```

### Component Structure
```text
HotelSection.tsx
├── Step 1: CountrySelector
│   └── CountryCard[] (clickable cards)
├── Step 2: CategorySelector
│   └── CategoryCard[] (3/4/5 Star options)
└── Step 3: HotelListings
    └── HotelCard[] (existing component)
```

### State Management
```typescript
const [step, setStep] = useState<1 | 2 | 3>(1);
const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
const [selectedStarRating, setSelectedStarRating] = useState<number | null>(null);
```

### Files to Modify
1. **Database**: Add migration for `country` column
2. **`src/components/HotelSection.tsx`**: Complete rewrite with step-based flow
3. **`src/components/admin/AdminHotels.tsx`**: Add country field in hotel form

## Visual Flow
```text
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Select Country │ ──▶ │ Select Category │ ──▶ │   Hotel List    │
│                 │     │                 │     │                 │
│ Saudi Arabia    │     │   ⭐⭐⭐ 3 Star   │     │ [Hotel Card 1]  │
│ Dubai           │     │   ⭐⭐⭐⭐ 4 Star  │     │ [Hotel Card 2]  │
│ Malaysia        │     │   ⭐⭐⭐⭐⭐ 5 Star │     │ [Book Now]      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                        ← Back                  ← Back
```

## Estimated Scope
- Database migration: 1 change
- Admin panel update: 1 file
- Hotel section rewrite: 1 file
- Total implementation: ~200-300 lines of code changes
