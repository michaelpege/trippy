# Places Management

## Overview

The Places module is the foundation of Trippy, allowing admins and trip planners to catalog interesting spots, culinary locations, shopping centers, and public parks.

---

## Features

1. **Place Categorization**:
   - Each place is categorized into one of 4 defined types:
     - `Restaurant`: Dining spots, cafes, street food vendors.
     - `Mall`: Shopping destinations and department stores.
     - `Public spaces`: Parks, plazas, monuments, open areas.
     - `other`: Specialized activities, museums, landmarks.

2. **Static File Attachments**:
   - A place can hold zero to many static files (photos, menus, PDF guides, tickets).
   - Files are uploaded directly to Supabase Storage free-tier bucket (`trippy-files`) via the backend proxy `/api/storage/upload`.
   - File metadata (URL, file size, MIME type, upload timestamp) is saved in the place row.

3. **Google Maps Integration & Routing**:
   - When a place has latitude & longitude coordinates (or address/name), clicking **Directions** generates a direct Google Maps navigation URL starting from the user's current GPS location:
     ```
     https://www.google.com/maps/dir/?api=1&origin={userLat},{userLng}&destination={destLat},{destLng}&travelmode=driving
     ```
   - Includes real-time calculation of:
     - **Distance in km** (calculated using Haversine formula)
     - **Estimated duration by Car** (in minutes)
     - **Estimated duration by Motorcycle** (in minutes)

4. **Action Confirmation Modals**:
   - Every Create, Update, and Delete operation triggers an explicit confirmation modal before mutating data in Supabase.

---

## API Reference

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/api/places` | `places:read` | List places with optional `?type=` and `?q=` |
| `GET` | `/api/places/:id` | `places:read` | Get single place details |
| `POST` | `/api/places` | `places:create` | Create new place |
| `PUT` | `/api/places/:id` | `places:update` | Update place details or attachments |
| `DELETE` | `/api/places/:id` | `places:delete` | Delete place |
| `POST` | `/api/storage/upload` | `places:create` | Upload static file to Supabase storage |
