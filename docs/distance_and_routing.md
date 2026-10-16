# Distance Calculation & Google Maps Routing

## Overview

A core feature of Trippy is seamless navigation from the user's current GPS location to any planned place or itinerary.

---

## 1-Click Directions Link

When a user clicks the **Directions** button on a place card or itinerary item:
1. If the user has granted browser Geolocation permission:
   - The app reads `navigator.geolocation.getCurrentPosition`.
   - Google Maps is opened with both origin and destination coordinates:
     ```
     https://www.google.com/maps/dir/?api=1&origin={userLat},{userLng}&destination={destLat},{destLng}&travelmode=driving
     ```
2. If coordinates are not yet set or location permission is denied:
   - Uses the destination query fallback:
     ```
     https://www.google.com/maps/dir/?api=1&destination={encodedAddressOrName}&travelmode=driving
     ```
   - Google Maps automatically prompts to use "Your Location" as the starting point.

---

## Real-Time Distance & Duration Estimation

For places with latitude and longitude:

### 1. Haversine Formula (Great-Circle Distance)
Calculates exact surface distance between current coordinates $(lat_1, lon_1)$ and target coordinates $(lat_2, lon_2)$:
$$a = \sin^2\left(\frac{\Delta lat}{2}\right) + \cos(lat_1) \cdot \cos(lat_2) \cdot \sin^2\left(\frac{\Delta lon}{2}\right)$$
$$c = 2 \cdot \text{atan2}(\sqrt{a}, \sqrt{1-a})$$
$$d = R \cdot c \quad (\text{where } R = 6371\text{ km})$$

### 2. Calibrated Travel Time Model
- **Car Travel Time**:
  - Distance $< 10\text{ km}$: Estimated average urban speed of $28\text{--}30\text{ km/h}$.
  - Distance $10\text{--}30\text{ km}$: Estimated mixed arterial speed of $45\text{ km/h}$.
  - Distance $> 30\text{ km}$: Estimated highway speed of $65\text{ km/h}$.
  - Includes a 3-minute traffic and parking buffer.
- **Motorcycle Travel Time**:
  - Accounts for lane filtering in dense urban traffic, providing ~15–25% faster transit times in congested zones (e.g. $36\text{--}38\text{ km/h}$ for short distances).

### Visual UI Badge
The `DistanceBadge` displays:
```
[ 📍 4.2 km | 🚗 11 min | 🏍️ 8 min ] [ 🧭 Directions ↗ ]
```
Zero third-party API subscription costs are incurred for distance estimations!
