import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { allowedAdminEmail, internalIngestSecret, isInternalIngestConfigured } from "@/lib/supabase/env";
import { buildInternalArchiveInsert, parseInternalIngestPayload } from "@/lib/internal-ingest";

const ARCHIVE_RECORDS_TABLE = "archive_records";

export async function POST(request: Request) {
  if (!isInternalIngestConfigured()) {
    return NextResponse.json({ error: "internal_ingest_not_configured" }, { status: 503 });
  }

  const requestSecret = getRequestSecret(request);

  if (!requestSecret || requestSecret !== internalIngestSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const payload = parseInternalIngestPayload(body);
    const ownerId = await resolveAllowedOwnerId();
    const admin = createSupabaseAdminClient();

    const { data, error } = await admin
      .from(ARCHIVE_RECORDS_TABLE)
      .insert(buildInternalArchiveInsert(ownerId, payload))
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
    const details = serializeInternalIngestError(error);
    console.error("internal archive ingest failed", details);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "internal_ingest_failed",
        details,
      },
      { status: 400 },
    );
  }
}

export function GET() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}

async function resolveAllowedOwnerId() {
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

function getRequestSecret(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  return request.headers.get("x-internal-ingest-secret")?.trim() ?? "";
}

function serializeInternalIngestError(error: unknown) {
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
