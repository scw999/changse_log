import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { allowedAdminEmail, internalIngestSecret, isInternalIngestConfigured } from "@/lib/supabase/env";

const RECORDS_TABLE = "archive_records";
const IMAGES_TABLE = "archive_record_images";

type ArchiveRecordLookup = {
  id: string;
  owner_id: string;
  title: string;
  body: string;
  category: string;
  subcategory: string;
  tags: string[] | null;
  created_at: string;
  updated_at?: string | null;
  event_date: string | null;
  importance: number;
  source_type: string;
  summary: string | null;
  notes: string | null;
  details: Record<string, unknown> | null;
};

export function assertInternalIngestConfigured() {
  if (!isInternalIngestConfigured()) {
    throw new Error("internal_ingest_not_configured");
  }
}

export function isAuthorizedInternalRequest(request: Request) {
  const requestSecret = getRequestSecret(request);
  return Boolean(requestSecret && requestSecret === internalIngestSecret);
}

export async function resolveAllowedOwnerId() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (error) {
    throw error;
  }

  const user = data.users.find((item) => item.email?.trim().toLowerCase() === allowedAdminEmail);

  if (!user) {
    throw new Error("allowed admin user not found in Supabase Auth");
  }

  return user.id;
}

export async function getOwnedArchiveRecord(recordId: string) {
  const ownerId = await resolveAllowedOwnerId();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from(RECORDS_TABLE)
    .select("*")
    .eq("id", recordId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    ownerId,
    record: (data ?? null) as ArchiveRecordLookup | null,
  };
}

export async function listOwnedArchiveRecords(options?: {
  category?: string;
  limit?: number;
}) {
  const ownerId = await resolveAllowedOwnerId();
  const admin = createSupabaseAdminClient();
  let query = admin
    .from(RECORDS_TABLE)
    .select(
      "id, owner_id, title, body, category, subcategory, tags, created_at, updated_at, event_date, importance, source_type, summary, notes, details",
    )
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (options?.category) {
    query = query.eq("category", options.category);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return {
    ownerId,
    records: (data ?? []) as ArchiveRecordLookup[],
  };
}

export async function listOwnedRecordImages(recordId: string) {
  const ownerId = await resolveAllowedOwnerId();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from(IMAGES_TABLE)
    .select("id, record_id, storage_path, caption, alt_text, sort_order, created_at")
    .eq("owner_id", ownerId)
    .eq("record_id", recordId);

  if (error) {
    throw error;
  }

  return {
    ownerId,
    images: (data ?? []) as Array<{
      id: string;
      record_id: string;
      storage_path: string;
      caption: string | null;
      alt_text: string | null;
      sort_order: number;
      created_at: string;
    }>,
  };
}

export function getRequestSecret(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  return request.headers.get("x-internal-ingest-secret")?.trim() ?? "";
}

export function serializeInternalError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  if (typeof error === "object" && error !== null) {
    const candidate = error as Record<string, unknown>;
    return {
      message: typeof candidate.message === "string" ? candidate.message : "unknown_error",
      code: typeof candidate.code === "string" ? candidate.code : undefined,
      details: typeof candidate.details === "string" ? candidate.details : undefined,
      hint: typeof candidate.hint === "string" ? candidate.hint : undefined,
    };
  }

  return {
    message: "unknown_error",
  };
}
