import { 
  Order, 
  OrderLifecycleDomainStatuses, 
  OrderLifecycleStageRecord, 
  LifecycleStageStatus,
  ProofOfDeliveryData,
  WarehouseFulfillmentData,
  ShippingHandoverData,
  LastMileDeliveryData,
  OrderFeedbackReviewData,
  OrderDomainOrderStatus,
  OrderDomainPaymentStatus,
  OrderDomainFulfillmentStatus,
  OrderDomainShipmentStatus,
  OrderDomainReturnStatus
} from '../types';
import { generateBarcodeSvg, generateQrCodeSvg } from '../utils/barcodeGenerator';

export interface LifecyclePhaseDefinition {
  id: number;
  name: string;
  shortName: string;
  description: string;
  stageIds: number[];
  color: string;
  bgLight: string;
  borderColor: string;
}

export interface LifecycleStageDefinition {
  id: number;
  phaseId: number;
  name: string;
  phaseName: string;
  systemDomain: 'Storefront' | 'Cart/Pricing' | 'Checkout' | 'Payment Gateway' | 'Inventory Ledger' | 'Warehouse WMS' | 'Logistics Courier' | 'Last Mile' | 'Auditing' | 'CRM/Post-Sales';
  description: string;
  recommendedRole: string;
  domainStatusImpact: {
    orderStatus?: OrderDomainOrderStatus;
    paymentStatus?: OrderDomainPaymentStatus;
    fulfillmentStatus?: OrderDomainFulfillmentStatus;
    shipmentStatus?: OrderDomainShipmentStatus;
    returnStatus?: OrderDomainReturnStatus;
  };
  keyArtifacts: string[];
  requiresProofOrAction?: boolean;
}

export const ORDER_LIFECYCLE_PHASES: LifecyclePhaseDefinition[] = [
  {
    id: 1,
    name: 'Phase 1: Pre-Purchase & Cart Operations',
    shortName: 'Pre-Purchase',
    description: 'Catalog browsing, temporary shopping session assembly, and authoritative server-side cart revalidation.',
    stageIds: [1, 2, 3],
    color: 'text-sky-700',
    bgLight: 'bg-sky-50',
    borderColor: 'border-sky-200'
  },
  {
    id: 2,
    name: 'Phase 2: Checkout & Order Creation',
    shortName: 'Checkout & Creation',
    description: 'Destination input, carrier tariff calculation, and static order snapshot creation preserving historical figures.',
    stageIds: [4, 5, 6],
    color: 'text-indigo-700',
    bgLight: 'bg-indigo-50',
    borderColor: 'border-indigo-200'
  },
  {
    id: 3,
    name: 'Phase 3: Payment Initiation & Verification',
    shortName: 'Payment Verification',
    description: 'Payment session redirection, server-to-server webhook verification, and state transition upon financial authorization.',
    stageIds: [7, 8, 9],
    color: 'text-emerald-700',
    bgLight: 'bg-emerald-50',
    borderColor: 'border-emerald-200'
  },
  {
    id: 4,
    name: 'Phase 4: Inventory Management & Allocation',
    shortName: 'Inventory & Allocation',
    description: 'Temporary stock reservation locks, multi-warehouse routing calculation, and physical fulfillment order generation.',
    stageIds: [10, 11, 12],
    color: 'text-amber-700',
    bgLight: 'bg-amber-50',
    borderColor: 'border-amber-200'
  },
  {
    id: 5,
    name: 'Phase 5: Warehouse & Fulfillment Operations',
    shortName: 'Warehouse Operations',
    description: 'Pick task generation, optical barcode scanning, exception triage, packaging metrics, and QC serial inspection.',
    stageIds: [13, 14, 15, 16, 17],
    color: 'text-purple-700',
    bgLight: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  {
    id: 6,
    name: 'Phase 6: Shipping & Courier Handover',
    shortName: 'Shipping & Handover',
    description: 'Carrier label rendering, driver route assignment, physical dock handover verification, and transit checkpoints.',
    stageIds: [18, 19, 20, 21, 22],
    color: 'text-blue-700',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  {
    id: 7,
    name: 'Phase 7: Last-Mile Delivery & Completion',
    shortName: 'Last-Mile & Completion',
    description: 'Proximity alerts, recipient OTP verification, Proof of Delivery capture, immutable ledger stock deduction, and reviews.',
    stageIds: [23, 24, 25, 26, 27, 28, 29],
    color: 'text-teal-700',
    bgLight: 'bg-teal-50',
    borderColor: 'border-teal-200'
  },
  {
    id: 8,
    name: 'Phase 8: Post-Delivery (Returns & Refunds)',
    shortName: 'Returns & Reverse Logistics',
    description: 'Reverse pickup authorization, RMA condition inspection, restocking, and monetary refund reconciliation.',
    stageIds: [30],
    color: 'text-rose-700',
    bgLight: 'bg-rose-50',
    borderColor: 'border-rose-200'
  }
];

export const ORDER_LIFECYCLE_STAGES: LifecycleStageDefinition[] = [
  // Phase 1: Pre-Purchase & Cart Operations
  {
    id: 1,
    phaseId: 1,
    name: 'Stage 1 — Customer Browses the Store',
    phaseName: 'Pre-Purchase & Cart Operations',
    systemDomain: 'Storefront',
    description: 'Customer searches catalog, checks variant availability from cached view without burdening active inventory ledger.',
    recommendedRole: 'Storefront Client / Guest Customer',
    domainStatusImpact: { orderStatus: 'Draft' },
    keyArtifacts: ['Active Product Catalog Cache', 'Variant SKU Selector', 'Category Facets']
  },
  {
    id: 2,
    phaseId: 1,
    name: 'Stage 2 — Add to Cart',
    phaseName: 'Pre-Purchase & Cart Operations',
    systemDomain: 'Cart/Pricing',
    description: 'Temporary cart session created in local state or customer profile; no inventory deducted at this point.',
    recommendedRole: 'Storefront Cart Engine',
    domainStatusImpact: { orderStatus: 'Draft' },
    keyArtifacts: ['Client Cart Session Token', 'Line Items Payload', 'Selected Unit Multipliers']
  },
  {
    id: 3,
    phaseId: 1,
    name: 'Stage 3 — Cart Validation',
    phaseName: 'Pre-Purchase & Cart Operations',
    systemDomain: 'Cart/Pricing',
    description: 'Backend independently revalidates prices, promo rules, and live stock to prevent frontend parameter tampering.',
    recommendedRole: 'Authoritative Backend Engine',
    domainStatusImpact: { orderStatus: 'Draft' },
    keyArtifacts: ['Cryptographic Rules Signature', 'Authoritative Subtotal & Tax', 'Live Stock Assertion']
  },

  // Phase 2: Checkout & Order Creation
  {
    id: 4,
    phaseId: 2,
    name: 'Stage 4 — Customer Checkout',
    phaseName: 'Checkout & Order Creation',
    systemDomain: 'Checkout',
    description: 'Customer provides delivery coordinates, recipient contact, selected shipping speed, and payment method intent.',
    recommendedRole: 'Customer / Checkout Flow',
    domainStatusImpact: { orderStatus: 'Draft' },
    keyArtifacts: ['Delivery Address Payload', 'Recipient Contact', 'Selected Shipping Tier']
  },
  {
    id: 5,
    phaseId: 2,
    name: 'Stage 5 — Shipping/Delivery Calculation',
    phaseName: 'Checkout & Order Creation',
    systemDomain: 'Checkout',
    description: 'System queries shipping matrices, carrier APIs, and weight/postal rules to compute exact delivery tariffs.',
    recommendedRole: 'Logistics Rating Engine',
    domainStatusImpact: { orderStatus: 'Draft' },
    keyArtifacts: ['Tariff Breakdown', 'Fuel Surcharge Rate', 'Estimated Transit Days']
  },
  {
    id: 6,
    phaseId: 2,
    name: 'Stage 6 — Create the Order',
    phaseName: 'Checkout & Order Creation',
    systemDomain: 'Checkout',
    description: 'Backend writes immutable order snapshot locking prices, taxes, discounts, and item names regardless of future edits.',
    recommendedRole: 'Order Management System',
    domainStatusImpact: { orderStatus: 'Submitted', paymentStatus: 'Unpaid' },
    keyArtifacts: ['Order ID & Number', 'Static Pricing Snapshot', 'Initial Order Record']
  },

  // Phase 3: Payment Initiation & Verification
  {
    id: 7,
    phaseId: 3,
    name: 'Stage 7 — Payment',
    phaseName: 'Payment Initiation & Verification',
    systemDomain: 'Payment Gateway',
    description: 'Customer redirected to payment gateway session or USSD prompt; order moves to pending payment state.',
    recommendedRole: 'Payment Gateway Service',
    domainStatusImpact: { orderStatus: 'Submitted', paymentStatus: 'Pending Verification' },
    keyArtifacts: ['Gateway Session ID', 'Payment Redirect URL / USSD Push', 'Order Lock Flag']
  },
  {
    id: 8,
    phaseId: 3,
    name: 'Stage 8 — Payment Verification',
    phaseName: 'Payment Initiation & Verification',
    systemDomain: 'Payment Gateway',
    description: 'Backend validates digital signature and status directly with gateway API/webhooks, ignoring raw client responses.',
    recommendedRole: 'Server Webhook Verifier',
    domainStatusImpact: { paymentStatus: 'Pending Verification' },
    keyArtifacts: ['HMAC Webhook Signature', 'Gateway Transaction Reference', 'Card/Wallet Auth Token']
  },
  {
    id: 9,
    phaseId: 3,
    name: 'Stage 9 — Payment Succeeds',
    phaseName: 'Payment Initiation & Verification',
    systemDomain: 'Payment Gateway',
    description: 'Financial settlement confirmed; payment status transitions to Paid, unlocking warehouse fulfillment pipeline.',
    recommendedRole: 'Financial Settlement Service',
    domainStatusImpact: { orderStatus: 'Confirmed', paymentStatus: 'Paid' },
    keyArtifacts: ['Payment Authorization Code', 'Settlement Timestamp', 'Electronic Receipt Token']
  },

  // Phase 4: Inventory Management & Allocation
  {
    id: 10,
    phaseId: 4,
    name: 'Stage 10 — Reserve Inventory',
    phaseName: 'Inventory Management & Allocation',
    systemDomain: 'Inventory Ledger',
    description: 'System creates a temporary reservation lock on available stock to block double-selling while physical goods remain on shelves.',
    recommendedRole: 'Inventory Reservation Daemon',
    domainStatusImpact: { fulfillmentStatus: 'Reserved' },
    keyArtifacts: ['Reservation UUID', 'Stock Lock Counter', 'Reservation TTL Expiry']
  },
  {
    id: 11,
    phaseId: 4,
    name: 'Stage 11 — Inventory Allocation',
    phaseName: 'Inventory Management & Allocation',
    systemDomain: 'Inventory Ledger',
    description: 'Allocation algorithm routes order to the optimal warehouse or retail store based on geographic proximity and batch availability.',
    recommendedRole: 'Allocation & Routing Engine',
    domainStatusImpact: { fulfillmentStatus: 'Allocated' },
    keyArtifacts: ['Assigned Warehouse Node', 'Bin/Aisle Route Map', 'Multi-source Split Config']
  },
  {
    id: 12,
    phaseId: 4,
    name: 'Stage 12 — Fulfillment Order Created',
    phaseName: 'Inventory Management & Allocation',
    systemDomain: 'Warehouse WMS',
    description: 'Order transitions from commercial domain into physical fulfillment domain, decoupling sales from physical handling.',
    recommendedRole: 'Warehouse Management System (WMS)',
    domainStatusImpact: { fulfillmentStatus: 'Allocated' },
    keyArtifacts: ['Fulfillment Order Doc', 'Warehouse Route Ticket', 'Domain Boundary Split']
  },

  // Phase 5: Warehouse & Fulfillment Operations
  {
    id: 13,
    phaseId: 5,
    name: 'Stage 13 — Warehouse Receives Pick Task',
    phaseName: 'Warehouse & Fulfillment Operations',
    systemDomain: 'Warehouse WMS',
    description: 'WMS generates an optimized wave/item pick task for warehouse picker with location bins and item sequences.',
    recommendedRole: 'Warehouse Dispatcher / WMS',
    domainStatusImpact: { fulfillmentStatus: 'Pick Task Generated' },
    keyArtifacts: ['Pick Task ID', 'Picker Staff Assignment', 'Optimized Picking Path']
  },
  {
    id: 14,
    phaseId: 5,
    name: 'Stage 14 — Picking',
    phaseName: 'Warehouse & Fulfillment Operations',
    systemDomain: 'Warehouse WMS',
    description: 'Worker navigates aisles and scans item barcodes with handheld terminal to guarantee picking accuracy.',
    recommendedRole: 'Warehouse Floor Staff (Picker)',
    domainStatusImpact: { fulfillmentStatus: 'Picking' },
    requiresProofOrAction: true,
    keyArtifacts: ['Scanned Barcode Logs', 'Item Pick Timestamps', 'Bin Location Confirmation']
  },
  {
    id: 15,
    phaseId: 5,
    name: 'Stage 15 — Picking Exception',
    phaseName: 'Warehouse & Fulfillment Operations',
    systemDomain: 'Warehouse WMS',
    description: 'If items are damaged or missing, an exception is logged to trigger manager intervention instead of silent quantity drops.',
    recommendedRole: 'Warehouse Exception Handler / Inventory Manager',
    domainStatusImpact: { fulfillmentStatus: 'Pick Exception' },
    keyArtifacts: ['Exception Log', 'Damaged Item Report', 'Inventory Cycle Count Trigger']
  },
  {
    id: 16,
    phaseId: 5,
    name: 'Stage 16 — Packing',
    phaseName: 'Warehouse & Fulfillment Operations',
    systemDomain: 'Warehouse WMS',
    description: 'Items packaged into appropriate corrugated box; packing slip inserted, packaging dimensions and gross weight recorded.',
    recommendedRole: 'Packing Station Associate',
    domainStatusImpact: { fulfillmentStatus: 'Packing' },
    requiresProofOrAction: true,
    keyArtifacts: ['Box Type & Dimensions (cm)', 'Gross Weight (kg)', 'Packing Slip Record']
  },
  {
    id: 17,
    phaseId: 5,
    name: 'Stage 17 — Quality/Control Check',
    phaseName: 'Warehouse & Fulfillment Operations',
    systemDomain: 'Warehouse WMS',
    description: 'Final verification performed; serial numbers recorded for high-value items and security tamper seals affixed.',
    recommendedRole: 'Quality Assurance Inspector',
    domainStatusImpact: { fulfillmentStatus: 'QC Passed' },
    requiresProofOrAction: true,
    keyArtifacts: ['QC Pass Stamp', 'Serial Numbers Ledger', 'Security Tamper Seal ID']
  },

  // Phase 6: Shipping & Courier Handover
  {
    id: 18,
    phaseId: 6,
    name: 'Stage 18 — Shipping Label Generated',
    phaseName: 'Shipping & Courier Handover',
    systemDomain: 'Logistics Courier',
    description: 'System communicates with carrier API to generate master tracking number and prints high-contrast Code-128 shipping label.',
    recommendedRole: 'Shipping Logistics Coordinator',
    domainStatusImpact: { shipmentStatus: 'Label Generated' },
    keyArtifacts: ['Master Tracking Number', 'Thermal Shipping Label SVG/PDF', 'Carrier Manifest ID']
  },
  {
    id: 19,
    phaseId: 6,
    name: 'Stage 19 — Courier Assignment',
    phaseName: 'Shipping & Courier Handover',
    systemDomain: 'Logistics Courier',
    description: 'Logistics dispatch assigns package to specific carrier fleet, delivery route, and registered courier driver.',
    recommendedRole: 'Fleet Dispatcher / Courier Platform',
    domainStatusImpact: { shipmentStatus: 'Courier Assigned' },
    keyArtifacts: ['Assigned Driver Name & Phone', 'Vehicle License Plate', 'Route Runsheet ID']
  },
  {
    id: 20,
    phaseId: 6,
    name: 'Stage 20 — Warehouse Dispatch',
    phaseName: 'Shipping & Courier Handover',
    systemDomain: 'Warehouse WMS',
    description: 'Package physically transferred from loading bay to courier vehicle; bilateral electronic signature confirms dock handover.',
    recommendedRole: 'Dock Supervisor & Courier Driver',
    domainStatusImpact: { fulfillmentStatus: 'Fulfilled', shipmentStatus: 'Dispatched' },
    requiresProofOrAction: true,
    keyArtifacts: ['Warehouse Dock Handover Signature', 'Driver Custody Receipt', 'Dispatch Timestamp']
  },
  {
    id: 21,
    phaseId: 6,
    name: 'Stage 21 — Customer Tracking',
    phaseName: 'Shipping & Courier Handover',
    systemDomain: 'CRM/Post-Sales',
    description: 'Public tracking URL activated; automated notifications (Email/SMS/WhatsApp) dispatched to customer with carrier ETA.',
    recommendedRole: 'Customer Notification Gateway',
    domainStatusImpact: { shipmentStatus: 'In Transit' },
    keyArtifacts: ['Customer Tracking Link', 'Dispatched SMS/Email Payload', 'Live GPS Feed Token']
  },
  {
    id: 22,
    phaseId: 6,
    name: 'Stage 22 — Shipment Moves Through Logistics',
    phaseName: 'Shipping & Courier Handover',
    systemDomain: 'Logistics Courier',
    description: 'Automated telemetry logs intermediate sorting hubs, regional distribution cross-docks, and air/road transit checkpoints.',
    recommendedRole: 'Carrier EDI / Webhook Ingestion',
    domainStatusImpact: { shipmentStatus: 'In Transit' },
    keyArtifacts: ['Hub Checkpoint Telemetry', 'Transit Timestamp', 'Facility Code']
  },

  // Phase 7: Last-Mile Delivery & Completion
  {
    id: 23,
    phaseId: 7,
    name: 'Stage 23 — Out for Delivery',
    phaseName: 'Last-Mile Delivery & Completion',
    systemDomain: 'Last Mile',
    description: 'Package loaded onto last-mile delivery van; system fires customer proximity alert and real-time live courier map.',
    recommendedRole: 'Last-Mile Courier Driver',
    domainStatusImpact: { shipmentStatus: 'Out for Delivery' },
    keyArtifacts: ['Proximity Notification', 'Driver Active ETA', 'Last-Mile Route Map']
  },
  {
    id: 24,
    phaseId: 7,
    name: 'Stage 24 — Delivery Attempt',
    phaseName: 'Last-Mile Delivery & Completion',
    systemDomain: 'Last Mile',
    description: 'Courier arrives at destination, verifies recipient identity, and requests delivery One-Time Passcode (OTP) verification.',
    recommendedRole: 'Courier Driver & Recipient',
    domainStatusImpact: { shipmentStatus: 'Delivery Attempted' },
    requiresProofOrAction: true,
    keyArtifacts: ['6-Digit Delivery OTP Verification', 'Recipient Identity Check', 'Attempt Geo-Timestamp']
  },
  {
    id: 25,
    phaseId: 7,
    name: 'Stage 25 — Proof of Delivery',
    phaseName: 'Last-Mile Delivery & Completion',
    systemDomain: 'Last Mile',
    description: 'Digital signature, doorstep photo verification, and GPS geofence coordinates saved to create an undeniable delivery record.',
    recommendedRole: 'Courier Driver (Handheld POD)',
    domainStatusImpact: { shipmentStatus: 'Delivered' },
    requiresProofOrAction: true,
    keyArtifacts: ['Digital Recipient Signature', 'Doorstep Delivery Photo', 'GPS Geofence Assertion']
  },
  {
    id: 26,
    phaseId: 7,
    name: 'Stage 26 — Inventory is Finally Completed',
    phaseName: 'Last-Mile Delivery & Completion',
    systemDomain: 'Inventory Ledger',
    description: 'With delivery verified, temporary reservation is converted into an immutable inventory journal stock reduction on the ledger.',
    recommendedRole: 'General Ledger Stock Service',
    domainStatusImpact: { fulfillmentStatus: 'Fulfilled' },
    keyArtifacts: ['Immutable Ledger Journal UUID', 'Stock Reduction Final Entry', 'COGS Balance Posting']
  },
  {
    id: 27,
    phaseId: 7,
    name: 'Stage 27 — Order Completed',
    phaseName: 'Last-Mile Delivery & Completion',
    systemDomain: 'Auditing',
    description: 'Commercial and physical fulfillment lifecycles officially finalized and archived into historical audit logs.',
    recommendedRole: 'Order Management Audit Engine',
    domainStatusImpact: { orderStatus: 'Completed', fulfillmentStatus: 'Fulfilled', shipmentStatus: 'Delivered' },
    keyArtifacts: ['Archival Master Record', 'Audit Trail Digest', 'Lifecycle Completion Stamp']
  },
  {
    id: 28,
    phaseId: 7,
    name: 'Stage 28 — Customer Notification',
    phaseName: 'Last-Mile Delivery & Completion',
    systemDomain: 'CRM/Post-Sales',
    description: 'Delivery confirmation SMS/Email dispatched along with electronic final tax invoice and customer receipt.',
    recommendedRole: 'CRM Notification Dispatcher',
    domainStatusImpact: { orderStatus: 'Completed' },
    keyArtifacts: ['Delivered Confirmation Email', 'Final Tax Invoice PDF', 'SMS Delivery Receipt']
  },
  {
    id: 29,
    phaseId: 7,
    name: 'Stage 29 — Review/Request Feedback',
    phaseName: 'Last-Mile Delivery & Completion',
    systemDomain: 'CRM/Post-Sales',
    description: 'Platform prompts customer for delivery courier rating and verified product star reviews with photo uploads.',
    recommendedRole: 'Product Review & NPS Engine',
    domainStatusImpact: { orderStatus: 'Completed' },
    requiresProofOrAction: true,
    keyArtifacts: ['Customer NPS Rating', 'Product Star Review', 'Courier Driver Rating']
  },

  // Phase 8: Post-Delivery (Returns & Refunds)
  {
    id: 30,
    phaseId: 8,
    name: 'Stage 30 — Returns and Refunds',
    phaseName: 'Post-Delivery (Returns & Refunds)',
    systemDomain: 'CRM/Post-Sales',
    description: 'Customer RMA request triggers reverse courier pickup, condition inspection, item restocking, and financial refund issuance.',
    recommendedRole: 'Reverse Logistics & Claims Specialist',
    domainStatusImpact: { returnStatus: 'Return Requested' },
    requiresProofOrAction: true,
    keyArtifacts: ['RMA Claim Number', 'Reverse Logistics Tracking', 'Restock Inspection & Refund Credit']
  }
];

export class OrderLifecycleService {
  /**
   * Initializes or normalizes the 30-stage lifecycle structure for an order
   */
  static initializeOrderLifecycle(order: Order, startStageId: number = 6): {
    domainStatuses: OrderLifecycleDomainStatuses;
    stages: OrderLifecycleStageRecord[];
    currentStageId: number;
    currentPhaseId: number;
  } {
    const timestamp = order.date || new Date().toISOString();

    // Determine initial domain statuses based on order status
    let orderStatus: OrderDomainOrderStatus = 'Confirmed';
    let paymentStatus: OrderDomainPaymentStatus = 'Paid';
    let fulfillmentStatus: OrderDomainFulfillmentStatus = 'Allocated';
    let shipmentStatus: OrderDomainShipmentStatus = 'Unshipped';
    let returnStatus: OrderDomainReturnStatus = 'None';

    if (order.status === 'Pending Payment') {
      orderStatus = 'Submitted';
      paymentStatus = 'Pending Verification';
      fulfillmentStatus = 'Reserved';
      startStageId = 7;
    } else if (order.status === 'Completed' || order.deliveryStatus === 'Delivered') {
      orderStatus = 'Completed';
      paymentStatus = 'Paid';
      fulfillmentStatus = 'Fulfilled';
      shipmentStatus = 'Delivered';
      startStageId = 27;
    } else if (order.status === 'Dispatched' || order.deliveryStatus === 'Dispatched') {
      orderStatus = 'In Progress';
      paymentStatus = 'Paid';
      fulfillmentStatus = 'Fulfilled';
      shipmentStatus = 'Dispatched';
      startStageId = 21;
    } else if (order.refundRequested || order.status === 'Refund Requested') {
      returnStatus = 'Return Requested';
      startStageId = 30;
    }

    const domainStatuses: OrderLifecycleDomainStatuses = order.lifecycleDomainStatuses || {
      orderStatus,
      paymentStatus,
      fulfillmentStatus,
      shipmentStatus,
      returnStatus,
      lastUpdated: timestamp
    };

    // Build all 30 stages
    const existingStagesMap = new Map((order.lifecycleStages || []).map(s => [s.stageId, s]));
    const stages: OrderLifecycleStageRecord[] = ORDER_LIFECYCLE_STAGES.map(def => {
      const existing = existingStagesMap.get(def.id);
      if (existing) return existing;

      let status: LifecycleStageStatus = 'pending';
      let stageTimestamp: string | undefined = undefined;

      if (def.id < startStageId) {
        status = 'completed';
        stageTimestamp = timestamp;
      } else if (def.id === startStageId) {
        status = 'in_progress';
        stageTimestamp = timestamp;
      }

      return {
        stageId: def.id,
        phaseId: def.phaseId,
        stageName: def.name,
        phaseName: def.phaseName,
        status,
        timestamp: stageTimestamp,
        actor: def.recommendedRole,
        actorRole: def.recommendedRole,
        systemModule: def.systemDomain,
        notes: `Initialized stage ${def.id} for order ${order.orderNumber || order.id}`
      };
    });

    const currentDef = ORDER_LIFECYCLE_STAGES.find(s => s.id === startStageId) || ORDER_LIFECYCLE_STAGES[0];

    return {
      domainStatuses,
      stages,
      currentStageId: startStageId,
      currentPhaseId: currentDef.phaseId
    };
  }

  /**
   * Advances an order to a specific stage, updating independent domain statuses accurately
   */
  static transitionToStage(
    order: Order,
    targetStageId: number,
    options?: {
      actorName?: string;
      actorRole?: string;
      notes?: string;
      metadata?: Record<string, any>;
      customDomainStatuses?: Partial<OrderLifecycleDomainStatuses>;
    }
  ): Order {
    const { domainStatuses, stages } = order.lifecycleStages && order.lifecycleDomainStatuses 
      ? { domainStatuses: { ...order.lifecycleDomainStatuses }, stages: [...order.lifecycleStages] }
      : this.initializeOrderLifecycle(order, targetStageId);

    const nowIso = new Date().toISOString();
    const stageDef = ORDER_LIFECYCLE_STAGES.find(s => s.id === targetStageId);
    if (!stageDef) return order;

    // Apply domain status impact from definition
    if (stageDef.domainStatusImpact.orderStatus) domainStatuses.orderStatus = stageDef.domainStatusImpact.orderStatus;
    if (stageDef.domainStatusImpact.paymentStatus) domainStatuses.paymentStatus = stageDef.domainStatusImpact.paymentStatus;
    if (stageDef.domainStatusImpact.fulfillmentStatus) domainStatuses.fulfillmentStatus = stageDef.domainStatusImpact.fulfillmentStatus;
    if (stageDef.domainStatusImpact.shipmentStatus) domainStatuses.shipmentStatus = stageDef.domainStatusImpact.shipmentStatus;
    if (stageDef.domainStatusImpact.returnStatus) domainStatuses.returnStatus = stageDef.domainStatusImpact.returnStatus;

    // Merge custom overrides if any
    if (options?.customDomainStatuses) {
      Object.assign(domainStatuses, options.customDomainStatuses);
    }
    domainStatuses.lastUpdated = nowIso;

    // Update stages array
    const updatedStages = stages.map(stg => {
      if (stg.stageId < targetStageId) {
        return {
          ...stg,
          status: stg.status === 'pending' ? 'completed' : stg.status,
          timestamp: stg.timestamp || nowIso
        };
      }
      if (stg.stageId === targetStageId) {
        return {
          ...stg,
          status: 'completed' as LifecycleStageStatus,
          timestamp: nowIso,
          actor: options?.actorName || stg.actor,
          actorRole: options?.actorRole || stg.actorRole,
          notes: options?.notes || stg.notes,
          metadata: options?.metadata ? { ...stg.metadata, ...options.metadata } : stg.metadata
        };
      }
      return stg;
    });

    // Create enhanced order
    const updatedOrder: Order = {
      ...order,
      lifecycleDomainStatuses: domainStatuses,
      lifecycleStages: updatedStages,
      currentLifecycleStageId: targetStageId,
      currentLifecyclePhaseId: stageDef.phaseId
    };

    // Reflect onto legacy status fields for backwards compatibility
    if (domainStatuses.returnStatus === 'Return Requested') {
      updatedOrder.status = 'Refund Requested';
      updatedOrder.refundRequested = true;
    } else if (domainStatuses.shipmentStatus === 'Delivered') {
      updatedOrder.status = 'Completed';
      updatedOrder.deliveryStatus = 'Delivered';
      updatedOrder.deliveredDate = updatedOrder.deliveredDate || nowIso;
      updatedOrder.deliveredTimestamp = updatedOrder.deliveredTimestamp || Date.now();
    } else if (domainStatuses.shipmentStatus === 'Out for Delivery') {
      updatedOrder.status = 'Out for Delivery';
      updatedOrder.deliveryStatus = 'Out for Delivery';
    } else if (domainStatuses.shipmentStatus === 'Dispatched') {
      updatedOrder.status = 'Dispatched';
      updatedOrder.deliveryStatus = 'Dispatched';
    } else if (domainStatuses.paymentStatus === 'Paid') {
      if (updatedOrder.status === 'Pending Payment') {
        updatedOrder.status = 'Processing';
      }
    }

    return updatedOrder;
  }

  /**
   * Generates mock proof of delivery record with signature, OTP and geofence
   */
  static createProofOfDelivery(order: Order, customData?: Partial<ProofOfDeliveryData>): ProofOfDeliveryData {
    return {
      podId: `POD-${order.id.slice(-6).toUpperCase()}-${Date.now().toString().slice(-4)}`,
      recipientName: order.customerName || 'Customer Recipient',
      recipientPhone: order.customerPhone || '+232 76 555-019',
      deliveryTimestamp: new Date().toISOString(),
      deliveryOtpVerified: true,
      deliveryOtpCode: '849201',
      courierId: 'COUR-SL-402',
      courierName: 'Ibrahim Kamara (Sierra Express Fleet)',
      signatureDataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><path d="M 10 40 Q 50 10 90 40 T 170 30" fill="none" stroke="%231e293b" stroke-width="3"/></svg>',
      gpsCoordinates: {
        latitude: 8.4844,
        longitude: -13.2344,
        accuracyMeters: 4.2
      },
      notes: 'Delivered directly to recipient at front door. Verified via OTP & photo capture.',
      ...customData
    };
  }

  /**
   * Generates mock warehouse fulfillment details (Pick, Pack, QC)
   */
  static createWarehouseFulfillmentData(order: Order): WarehouseFulfillmentData {
    return {
      fulfillmentOrderId: `FO-${order.id.replace(/[^0-9]/g, '') || '89201'}`,
      assignedWarehouseId: 'WH-FREETOWN-CENTRAL',
      assignedWarehouseName: 'Freetown Central Logistics Hub (Facility #1)',
      pickTaskId: `PICK-${order.id.slice(-6).toUpperCase()}`,
      pickerStaffId: 'STF-WH-08',
      pickerStaffName: 'Mohamed Sesay (Pick Lead)',
      pickedItems: order.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        variantSku: item.variantSku || 'DEFAULT-SKU',
        barcodeScanned: `EAN-${item.productId.slice(-8)}`,
        scannedValid: true,
        quantity: item.quantity
      })),
      packageDetails: {
        boxType: 'Heavy-Duty Corrugated Box B2',
        dimensionsCm: { length: 32, width: 24, height: 18 },
        grossWeightKg: 1.85,
        packedByStaffName: 'Fatmata Conteh (Packer #4)',
        packedAt: new Date().toISOString()
      },
      qcInspection: {
        passed: true,
        inspectorName: 'Alhaji Koroma (Senior QA Lead)',
        inspectedAt: new Date().toISOString(),
        serialNumbersRecorded: order.items.map((it, idx) => `SN-${it.productId.slice(0, 4).toUpperCase()}-983021-${idx + 1}`),
        tamperSealNumber: 'SEAL-SEC-99824'
      }
    };
  }

  /**
   * Generates mock shipping handover data with barcode and driver details
   */
  static createShippingHandoverData(order: Order): ShippingHandoverData {
    const trackingNumber = order.trackingNumber || `SL-EXP-${order.id.replace(/[^0-9]/g, '') || '77890'}`;
    return {
      shipmentId: `SHP-${order.id.slice(-6).toUpperCase()}`,
      trackingNumber,
      carrierId: 'CARRIER-SL-EXPRESS',
      carrierName: 'Sierra Express Courier Services (Freetown Hub)',
      courierDriverName: 'Ibrahim Kamara',
      courierDriverPhone: '+232 78 889900',
      vehiclePlate: 'SL-RC-4892-A',
      dispatchedAt: new Date().toISOString(),
      warehouseHandoverConfirmedBy: 'Fatmata Conteh (Dock Lead)',
      courierHandoverConfirmedBy: 'Ibrahim Kamara (Driver)',
      shippingLabelBarcodeSvg: generateBarcodeSvg(trackingNumber, { width: 260, height: 48 }),
      transitCheckpoints: [
        {
          location: 'Freetown Central Hub (Facility #1)',
          statusText: 'Package sorted and scanned into dispatch container',
          timestamp: new Date(Date.now() - 3600 * 1000).toISOString(),
          facilityName: 'Freetown Central Sorting'
        },
        {
          location: 'Western Area Distribution Cross-Dock',
          statusText: 'In Transit — Departed sort facility on route to destination node',
          timestamp: new Date().toISOString(),
          facilityName: 'WA Distribution Node'
        }
      ]
    };
  }
}
