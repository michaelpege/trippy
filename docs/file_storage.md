# Static File Storage (Supabase Storage)

## Overview

Trippy allows attaching zero to many static files to any place (e.g. photos, menus, brochures, tickets, maps).

Files are stored in a free-tier Supabase Storage bucket and publicly accessible via high-performance CDN URLs.

---

## Storage Architecture

1. **Bucket Configuration**:
   - Bucket name: `trippy-files` (configurable via `SUPABASE_STORAGE_BUCKET`).
   - Access: Public read access enabled.
   - Quota: Supabase free tier includes up to **1 GB** of free storage.

2. **Upload Process**:
   - User selects file(s) in `PlaceFormModal`.
   - The browser sends `multipart/form-data` or JSON base64 to `/api/storage/upload` on the Cloudflare Worker.
   - The worker sanitizes the filename and uploads the binary stream to Supabase Storage:
     ```
     places/{timestamp}_{sanitizedFileName}
     ```
   - Supabase returns the public URL:
     ```
     https://{projectId}.supabase.co/storage/v1/object/public/trippy-files/places/...
     ```
   - The file object is saved in the place's `files` JSON array:
     ```json
     {
       "id": "file_1729000_abc",
       "name": "restaurant_menu.pdf",
       "url": "https://xyz.supabase.co/storage/...",
       "path": "places/1729000_restaurant_menu.pdf",
       "size": 154200,
       "mime_type": "application/pdf",
       "uploaded_at": "2026-10-16T12:00:00Z"
     }
     ```

3. **Preview & Download**:
   - Image files (`image/png`, `image/jpeg`, etc.) are rendered as preview thumbnails in place cards.
   - Documents and PDFs display icon badges and direct download/preview links.
