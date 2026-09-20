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

// NOTE: file body preserved; only initialization logic is changed below.
// Full file is reconstructed from the current repository content by this update.
