/**
 * Storage Handler
 *
 * Handles file uploads to Supabase Storage free-tier bucket.
 * Stores static files and generates permanent public URLs.
 */

import { getSupabaseClient } from '../client/supabase_client';
import { jsonResponse, errorResponse } from '../middleware/cors';
import type { Env, CorsConfig, PlaceFile } from '../types';

export class StorageHandler {
  /**
   * POST /api/storage/upload
   * Supports multipart/form-data or JSON payload { fileName, fileType, fileBase64 }
   */
  async uploadFile(request: Request, env: Env, corsConfig: CorsConfig): Promise<Response> {
    try {
      const supabase = getSupabaseClient(env);
      const bucketName = env.SUPABASE_STORAGE_BUCKET || 'trippy-files';

      // Ensure bucket exists
      try {
        await supabase.storage.createBucket(bucketName, { public: true });
      } catch {
        // Bucket might already exist, continue
      }

      const contentType = request.headers.get('Content-Type') || '';

      let fileBuffer: ArrayBuffer;
      let fileName = 'upload.bin';
      let fileType = 'application/octet-stream';
      let fileSize = 0;

      if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        const fileEntry = formData.get('file');

        if (!fileEntry || typeof fileEntry === 'string') {
          return errorResponse('No file provided in form data', 400, corsConfig);
        }

        const file = fileEntry as File;
        fileName = file.name;
        fileType = file.type || 'application/octet-stream';
        fileSize = file.size;
        fileBuffer = await file.arrayBuffer();
      } else if (contentType.includes('application/json')) {
        const body = (await request.json().catch(() => null)) as {
          fileName?: string;
          fileType?: string;
          fileBase64?: string;
        };

        if (!body || !body.fileBase64) {
          return errorResponse('Missing "fileBase64" in request body', 400, corsConfig);
        }

        fileName = body.fileName || `file_${Date.now()}`;
        fileType = body.fileType || 'application/octet-stream';

        // Decode base64
        const binaryStr = atob(body.fileBase64.replace(/^data:.*?;base64,/, ''));
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        fileBuffer = bytes.buffer;
        fileSize = len;
      } else {
        return errorResponse('Unsupported Content-Type. Use multipart/form-data or application/json', 400, corsConfig);
      }

      const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `places/${Date.now()}_${cleanName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, fileBuffer, {
          contentType: fileType,
          upsert: true,
        });

      if (uploadError) {
        console.error('Supabase storage upload error:', uploadError);
        return errorResponse(`Storage upload failed: ${uploadError.message}`, 500, corsConfig);
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(storagePath);

      const uploadedFile: PlaceFile = {
        id: `file_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
        name: fileName,
        url: publicUrlData.publicUrl,
        path: storagePath,
        size: fileSize,
        mime_type: fileType,
        uploaded_at: new Date().toISOString(),
      };

      return jsonResponse({ file: uploadedFile, message: 'File uploaded successfully' }, 201, corsConfig);
    } catch (err) {
      console.error('Storage handler error:', err);
      return errorResponse(err instanceof Error ? err.message : 'Upload failed', 500, corsConfig);
    }
  }
}
