# Setup and System Initialization

## Overview

The Trippy application includes a specialized one-time `/setup` endpoint designed to bootstrap the system, register the initial System Owner, and initialize required database permissions.

To prevent unauthorized takeover, the setup endpoint is **strictly locked** once the system is initialized.

---

## Behavior & Security

1. **Access Condition**:
   - The `/setup` endpoint (`GET /api/setup/status` and `POST /api/setup`) is **only accessible if the database is uninitialized** (no owner registered).
   - Once an owner is established in the `system_settings` table, any subsequent requests to `/api/setup` will return `403 Forbidden` (`Setup already completed`).

2. **Initialization Workflow**:
   - The user visits the `/setup` page in the browser.
   - The frontend queries `/api/setup/status`:
     - If initialized: Immediately displays a locked state banner and redirects to `/login`.
     - If uninitialized: Prompts the user to enter their Gmail address.
   - Upon submitting:
     1. Creates the default Administrator role (`role_admin`) with wildcard permissions `["*"]`.
     2. Assigns the submitted Gmail address to `role_admin` in `role_members`.
     3. Stores the setup state in `system_settings` with key `setup_status`:
        ```json
        {
          "initialized": true,
          "owner_email": "owner@gmail.com",
          "installed_at": "2026-10-16T12:00:00Z"
        }
        ```
     4. Permanently locks the setup endpoint.

---

## API Endpoints

### 1. Check Setup Status
- **Method**: `GET`
- **Path**: `/api/setup/status`
- **Auth**: Public
- **Response**:
  ```json
  {
    "isInitialized": false
  }
  ```
  *(If initialized, returns `isInitialized: true` and `ownerEmail`)*.

### 2. Run Setup
- **Method**: `POST`
- **Path**: `/api/setup`
- **Auth**: Public (only while uninitialized)
- **Request Body**:
  ```json
  {
    "ownerEmail": "admin@gmail.com"
  }
  ```
- **Response** (HTTP 201):
  ```json
  {
    "success": true,
    "message": "System successfully initialized. Owner registered.",
    "status": {
      "isInitialized": true,
      "ownerEmail": "admin@gmail.com",
      "installedAt": "2026-10-16T12:00:00Z"
    }
  }
  ```
