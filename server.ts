import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { getApps, cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenAI } from '@google/genai';
import { validateCartBackend, validateCouponAuthoritative, SERVER_PROMOTIONS_REGISTRY } from './src/server/cartValidator';
import { 
  reserveInventoryServer, 
  finalizeReservationServer, 
  releaseReservationServer, 
  getActiveReservationsServer,
  getActiveReservedQuantity
} from './src/server/inventoryReservationManager';
import { 
  getTenantConfigBySlug, 
  getTenantProducts, 
  getTenantProductBySlugOrId,
  getTenantCategories,
  getTenantBrands
} from './src/server/tenantManager';
import { INITIAL_PRODUCTS } from './src/data/mockData';
import { slugify } from './src/utils/seoUtils';
import { DEFAULT_ROLE_PERMISSIONS, ALL_PERMISSION_KEYS } from './src/utils/permissions';
import { transitionPaymentState, type PaymentState } from './src/server/paymentState';
import { sanitizeMonimeConfigResponse } from './src/server/monimePaymentState';
import {
  extractAuthenticatedTenantId,
  assertTenantStaffAccess,
  assertStaffRoleManagementAllowed,
  assertNotSelfRoleChange,
  normalizeStaffPayload,
  isSelfStaffOperation,
  createStaffStatusAuditRecord,
} from './src/server/tenantStaffAuth';
import {
  establishTenantSecurityContext,
  assertCallerIsOwner,
  assertOwnershipTransferAllowed,
  assertNotTenantOwnerDeletion,
  assertNotTenantOwnerDemotion,
  assertNotTenantOwnerSuspension,
  evaluateActiveTenantMembership,
  sanitizeTenantUpdatePayload,
  createOwnershipTransferAuditRecord,
} from './src/server/tenantOwnershipAuth';
import { assertPlatformAdmin } from './src/server/platformAdminAuth';
import { findPlatformAdminByUid } from './src/server/platformIdentityControlPlane';
import { registerPlatformAdminRoutes } from './src/server/platformAdminRoutes';
import { startPlatformScheduler, stopPlatformScheduler } from './src/server/platformScheduler';
import { addUsageEventToTransaction, evaluateUsageLimit, usagePeriod, usageMeterId, USAGE_METER_COLLECTION } from './src/server/platformUsageMeter';
import { DEFAULT_PLATFORM_PLANS } from './src/server/platformAdminControlPlane';
import { validateTenantProvisioningRequest, hashProvisioningIdempotencyKey, buildTenantProvisioningRecords } from './src/server/tenantProvisioning';
import { validateBusinessRegistrationRequest, hashBusinessRegistrationKey, buildBusinessRegistrationRecords } from './src/server/businessRegistration';
import { evaluateBusinessOnboardingReadiness } from './src/server/businessOnboarding';
import { registerTenantCatalogRoutes } from './src/server/tenantCatalog';
import { registerTenantInventoryRoutes } from './src/server/tenantInventory';
import { registerTenantPosRoutes } from './src/server/tenantPos';
import { registerTenantStorefrontRoutes } from './src/server/tenantStorefront';
import { buildDefaultStorefrontRecord } from './src/server/tenantStorefront';
import { registerStorefrontCheckoutRoutes } from './src/server/storefrontCheckout';
import {
  createAuthoritativeAuditRecord,
  recordAuditEvent,
  updateAuthoritativeSecurityMetrics,
  queryTenantAuditLogs,
} from './src/server/auditService';
