// ============================================================
// FILE: lib/scanner/server.ts
// PURPOSE:
//   Shared server-side authentication, validation and
//   scanner-session helpers.
// ============================================================

import {
  createHash,
  randomBytes,
} from "node:crypto";

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";


// ============================================================
// SUPABASE ADMIN CLIENT
// ============================================================

export function createAdminSupabase() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase server environment variables are missing."
    );
  }

  return createClient(
    url,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}


// ============================================================
// AUTHENTICATE REQUEST
// ============================================================

export async function requireUser(
  request: Request
) {
  const authorization =
    request.headers.get(
      "authorization"
    );

  const token =
    authorization?.replace(
      /^Bearer\s+/i,
      ""
    );

  if (!token) {
    throw new Response(
      "Unauthorized",
      {
        status: 401,
      }
    );
  }

  const supabase =
    createAdminSupabase();

  const {
    data,
    error,
  } =
    await supabase.auth.getUser(
      token
    );

  if (
    error ||
    !data.user
  ) {
    throw new Response(
      "Unauthorized",
      {
        status: 401,
      }
    );
  }

  return {
    supabase,
    user: data.user,
  };
}


// ============================================================
// CREATE PAIRING TOKEN
// ============================================================

export function createPairingToken() {
  const raw =
    randomBytes(32)
      .toString("base64url");

  const hash =
    createHash("sha256")
      .update(raw)
      .digest("hex");

  return {
    raw,
    hash,
  };
}


// ============================================================
// HASH EXISTING TOKEN
// ============================================================

export function hashPairingToken(
  raw: string
) {
  return createHash(
    "sha256"
  )
    .update(raw)
    .digest("hex");
}


// ============================================================
// JSON RESPONSE
// ============================================================

export function json(
  data: unknown,
  init: ResponseInit = {}
) {
  return Response.json(
    data,
    {
      ...init,

      headers: {
        "Cache-Control":
          "no-store",

        ...(init.headers ?? {}),
      },
    }
  );
}


// ============================================================
// UUID VALIDATION
// ============================================================

export function assertUuid(
  value: string,
  name = "id"
) {
  const valid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(value);

  if (!valid) {
    throw new Error(
      `Invalid ${name}.`
    );
  }
}


// ============================================================
// STRING VALIDATION
// ============================================================

export function assertString(
  value: unknown,
  name: string,
  max = 200
) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > max
  ) {
    throw new Error(
      `Invalid ${name}.`
    );
  }

  return value.trim();
}


// ============================================================
// IMAGE METADATA VALIDATION
// ============================================================

export function assertImageMetadata(
  input: unknown
) {
  if (
    !input ||
    typeof input !== "object"
  ) {
    throw new Error(
      "Invalid image."
    );
  }

  const value =
    input as Record<
      string,
      unknown
    >;

  const side =
    assertString(
      value.side,
      "side",
      80
    );

  const storagePath =
    assertString(
      value.storagePath,
      "storagePath",
      500
    );

  const mimeType =
    assertString(
      value.mimeType,
      "mimeType",
      100
    );

  if (
    !mimeType.startsWith(
      "image/"
    )
  ) {
    throw new Error(
      "Only images are allowed."
    );
  }

  const byteSize =
    Number(
      value.byteSize
    );

  if (
    !Number.isInteger(
      byteSize
    ) ||
    byteSize < 1 ||
    byteSize >
      10 * 1024 * 1024
  ) {
    throw new Error(
      "Image size is invalid."
    );
  }

  return {
    side,

    storagePath,

    mimeType,

    byteSize,

    width:
      value.width == null
        ? null
        : Number(value.width),

    height:
      value.height == null
        ? null
        : Number(value.height),

    sha256:
      value.sha256 == null
        ? null
        : String(
            value.sha256
          ),
  };
}


// ============================================================
// SESSION OWNER CHECK
// ============================================================

export async function assertSessionOwner(
  supabase: SupabaseClient,
  sessionId: string,
  userId: string
) {
  assertUuid(
    sessionId,
    "sessionId"
  );

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "product_scanner_sessions"
      )
      .select("*")
      .eq("id", sessionId)
      .eq(
        "created_by",
        userId
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      error.message
    );
  }

  if (!data) {
    throw new Error(
      "Scanner session not found."
    );
  }

  if (
    new Date(
      data.expires_at
    ).getTime() <=
    Date.now()
  ) {
    throw new Error(
      "Scanner session has expired."
    );
  }

  return data;
}
