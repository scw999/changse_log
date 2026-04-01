import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isInternalIngestConfigured } from "@/lib/supabase/env";
import {
  getOwnedArchiveRecord,
  isAuthorizedInternalRequest,
  listOwnedRecordImages,
  serializeInternalError,
} from "@/lib/internal-auth";

const BUCKET = "record-images";
const IMAGES_TABLE = "archive_record_images";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ id: string }> }>,
) {
  if (!isInternalIngestConfigured()) {
    return NextResponse.json({ error: "internal_ingest_not_configured" }, { status: 503 });
  }

  if (!isAuthorizedInternalRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const { ownerId, record } = await getOwnedArchiveRecord(id);

    if (!record) {
      return NextResponse.json({ error: "record_not_found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `file_too_large: max ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 },
      );
    }

    if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `unsupported_file_type: ${file.type}` },
        { status: 400 },
      );
    }

    const caption = toOptionalString(formData.get("caption"));
    const altText = toOptionalString(formData.get("alt_text"));
    const isPrimary = toOptionalBoolean(formData.get("is_primary"));
    const sortOrder = Number(formData.get("sort_order") ?? "0");
    const safeName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const storagePath = `${ownerId}/${id}/${safeName}`;
    const admin = createSupabaseAdminClient();
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, arrayBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    if (isPrimary) {
      const { error: resetPrimaryError } = await admin
        .from(IMAGES_TABLE)
        .update({ is_primary: false })
        .eq("record_id", id)
        .eq("owner_id", ownerId);

      if (resetPrimaryError) {
        throw resetPrimaryError;
      }
    }

    const { data, error } = await admin
      .from(IMAGES_TABLE)
      .insert({
        record_id: id,
        owner_id: ownerId,
        storage_path: storagePath,
        caption: caption ?? "",
        alt_text: altText ?? "",
        is_primary: isPrimary ?? false,
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(storagePath, 60 * 60);

    return NextResponse.json({
      ok: true,
      image: {
        id: data.id,
        recordId: id,
        url: signed?.signedUrl ?? "",
        storagePath: data.storage_path,
        caption: data.caption ?? undefined,
        altText: data.alt_text ?? undefined,
        sortOrder: data.sort_order,
        isPrimary: data.is_primary,
        createdAt: data.created_at,
      },
    });
  } catch (error) {
    const details = serializeInternalError(error);
    console.error("internal image attach failed", details);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "internal_image_attach_failed",
        details,
      },
      { status: 400 },
    );
  }
}

type BulkImagePatch = {
  id: string;
  caption?: string;
  altText?: string;
};

export async function PATCH(
  request: Request,
  context: Readonly<{ params: Promise<{ id: string }> }>,
) {
  if (!isInternalIngestConfigured()) {
    return NextResponse.json({ error: "internal_ingest_not_configured" }, { status: 503 });
  }

  if (!isAuthorizedInternalRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const { ownerId, record } = await getOwnedArchiveRecord(id);

    if (!record) {
      return NextResponse.json({ error: "record_not_found" }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const patches = parseBulkPatches(body);

    if (patches.length === 0) {
      return NextResponse.json({ error: "images array must not be empty" }, { status: 400 });
    }

    const { images: existingImages } = await listOwnedRecordImages(id);
    const existingIds = new Set(existingImages.map((img) => img.id));
    const unknownIds = patches.filter((p) => !existingIds.has(p.id)).map((p) => p.id);

    if (unknownIds.length > 0) {
      return NextResponse.json(
        { error: "image_not_found", unknownIds },
        { status: 404 },
      );
    }

    const admin = createSupabaseAdminClient();

    const updateResults = await Promise.all(
      patches.map((patch) => {
        const existing = existingImages.find((img) => img.id === patch.id)!;
        const updatePayload: Record<string, string> = {};

        if (patch.caption !== undefined) {
          updatePayload.caption = patch.caption;
        } else {
          updatePayload.caption = existing.caption ?? "";
        }

        if (patch.altText !== undefined) {
          updatePayload.alt_text = patch.altText;
        } else {
          updatePayload.alt_text = existing.alt_text ?? "";
        }

        return admin
          .from(IMAGES_TABLE)
          .update(updatePayload)
          .eq("id", patch.id)
          .eq("record_id", id)
          .eq("owner_id", ownerId);
      }),
    );

    const firstError = updateResults.find((r) => r.error);
    if (firstError?.error) {
      throw firstError.error;
    }

    const updated = patches.map((patch) => {
      const existing = existingImages.find((img) => img.id === patch.id)!;
      return {
        id: patch.id,
        caption: patch.caption ?? existing.caption ?? "",
        altText: patch.altText ?? existing.alt_text ?? "",
      };
    });

    return NextResponse.json({
      ok: true,
      updated,
      count: updated.length,
    });
  } catch (error) {
    const details = serializeInternalError(error);
    console.error("internal bulk image update failed", details);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "internal_bulk_image_update_failed",
        details,
      },
      { status: 400 },
    );
  }
}

function parseBulkPatches(input: Record<string, unknown>): BulkImagePatch[] {
  const rawImages = input.images;

  if (!Array.isArray(rawImages)) {
    throw new Error("images must be an array");
  }

  return rawImages.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`images[${index}] must be an object`);
    }

    const entry = item as Record<string, unknown>;

    if (typeof entry.id !== "string" || entry.id.trim().length === 0) {
      throw new Error(`images[${index}].id is required`);
    }

    const patch: BulkImagePatch = { id: entry.id.trim() };

    if ("caption" in entry) {
      if (entry.caption !== null && typeof entry.caption !== "string") {
        throw new Error(`images[${index}].caption must be a string or null`);
      }
      patch.caption = typeof entry.caption === "string" ? entry.caption : "";
    }

    if ("altText" in entry || "alt_text" in entry) {
      const val = entry.altText ?? entry.alt_text;
      if (val !== null && val !== undefined && typeof val !== "string") {
        throw new Error(`images[${index}].altText must be a string or null`);
      }
      patch.altText = typeof val === "string" ? val : "";
    }

    if (patch.caption === undefined && patch.altText === undefined) {
      throw new Error(`images[${index}] must include at least caption or altText`);
    }

    return patch;
  });
}

function toOptionalString(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function toOptionalBoolean(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return undefined;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return undefined;
}
