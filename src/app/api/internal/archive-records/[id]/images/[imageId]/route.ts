import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isInternalIngestConfigured } from "@/lib/supabase/env";
import {
  getOwnedArchiveRecord,
  isAuthorizedInternalRequest,
  listOwnedRecordImages,
  serializeInternalError,
} from "@/lib/internal-auth";

const IMAGES_TABLE = "archive_record_images";

type ImagePatchPayload = {
  caption?: string;
  altText?: string;
  sortOrder?: number;
  isPrimary?: boolean;
};

export async function PATCH(
  request: Request,
  context: Readonly<{ params: Promise<{ id: string; imageId: string }> }>,
) {
  if (!isInternalIngestConfigured()) {
    return NextResponse.json({ error: "internal_ingest_not_configured" }, { status: 503 });
  }

  if (!isAuthorizedInternalRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { id, imageId } = await context.params;
    const { ownerId, record } = await getOwnedArchiveRecord(id);

    if (!record) {
      return NextResponse.json({ error: "record_not_found" }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const patch = parseImagePatch(body);
    const { images } = await listOwnedRecordImages(id);
    const target = images.find((image) => image.id === imageId);

    if (!target) {
      return NextResponse.json({ error: "image_not_found" }, { status: 404 });
    }

    const reordered = reorderImages(images, imageId, patch.sortOrder);
    const nextPrimaryMap = resolvePrimaryFlags(reordered, imageId, patch.isPrimary);
    const admin = createSupabaseAdminClient();

    for (const image of reordered) {
      const isTarget = image.id === imageId;
      const { error } = await admin
        .from(IMAGES_TABLE)
        .update({
          caption: isTarget ? patch.caption ?? image.caption ?? "" : image.caption ?? "",
          alt_text: isTarget ? patch.altText ?? image.alt_text ?? "" : image.alt_text ?? "",
          sort_order: image.sort_order,
          is_primary: nextPrimaryMap.get(image.id) ?? false,
        })
        .eq("id", image.id)
        .eq("record_id", id)
        .eq("owner_id", ownerId);

      if (error) {
        throw error;
      }
    }

    const updated = reordered.find((image) => image.id === imageId);

    return NextResponse.json({
      ok: true,
      image: {
        id: imageId,
        recordId: id,
        caption: updated?.caption ?? patch.caption ?? "",
        altText: updated?.alt_text ?? patch.altText ?? "",
        sortOrder: updated?.sort_order ?? 0,
        isPrimary: nextPrimaryMap.get(imageId) ?? false,
      },
    });
  } catch (error) {
    const details = serializeInternalError(error);
    console.error("internal image update failed", details);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "internal_image_update_failed",
        details,
      },
      { status: 400 },
    );
  }
}

function parseImagePatch(input: Record<string, unknown>): ImagePatchPayload {
  const patch: ImagePatchPayload = {};

  if ("caption" in input) {
    patch.caption = toOptionalString(input.caption);
  }

  if ("alt_text" in input) {
    patch.altText = toOptionalString(input.alt_text);
  } else if ("altText" in input) {
    patch.altText = toOptionalString(input.altText);
  }

  if ("sort_order" in input) {
    patch.sortOrder = parseOptionalNumber(input.sort_order, "sort_order");
  } else if ("sortOrder" in input) {
    patch.sortOrder = parseOptionalNumber(input.sortOrder, "sortOrder");
  }

  if ("is_primary" in input) {
    patch.isPrimary = parseOptionalBoolean(input.is_primary, "is_primary");
  } else if ("isPrimary" in input) {
    patch.isPrimary = parseOptionalBoolean(input.isPrimary, "isPrimary");
  }

  if (
    patch.caption === undefined &&
    patch.altText === undefined &&
    patch.sortOrder === undefined &&
    patch.isPrimary === undefined
  ) {
    throw new Error("at least one image field must be provided");
  }

  return patch;
}

function reorderImages(
  images: Array<{
    id: string;
    caption: string | null;
    alt_text: string | null;
    is_primary: boolean;
    sort_order: number;
    created_at: string;
  }>,
  imageId: string,
  nextOrder?: number,
) {
  const ordered = [...images]
    .sort((left, right) => {
      if (left.sort_order !== right.sort_order) {
        return left.sort_order - right.sort_order;
      }

      return left.created_at.localeCompare(right.created_at);
    })
    .map((image) => ({ ...image }));

  const currentIndex = ordered.findIndex((image) => image.id === imageId);
  if (currentIndex < 0) {
    return ordered;
  }

  const targetIndex =
    nextOrder === undefined
      ? currentIndex
      : Math.max(0, Math.min(nextOrder, ordered.length - 1));

  const [target] = ordered.splice(currentIndex, 1);
  ordered.splice(targetIndex, 0, target);

  return ordered.map((image, index) => ({
    ...image,
    sort_order: index,
  }));
}

function resolvePrimaryFlags(
  images: Array<{
    id: string;
    is_primary: boolean;
  }>,
  imageId: string,
  nextPrimary?: boolean,
) {
  const primaryMap = new Map(images.map((image) => [image.id, image.is_primary]));

  if (nextPrimary === undefined) {
    return primaryMap;
  }

  if (nextPrimary) {
    for (const image of images) {
      primaryMap.set(image.id, image.id === imageId);
    }

    return primaryMap;
  }

  primaryMap.set(imageId, false);
  return primaryMap;
}

function toOptionalString(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error("image text fields must be strings");
  }

  return value.trim();
}

function parseOptionalNumber(value: unknown, field: string) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${field} must be a number`);
  }

  return Math.max(0, Math.floor(parsed));
}

function parseOptionalBoolean(value: unknown, field: string) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new Error(`${field} must be a boolean`);
  }

  return value;
}
