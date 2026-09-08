// ============================================================
// FILE:
// app/api/scanner/sessions/[id]/images/route.ts
//
// PURPOSE:
//   Register a scanner image after it has been uploaded to
//   private Supabase Storage.
// ============================================================

import {
  assertImageMetadata,
  assertSessionOwner,
  json,
  requireUser,
} from "@/lib/scanner/server";


// ============================================================
// POST
// ============================================================

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {

  try {

    const {
      supabase,
      user,
    } =
      await requireUser(
        request
      );


    const {
      id,
    } =
      await context.params;


    // --------------------------------------------------------
    // Validate session ownership
    // --------------------------------------------------------

    const session =
      await assertSessionOwner(
        supabase,
        id,
        user.id
      );


    // --------------------------------------------------------
    // Session state validation
    // --------------------------------------------------------

    if (
      ![
        "open",
        "paired",
        "processing",
      ].includes(
        session.status
      )
    ) {

      return json(
        {
          error:
            "Session is not accepting images.",
        },
        {
          status: 409,
        }
      );
    }


    // --------------------------------------------------------
    // Parse request
    // --------------------------------------------------------

    const body =
      await request.json();


    const image =
      assertImageMetadata(
        body
      );


    // --------------------------------------------------------
    // Prevent Storage path abuse
    // --------------------------------------------------------
    //
    // Expected:
    //
    // scanner/{USER_ID}/{SESSION_ID}/...
    //
    // --------------------------------------------------------

    const expectedPrefix =
      `scanner/${user.id}/${id}/`;


    if (
      !image.storagePath.startsWith(
        expectedPrefix
      )
    ) {

      return json(
        {
          error:
            "Invalid storage path.",
        },
        {
          status: 403,
        }
      );
    }


    // --------------------------------------------------------
    // Register image
    // --------------------------------------------------------

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "product_scanner_images"
        )
        .insert({
          session_id:
            id,

          uploaded_by:
            user.id,

          ...image,
        })
        .select(
          `
          id,
          session_id,
          side,
          storage_path,
          mime_type,
          byte_size,
          width,
          height,
          sha256,
          created_at
          `
        )
        .single();


    if (error) {
      throw new Error(
        error.message
      );
    }


    // --------------------------------------------------------
    // Mark session paired
    // --------------------------------------------------------

    await supabase
      .from(
        "product_scanner_sessions"
      )
      .update({
        status:
          "paired",

        paired_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        id
      )
      .eq(
        "created_by",
        user.id
      );


    return json(
      {
        image: data,
      },
      {
        status: 201,
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
            : "Unable to register image.",
      },
      {
        status: 400,
      }
    );
  }
}
