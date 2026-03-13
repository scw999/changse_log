import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isInternalIngestConfigured } from "@/lib/supabase/env";
import {
  getOwnedArchiveRecord,
  isAuthorizedInternalRequest,
  listOwnedRecordImages,
  serializeInternalError,
} from "@/lib/internal-auth";
import { parseInternalRecordPatch, serializeArchiveRecord } from "@/lib/internal-record-update";

const ARCHIVE_RECORDS_TABLE = "archive_records";
const IMAGES_TABLE = "archive_record_images";
const BUCKET = "record-images";

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
    const body = await request.json();
    const patch = parseInternalRecordPatch(body);
    const { ownerId, record } = await getOwnedArchiveRecord(id);

    if (!record) {
      return NextResponse.json({ error: "record_not_found" }, { status: 404 });
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from(ARCHIVE_RECORDS_TABLE)
      .update(serializeArchiveRecord(ownerId, record, patch))
      .eq("id", id)
      .eq("owner_id", ownerId)
      .select("id, title, source_type, created_at")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      ok: true,
      record: data,
    });
  } catch (error) {
    const details = serializeInternalError(error);
    console.error("internal archive update failed", details);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "internal_record_update_failed",
        details,
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
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

    const admin = createSupabaseAdminClient();
    const { images } = await listOwnedRecordImages(id);
    const storagePaths = images.map((image) => image.storage_path).filter(Boolean);

    if (storagePaths.length > 0) {
      const { error: storageError } = await admin.storage.from(BUCKET).remove(storagePaths);

      if (storageError) {
        throw storageError;
      }

      const { error: imageError } = await admin
        .from(IMAGES_TABLE)
        .delete()
        .eq("record_id", id)
        .eq("owner_id", ownerId);

      if (imageError) {
        throw imageError;
      }
    }

    const { error: recordError } = await admin
      .from(ARCHIVE_RECORDS_TABLE)
      .delete()
      .eq("id", id)
      .eq("owner_id", ownerId);

    if (recordError) {
      throw recordError;
    }

    return NextResponse.json({
      ok: true,
      deleted: {
        id: record.id,
        title: record.title,
      },
    });
  } catch (error) {
    const details = serializeInternalError(error);
    console.error("internal archive delete failed", details);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "internal_record_delete_failed",
        details,
      },
      { status: 400 },
    );
  }
}
