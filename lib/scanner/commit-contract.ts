// ============================================================
// FILE:
// lib/scanner/commit-contract.ts
//
// PURPOSE:
//   Defines the contract between the AI product scanner and
//   the existing POS product repository.
//
// IMPORTANT:
//   The scanner does NOT own inventory.
// ============================================================


// ============================================================
// PRODUCT SCANNER COMMIT
// ============================================================

export type ProductScannerCommit = {

  operation:
    | "create"
    | "merge";


  productId?:
    | string
    | null;


  // ----------------------------------------------------------
  // Catalog data
  // ----------------------------------------------------------

  product: {

    name: string;

    sku: string;

    barcode?:
      string;

    brand?:
      string;

    model?:
      string;

    category?:
      string;

    description?:
      string;

    specifications?:
      Record<
        string,
        string
      >;

    features?:
      string[];

    imageUrls?:
      string[];


    // --------------------------------------------------------
    // Pricing
    // --------------------------------------------------------

    cost?:
      number;

    price?:
      number;

    wholesalePrice?:
      number;
  };


  // ----------------------------------------------------------
  // Merge/update options
  // ----------------------------------------------------------

  options: {

    updatePricing:
      boolean;

    replacePhotos:
      boolean;

    replaceSpecifications:
      boolean;
  };
};


// ============================================================
// PRODUCT REPOSITORY
// ============================================================

export interface ProductRepository {

  createDraft(

    input:
      ProductScannerCommit,

    context: {

      userId:
        string;

      tenantId?:
        string | null;

      branchId?:
        string | null;

    }

  ): Promise<{

    productId:
      string;

  }>;


  mergeCatalogData(

    input:
      ProductScannerCommit,

    context: {

      userId:
        string;

      tenantId?:
        string | null;

      branchId?:
        string | null;

    }

  ): Promise<{

    productId:
      string;

  }>;
}


// ============================================================
// INVENTORY REPOSITORY
// ============================================================
//
// The scanner normally should NOT call this.
//
// Inventory should be changed by dedicated workflows.
// ============================================================

export interface InventoryRepository {

  recordInventoryEvent(

    input: {

      productId:
        string;

      quantity:
        number;

      eventType:

        | "receipt"

        | "sale"

        | "return"

        | "adjustment"

        | "transfer_in"

        | "transfer_out"

        | "opening_balance";


      reason?:
        string;

      referenceType?:
        string;

      referenceId?:
        string;

      userId:
        string;
    }

  ): Promise<void>;
}
