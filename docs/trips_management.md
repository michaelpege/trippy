# Trips Management

## Overview

The Trips module enables admins to assemble multi-day or single-day itineraries composed of zero to many places.

---

## Features

1. **Zero to Many Places**:
   - A trip can contain no places (e.g. brainstorming stage) or many places.
   - Places are maintained in an ordered sequence (`order_index`) via the junction table `trip_places`.

2. **Itinerary Scheduling & Annotations**:
   - Each place in the trip can have an optional scheduled visit time (e.g. `09:30 AM`) and custom notes (e.g. `Book VIP booth in advance`).

3. **Reordering Places**:
   - Up and Down controls allow reorganizing stops in the itinerary.

4. **Multi-Stop Google Maps Route Generation**:
   - The UI automatically builds a multi-waypoint Google Maps route linking all places in the trip:
     ```
     https://www.google.com/maps/dir/?api=1&origin={firstPlace}&destination={lastPlace}&waypoints={middlePlaces}&travelmode=driving
     ```

5. **Action Confirmation Modals**:
   - Creating, editing, and deleting trips requires confirmation via the `ConfirmModal`.

---

## Database Architecture

- `trips`: Stores high-level trip metadata (`name`, `description`, `start_date`, `end_date`, `created_by`).
- `trip_places`: Normalized junction table referencing `trips.id` and `places.id` with `order_index`, `visit_time`, and `notes`. Foreign key constraints are configured with `ON DELETE CASCADE`.

---

## API Reference

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/api/trips` | `trips:read` | List all trips and their associated places |
| `GET` | `/api/trips/:id` | `trips:read` | Get specific trip with places |
| `POST` | `/api/trips` | `trips:create` | Create a new trip itinerary |
| `PUT` | `/api/trips/:id` | `trips:update` | Edit trip details and sync places order |
| `DELETE` | `/api/trips/:id` | `trips:delete` | Delete trip (cascade deletes junction rows) |
