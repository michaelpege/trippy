# Immutable Audit Logging

## Overview

The user requirements mandate:
> *"The system should log every execution of the roulette in the database including the roulette result... Audit cannot be deleted."*

To guarantee that spin history and voting decisions cannot be tampered with or erased by anyone, Trippy enforces strict audit immutability across the database, edge worker middleware, and user interface.

---

## Logged Information

Every spin execution (whether executed by an admin in the dashboard or by a guest through a shared link) writes an immutable record to the `roulette_audit_logs` table containing:

- `id`: Unique audit log identifier (`aud_...`).
- `roulette_id`: Reference to the spun roulette.
- `roulette_title`: Snapshot of the title at time of spin.
- `type`: `trips` or `places`.
- `selected_item_id` & `selected_item_title`: The winning outcome.
- `candidate_pool`: Complete JSON snapshot of all candidate items and their weights at the moment of execution.
- `executed_by_type`: `google`, `token`, or `admin`.
- `executed_by_identifier`: User email (for Google Auth) or guest label with masked passcode (for token auth).
- `ip_address`: Client IP address (`CF-Connecting-IP` or `X-Forwarded-For`).
- `user_agent`: Client browser user agent string.
- `created_at`: ISO 8601 UTC timestamp.

---

## Immutability Enforcement (3 Layers of Defense)

### 1. Database-Level PostgreSQL Trigger
A strict PostgreSQL trigger function intercepts any `DELETE` or `UPDATE` operation on the table and aborts the transaction with an exception:

```sql
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable. Deletion and modification are strictly prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_delete ON roulette_audit_logs;
CREATE TRIGGER trg_prevent_audit_delete
    BEFORE DELETE OR UPDATE ON roulette_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_mutation();
```

Even direct SQL queries executed with service role privileges will fail if an attempt is made to delete or modify audit rows.

### 2. Edge Worker Middleware Defense
The Cloudflare Worker explicitly intercepts and rejects any mutation requests:
- Any `DELETE`, `PUT`, or `PATCH` request targeting `/api/audit` immediately returns `405 Method Not Allowed`.

### 3. Application UI
There are no delete buttons or mutation actions available on the `/roulette/audit` page.

---

## API Reference

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/api/audit` | `roulette:read` | List audit logs with pagination and `?roulette_id=` filter |
| `GET` | `/api/audit/:id` | `roulette:read` | Inspect details of a specific audit log |
| `DELETE` | `/api/audit/:id` | N/A | **Rejected (405 Method Not Allowed)** |
