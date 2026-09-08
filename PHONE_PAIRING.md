============================================================
PRODUCT SCANNER — PHONE CAMERA PAIRING
============================================================


PURPOSE
-------

The desktop POS can create a temporary scanner session and
allow a phone to connect to that session.

The QR code should NOT simply contain:

    window.location.href

That does not provide secure pairing.


============================================================
PAIRING FLOW
============================================================

1. Desktop POS creates a scanner session.

        POST /api/scanner/sessions


2. Server creates a cryptographically random pairing token.


3. Server stores only the SHA-256 hash of the token.


4. QR code contains something similar to:

        /mobile/scanner
        ?session=SESSION_ID
        &token=SHORT_LIVED_TOKEN


5. Phone scans QR code.


6. Phone sends the session ID and token to a dedicated
   pairing endpoint.


7. Server hashes the supplied token.


8. Server verifies:

       - session exists
       - session has not expired
       - session is still open
       - token hash matches


9. Session becomes:

       paired


10. Phone uploads product images to private Supabase Storage.


11. Image metadata is registered against the scanner session.


12. Desktop POS listens for new images.


13. Desktop displays the newly captured image.


============================================================
STORAGE STRUCTURE
============================================================

Private bucket:

    product-scanner


Recommended path:

    scanner/
        USER_ID/
            SESSION_ID/
                front.jpg
                back.jpg
                side-left.jpg
                side-right.jpg


============================================================
SECURITY REQUIREMENTS
============================================================

Never put the Supabase service-role key in the browser.


Never place:

    passwords
    service-role keys
    long-lived secrets

inside QR codes.


Pairing tokens should be:

    random
    short-lived
    single-purpose


Server should:

    hash tokens
    verify ownership
    verify expiration
    rate-limit attempts


============================================================
IMAGE SECURITY
============================================================

Validate server-side:

    MIME type
    file size
    image dimensions
    file extension
    image signature / magic bytes


Maximum image size:

    10 MB


Do not trust:

    Content-Type
    filename
    extension

from the browser alone.


============================================================
SESSION LIFETIME
============================================================

Default:

    15 minutes


Expired sessions should become:

    expired


Abandoned images should eventually be removed by a
scheduled cleanup process.


============================================================
REALTIME
============================================================

Recommended flow:

    Mobile
       |
       | upload
       v
    Supabase Storage
       |
       v
    product_scanner_images
       |
       | Realtime
       v
    Desktop POS


============================================================
IMPORTANT INVENTORY RULE
============================================================

Scanning a product is NOT the same as receiving stock.


For example:

    AI identifies:
        Samsung 55-inch TV


This should NOT automatically mean:

    stock = 25


The scanner should create/update:

    product information
    SKU
    barcode
    brand
    model
    category
    specifications
    photos
    pricing suggestions


Inventory should only change through:

    receiving
    sales
    returns
    adjustments
    transfers
    opening balance


============================================================
FINAL ARCHITECTURE
============================================================

                    ┌─────────────────────┐
                    │    Desktop POS      │
                    │  Product Scanner    │
                    └──────────┬──────────┘
                               │
                               │ Create session
                               ▼
                    ┌─────────────────────┐
                    │ Scanner Session API  │
                    └──────────┬──────────0
                               │
                               │ Secure token
                               ▼
                    ┌─────────────────────┐
                    │        QR Code       │
                    └──────────┬──────────┘
                               │
                               │ Scan
                               ▼
                    ┌─────────────────────┐
                    │      Mobile App     │
                    │    Camera Capture   │
                    └──────────┬──────────┘
                               │
                               │ Upload
                               ▼
                    ┌─────────────────────┐
                    │  Private Storage   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Scanner Image Table │
                    └──────────┬──────────┘
                               │
                               │ Realtime
                               ▼
                    ┌─────────────────────┐
                    │    Desktop POS      │
                    │   Review / Confirm  │
                    └──────────┬──────────┘
                               │
                               │ Commit
                               ▼
                    ┌─────────────────────┐
                    │ Server Authorization │
                    │       + RBAC        │
                    └──────────┬──────────┘
                               │
                               ▼
              ┌────────────────────────────────┐
              │        Product Repository      │
              └────────────────┬───────────────┘
                               │
                 ┌─────────────┴─────────────┐
                 ▼                           ▼
        ┌─────────────────┐       ┌──────────────────┐
        │ Product Catalog │       │   Audit Record   │
        └─────────────────┘       └──────────────────┘


Inventory remains a separate controlled domain.


============================================================
