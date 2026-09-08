// ============================================================
// FILE:
// app/api/scanner/commit/route.ts
//
// PURPOSE:
//   Secure server-side boundary for creating or merging
//   products from scanner results.
//
// IMPORTANT:
//   This endpoint must NEVER trust the browser with inventory,
//   permissions, tenant access or publication authorization.
// ============================================================

import {
  assertString,
  assertUuid,
  json,
  requireUser,
} from "@/lib/scanner/server";


// ============================================================
// REQUEST TYPE
// ============================================================

type CommitBody = {

  sessionId: string;

  operation:
    | "create"
    | "merge";

  productId?:
    | string
    | null;

  publishRequested?:
    | boolean;

  plan:
    Record<
      string,
      unknown
    >;
};


// ============================================================
// VALIDATE SAVE PLAN
// ============================================================

function validatePlan(
  body: CommitBody
) {

  if (
    !body ||
    ![
      "create",
      "merge",
    ].includes(
      body.operation
    )
  ) {

    throw new Error(
      "Invalid operation."
    );
  }


  assertUuid(
    body.sessionId,
    "sessionId"
  );


  if (
    body.operation ===
    "merge"
  ) {

    if (
      !body.productId
    ) {

      throw new Error(
        "A merge requires productId."
      );
    }


    assertString(
      body.productId,
      "productId",
      200
    );
  }


  if (
    !body.plan ||
    typeof body.plan !==
      "object"
  ) {

    throw new Error(
      "Invalid save plan."
    );
  }


  // ----------------------------------------------------------
  // Scanner cannot directly mutate inventory.
  // ----------------------------------------------------------

  const forbiddenKeys = [

    "stock",

    "quantity",

    "inventoryQuantity",

    "inventoryDelta",

    "onHand",

  ];


  for (
    const key
    of forbiddenKeys
  ) {

    if (
      key in body.plan
    ) {

      throw new Error(
        `Scanner commits cannot mutate inventory: ${key}.`
      );
    }
  }
}


// ============================================================
// POST
// ============================================================

export async function POST(
  request: Request
) {

  try {

    const {
      supabase,
      user,
    } =
      await requireUser(
        request
      );


    const body =
      (
        await request.json()
      ) as CommitBody;


    // --------------------------------------------------------
    // Validate incoming data
    // --------------------------------------------------------

    validatePlan(
      body
    );


    // --------------------------------------------------------
    // Load session
    // --------------------------------------------------------

    const {
      data: session,
      error:
        sessionError,
    } =
      await supabase
        .from(
          "product_scanner_sessions"
        )
        .select("*")
        .eq(
          "id",
          body.sessionId
        )
        .eq(
          "created_by",
          user.id
        )
        .maybeSingle();


    if (
      sessionError
    ) {

      throw new Error(
        sessionError.message
      );
    }


    if (!session) {

      throw new Error(
        "Scanner session not found."
      );
    }


    // --------------------------------------------------------
    // Expiry check
    // --------------------------------------------------------

    if (
      new Date(
        session.expires_at
      ).getTime() <=
      Date.now()
    ) {

      return json(
        {
          error:
            "Scanner session expired.",
        },
        {
          status: 409,
        }
      );
    }


    // --------------------------------------------------------
    // TENANT AUTHORIZATION
    // --------------------------------------------------------
    //
    // Connect this to your existing tenant/RBAC system.
    //
    // REQUIRED:
    //
    // 1. User belongs to tenant.
    // 2. User belongs to branch.
    // 3. User has product:create or product:update.
    // 4. User has pricing permission before accepting price
    //    changes.
    // 5. User has ecommerce:publish before publication.
    //
    // Never trust these permissions from the browser.
    // --------------------------------------------------------


    // --------------------------------------------------------
    // PUBLICATION SECURITY
    // --------------------------------------------------------

    if (
      body.publishRequested
    ) {

      return json(
        {
          error:
            "Publication authorization is not configured. Commit the catalog record first, then publish through the existing ecommerce workflow.",
        },
        {
          status: 403,
        }
      );
    }


    // ========================================================
    // PRODUCT REPOSITORY
    // ========================================================
    //
    // IMPORTANT:
    //
    // Your actual POS products table/schema should be connected
    // here.
    //
    // Do NOT directly modify inventory from this endpoint.
    //
    // Example:
    //
    // const product =
    //   body.operation === "create"
    //     ? await productRepository.createDraft(...)
    //     : await productRepository.mergeCatalogData(...)
    //
    // ========================================================


    // --------------------------------------------------------
    // Audit scanner commit
    // --------------------------------------------------------

    const {
      data: audit,
      error:
        auditError,
    } =
      await supabase
        .from(
          "product_scanner_commits"
        )
        .insert({

          session_id:
            body.sessionId,

          committed_by:
            user.id,

          operation:
            body.operation,

          product_id:
            body.productId ??
            null,

          publish_requested:
            false,

          plan:
            body.plan,

        })
        .select(
          `
          id,
          session_id,
          operation,
          product_id,
          created_at
          `
        )
        .single();


    if (
      auditError
    ) {

      throw new Error(
        auditError.message
      );
    }


    // --------------------------------------------------------
    // Complete session
    // --------------------------------------------------------

    await supabase
      .from(
        "product_scanner_sessions"
      )
      .update({

        status:
          "completed",

        completed_at:
          new Date()
            .toISOString(),

      })
      .eq(
        "id",
        body.sessionId
      )
      .eq(
        "created_by",
        user.id
      );


    return json({
      success: true,

      audit,
    });


  } catch (error) {

    if (
      error instanceof Response
    ) {
      return error;
    }


    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Commit failed.",
      },
      {
        status: 400,
      }
    );
  }
}
