// ============================================================
// FILE:
// app/api/scanner/sessions/route.ts
//
// PURPOSE:
//   Create a secure product-scanner session.
// ============================================================

import {
  json,
  requireUser,
} from "@/lib/scanner/server";


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


    // --------------------------------------------------------
    // Read request body
    // --------------------------------------------------------

    const body =
      await request
        .json()
        .catch(
          () => ({})
        );


    const tenantId =
      typeof body.tenantId ===
      "string"
        ? body.tenantId
        : null;


    const branchId =
      typeof body.branchId ===
      "string"
        ? body.branchId
        : null;


    // --------------------------------------------------------
    // IMPORTANT SECURITY CHECK
    // --------------------------------------------------------
    //
    // Do NOT trust tenantId or branchId supplied by the
    // browser.
    //
    // Replace this section with your existing tenant context
    // and RBAC authorization service.
    //
    // Example:
    //
    // await assertTenantAccess(
    //   user.id,
    //   tenantId,
    //   branchId
    // );
    //
    // --------------------------------------------------------


    const {
      data: session,
      error,
    } =
      await supabase
        .from(
          "product_scanner_sessions"
        )
        .insert({
          created_by:
            user.id,

          tenant_id:
            tenantId,

          branch_id:
            branchId,
        })
        .select(
          `
          id,
          status,
          expires_at,
          created_at
          `
        )
        .single();


    if (error) {
      throw new Error(
        error.message
      );
    }


    return json(
      {
        session,
      }
    );


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
            : "Unable to create session.",
      },
      {
        status: 400,
      }
    );
  }
}
