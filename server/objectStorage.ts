import { createClient } from "@supabase/supabase-js";
import { Response } from "express";
import { randomUUID } from "crypto";

const BUCKET = "famvoy-uploads";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return createClient(url, key);
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export interface StorageFile {
  path: string;
}

export class ObjectStorageService {
  private supabase = getSupabaseAdmin();

  async getObjectEntityUploadURL(): Promise<string> {
    const objectId = randomUUID();
    const path = `uploads/${objectId}`;

    const { data, error } = await this.supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);

    if (error || !data) {
      throw new Error(`Failed to create upload URL: ${error?.message}`);
    }

    return data.signedUrl;
  }

  async getObjectEntityFile(objectPath: string): Promise<StorageFile> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    // objectPath is like "/objects/uploads/<uuid>" → storage path is "uploads/<uuid>"
    const storagePath = parts.slice(1).join("/");

    // Verify the file exists by attempting to get its metadata
    const { data, error } = await this.supabase.storage
      .from(BUCKET)
      .download(storagePath);

    if (error || !data) {
      throw new ObjectNotFoundError();
    }

    return { path: storagePath };
  }

  normalizeObjectEntityPath(rawUrl: string): string {
    // Supabase signed upload URLs contain the bucket and path in the URL
    // Extract the storage path from the URL
    try {
      const url = new URL(rawUrl);
      // Supabase storage URLs look like:
      // https://<project>.supabase.co/storage/v1/object/sign/<bucket>/<path>?token=...
      // or upload URLs like:
      // https://<project>.supabase.co/storage/v1/upload/sign/<bucket>/<path>?token=...
      const pathname = url.pathname;

      // Match paths like /storage/v1/object/sign/famvoy-uploads/uploads/<uuid>
      // or /storage/v1/upload/sign/famvoy-uploads/uploads/<uuid>
      const bucketPattern = new RegExp(`/storage/v1/(?:object|upload)/sign(?:ed-url)?/${BUCKET}/(.+)`);
      const match = pathname.match(bucketPattern);

      if (match) {
        return `/objects/${match[1]}`;
      }

      // Fallback: try to find uploads/<uuid> pattern directly
      const uploadsMatch = pathname.match(/(uploads\/[a-f0-9-]+)/);
      if (uploadsMatch) {
        return `/objects/${uploadsMatch[1]}`;
      }

      throw new Error("Could not extract path from upload URL");
    } catch (e) {
      if (e instanceof TypeError) {
        throw new Error("Invalid upload URL");
      }
      throw e;
    }
  }

  async verifyObjectExists(objectPath: string): Promise<boolean> {
    try {
      await this.getObjectEntityFile(objectPath);
      return true;
    } catch {
      return false;
    }
  }

  async downloadObject(file: StorageFile, res: Response, cacheTtlSec: number = 3600) {
    try {
      const { data, error } = await this.supabase.storage
        .from(BUCKET)
        .download(file.path);

      if (error || !data) {
        throw new Error(`Download failed: ${error?.message}`);
      }

      const buffer = Buffer.from(await data.arrayBuffer());

      res.set({
        "Content-Type": data.type || "application/octet-stream",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": `public, max-age=${cacheTtlSec}`,
      });

      res.send(buffer);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }
}
