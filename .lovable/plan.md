
# Facebook Pixel & Conversions API Integration

## Overview

This plan implements a complete Facebook marketing tracking solution with:
- **Browser-side Facebook Pixel** - for immediate client-side event tracking
- **Server-side Conversions API** - for reliable server-to-Facebook event delivery
- **Event deduplication** - using unique `event_id` to prevent duplicate conversions
- **Admin configuration** - secure storage of credentials in the database
- **Test mode support** - for debugging without affecting live data

---

## Architecture

```text
+---------------------+       +------------------+       +----------------+
|   User Browser      |       |  Edge Function   |       |   Facebook     |
|   (Pixel/fbq)       |------>|  /api/fb-event   |------>|  Conversions   |
|   event_id: xyz     |       |  event_id: xyz   |       |  API           |
+---------------------+       +------------------+       +----------------+
         |                            |
         v                            v
   PageView, Purchase           Deduplication
   InitiateCheckout             (same event_id)
```

**Deduplication Flow**: Both browser and server send the same `event_id`, Facebook automatically deduplicates.

---

## What Will Be Implemented

### 1. Database Configuration Storage
Store Facebook settings securely in the existing `site_settings` table:
- **Pixel ID** - Your Facebook Pixel identifier (e.g., `1234567890`)
- **Access Token** - Server-side API token (securely stored)
- **Test Event Code** - Optional code for testing (e.g., `TEST12345`)
- **Enable/Disable Toggle** - Control tracking globally

### 2. Admin Settings UI (Analytics Tab)
Add a new "Facebook Pixel" section in Admin Settings > Analytics:
- Input field for Pixel ID
- Secure input for Access Token (masked)
- Test Event Code field
- Enable/disable toggle
- Instructions on how to obtain credentials
- Test mode indicator

### 3. Facebook Pixel Component (Browser-side)
Create `src/components/FacebookPixel.tsx`:
- Injects Facebook Pixel script dynamically
- Loads settings from database
- Tracks `PageView` on route changes
- Generates unique `event_id` for deduplication
- Only activates when enabled in settings

### 4. Facebook Tracking Hook
Create `src/hooks/useFacebookPixel.ts`:
- `trackPageView()` - Track page visits
- `trackInitiateCheckout()` - When booking modal opens
- `trackPurchase()` - When booking is completed
- `trackViewContent()` - When viewing package details
- All events include `event_id` for deduplication

### 5. Edge Function for Conversions API
Create `supabase/functions/fb-event/index.ts`:
- Receives events from frontend
- Fetches Facebook credentials from database
- Sends events to Facebook Conversions API
- Includes user data hashing (email, phone)
- Supports test mode via Test Event Code
- Returns success/error response

### 6. Integration Points
Update existing components to track events:
- **PackageDetailsModal** - `ViewContent` event
- **BookingModal** - `InitiateCheckout` when opening
- **BookingConfirmation** - `Purchase` event
- **ContactSection** - `Lead` event (form submission)

---

## Technical Details

### Database Schema
Uses existing `site_settings` table with new key:
```
setting_key: 'facebook_pixel'
setting_value: {
  pixel_id: string,
  access_token: string,
  test_event_code: string,
  is_enabled: boolean
}
```

### Event Deduplication Strategy
```javascript
// Generate unique event ID
const eventId = `${eventName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Browser sends with Pixel
fbq('track', 'Purchase', {value: 100}, {eventID: eventId});

// Server sends same eventId to Conversions API
// Facebook deduplicates automatically
```

### Conversions API Payload Format
```javascript
{
  "data": [{
    "event_name": "Purchase",
    "event_time": 1706000000,
    "event_id": "Purchase_1706000000_abc123",
    "event_source_url": "https://yoursite.com/confirmation",
    "action_source": "website",
    "user_data": {
      "em": ["hashed_email"],
      "ph": ["hashed_phone"],
      "client_ip_address": "...",
      "client_user_agent": "...",
      "fbc": "fb cookie",
      "fbp": "fb browser id"
    },
    "custom_data": {
      "value": 150000,
      "currency": "BDT",
      "content_name": "Premium Hajj Package"
    }
  }],
  "test_event_code": "TEST12345" // Only in test mode
}
```

### Files to Create
1. `src/components/FacebookPixel.tsx` - Browser pixel component
2. `src/hooks/useFacebookPixel.ts` - Tracking functions hook
3. `supabase/functions/fb-event/index.ts` - Server-side API

### Files to Modify
1. `src/components/admin/AdminSettings.tsx` - Add Facebook Pixel configuration UI
2. `src/App.tsx` - Add FacebookPixel component
3. `src/components/BookingModal.tsx` - Track InitiateCheckout
4. `src/pages/BookingConfirmation.tsx` - Track Purchase
5. `src/components/PackageDetailsModal.tsx` - Track ViewContent
6. `supabase/config.toml` - Register new edge function

---

## Security Considerations
- Access Token stored in database, never exposed to client
- Server-side API uses service role key to fetch credentials
- User data (email, phone) hashed with SHA-256 before sending
- Test mode isolated from production data

---

## How to Get Facebook Credentials
The admin UI will include instructions:
1. Go to Facebook Events Manager
2. Select your Pixel or create new one
3. Copy Pixel ID (numeric ID)
4. Generate Access Token via System User
5. Get Test Event Code from Test Events tab
