import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isInternalIngestConfigured } from "@/lib/supabase/env";
import { getOwnedArchiveRecord, isAuthorizedInternalRequest, serializeInternalError } from "@/lib/internal-auth";

const BUCKET = "record-images";
const IMAGES_TABLE = "archive_record_images";

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
      throw new Error("file is required");
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
