# Role-Based Access Control (RBAC) & Authentication

## Overview

Trippy enforces a robust Role-Based Access Control (RBAC) system combined with Google OAuth (Google Identity Services GIS).

Only accounts explicitly listed in database roles plus the registered System Owner are permitted to authenticate and access admin endpoints.

---

## Architecture & Concepts

### 1. System Owner
- Registered during the one-time `/setup` process.
- Automatically receives wildcard super-admin privileges (`*`) across all routes and resources.
- Owner status is persisted in the `system_settings` table.

### 2. Roles & Permissions
- Roles define named sets of permissions (e.g. `Trip Coordinator`, `Curator`, `Auditor`).
- Available permissions:
  - `*`: Super Admin access to all system routes.
  - `places:read`, `places:create`, `places:update`, `places:delete`: Places management.
  - `trips:read`, `trips:create`, `trips:update`, `trips:delete`: Trips management.
  - `roulette:read`, `roulette:create`, `roulette:update`, `roulette:delete`, `roulette:spin`: Roulette configuration and execution.
  - `settings:rbac:read`, `settings:rbac:manage`: RBAC and role assignments.

### 3. Multi-Role Assignment
- An email address can be assigned to multiple roles simultaneously.
- When an authenticated user makes a request, the middleware resolves all roles mapped to their email address in the `role_members` table and computes the merged union of all permissions.
- If any role grants the required permission (or `*`), the request is authorized.

### 4. Edge Middleware Protection
Every protected route passes through `withPermission(request, env, corsConfig, requiredPermission, handler)`:
1. Validates the `Authorization: Bearer <google_id_token>` header.
2. Verifies token authenticity against Google's tokeninfo endpoint (`https://oauth2.googleapis.com/tokeninfo`).
3. Queries Supabase to fetch user roles and calculate active permissions.
4. If user has no assigned roles and is not the owner: returns `403 Forbidden` (`Access denied: No role assigned to your account`).
5. If user lacks the specific required permission: returns `403 Forbidden` (`Missing required permission`).

---

## Confirmation Modals for RBAC
Creating a role, editing a role, or deleting a role all trigger an action confirmation modal before the mutation is executed.

---

## API Reference

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/api/rbac/me` | Authenticated | Retrieve authenticated user profile, roles, and permissions |
| `GET` | `/api/rbac/permissions` | Authenticated | List all permission definitions in the system |
| `GET` | `/api/rbac/roles` | `settings:rbac:read` | List all roles with member emails |
| `GET` | `/api/rbac/roles/:id` | `settings:rbac:read` | Get single role details |
| `POST` | `/api/rbac/roles` | `settings:rbac:manage` | Create new role with permissions and emails |
| `PUT` | `/api/rbac/roles/:id` | `settings:rbac:manage` | Update role permissions and overwrite member list |
| `DELETE` | `/api/rbac/roles/:id` | `settings:rbac:manage` | Delete role (cascades member assignments) |
