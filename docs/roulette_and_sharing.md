# Roulette and Protected Shareable Links

## Overview

The Roulette feature helps groups and solo travelers overcome decision fatigue by randomly selecting either a place or a trip with customizable weights.

Admins can also generate a secure, protected shareable link for friends or travel companions to spin the wheel.

---

## Features

1. **Two Distinct Roulette Modes**:
   - **Places Roulette**: Candidates are populated from the places catalog (e.g. deciding which restaurant or mall to visit).
   - **Trips Roulette**: Candidates are populated from planned trips (e.g. deciding which weekend itinerary to embark on).

2. **Weighted Random Selection**:
   - Each candidate item in the roulette has an assigned weight (e.g. 1 to 10).
   - Selection probability is strictly proportional to weight:
     $$P(item_i) = \frac{w_i}{\sum_{k=1}^N w_k}$$
   - When spun, the backend performs cryptographic or pseudo-random selection against the total weight sum.

3. **Interactive Visual Wheel**:
   - Canvas-based spinning wheel with color-coded slices sized proportionally to each item's weight.
   - Smooth deceleration animation that lands on the winning slice chosen by the server.
   - Celebratory confetti animation upon landing.

4. **Protected Shareable Links**:
   - Shareable link structure:
     ```
     https://your-trippy.pages.dev/roulette/share/?id=rou_12345
     ```
   - Two protection mechanisms:
     - **Google Sign-In Protection**: Only email addresses listed in the roulette's `allowed_emails` list (plus the owner and admins) can access and execute the roulette.
     - **Static Password / Token Protection**: Any guest who possesses the link and enters the static passcode can spin the roulette.

5. **Action Confirmation Modals**:
   - Creating, updating, and deleting roulettes requires explicit confirmation.

---

## API Reference

### Admin Endpoints
| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/api/roulettes` | `roulette:read` | List all roulette configurations |
| `GET` | `/api/roulettes/:id` | `roulette:read` | Get specific roulette details |
| `POST` | `/api/roulettes` | `roulette:create` | Create new roulette config |
| `PUT` | `/api/roulettes/:id` | `roulette:update` | Update items, weights, and protection |
| `DELETE` | `/api/roulettes/:id` | `roulette:delete` | Delete roulette config |
| `POST` | `/api/roulettes/:id/spin` | `roulette:spin` | Execute admin spin |

### Public / Protected Shared Link Endpoints
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/roulettes/share/:id` | Google Token OR Passcode | Fetch shared roulette (sanitized items) |
| `POST` | `/api/roulettes/share/:id/spin` | Google Token OR Passcode | Spin shared roulette & record audit |
