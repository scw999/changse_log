import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { allowedAdminEmail, internalIngestSecret, isInternalIngestConfigured } from "@/lib/supabase/env";

const RECORDS_TABLE = "archive_records";

type ArchiveRecordLookup = {
  id: string;
  owner_id: string;
  title: string;
  body: string;
  category: string;
  subcategory: string;
  tags: string[] | null;
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
