import crypto from 'node:crypto';
import {
  createPlatformAlert,
  type PlatformAlert,
  type CreateAlertParams,
  type PlatformAlertStatus,
} from './platformAlertControlPlane';
import {
  calculateTenantHealth,
  DEFAULT_PLATFORM_PLANS,
  type TenantHealthInfo,
} from './platformAdminControlPlane';
import {
  usageMeterId,
  usagePeriod,
  USAGE_METER_COLLECTION,
} from './platformUsageMeter';
import {
  createAuthoritativeAuditRecord,
  recordAuditEvent,
} from './auditService';

export const AUTOMATION_SYSTEM_ACTOR = {
  uid: 'system_health_engine',
  email: 'system.health@markithub.internal',
  role: 'Automated Platform Engine',
};

export interface TenantEvaluationResult {
  tenantId: string;
  tenantName: string;
  status: 'ok' | 'issues_detected' | 'failed';
  activeConditions: string[];
  clearedConditions: string[];
  createdAlerts: string[];
  resolvedAlerts: string[];
  error?: string;
}

export interface HealthEvaluationResult {
  processedTenants: number;
  succeededTenants: number;
  failedTenants: number;
  alertsCreated: number;
  alertsResolved: number;
  tenantResults: TenantEvaluationResult[];
  errors: Array<{ tenantId: string; error: string }>;
  evaluatedAt: string;
  durationMs: number;
}

export interface PlatformHealthEvaluationOptions {
  batchSize?: number;
  tenantIds?: string[];
  provisioningDelayThresholdMinutes?: number;
}

/**
 * Resolves an active platform alert with an authoritative audit record.
 */
export async function autoResolvePlatformAlert(
  db: any,
  alert: PlatformAlert,
  reason: string
): Promise<PlatformAlert> {
  const now = new Date().toISOString();
  const alertRef = db.collection('platform_alerts').doc(alert.alertId);

  const updatedAlert: PlatformAlert = {
    ...alert,
    status: 'RESOLVED',
    resolvedAt: now,
    resolvedBy: AUTOMATION_SYSTEM_ACTOR.email,
    resolutionReason: reason,
    updatedAt: now,
    metadata: {
      ...(alert.metadata || {}),
      autoResolved: true,
      resolvedBySystem: true,
    },
    resolutionHistory: [
      ...(alert.resolutionHistory || []),
      {
        status: 'RESOLVED' as PlatformAlertStatus,
        timestamp: now,
        actorUid: AUTOMATION_SYSTEM_ACTOR.uid,
        actorEmail: AUTOMATION_SYSTEM_ACTOR.email,
        actorRole: AUTOMATION_SYSTEM_ACTOR.role,
        reason,
      },
    ],
  };

  // Authoritative audit event
  const auditRecord = createAuthoritativeAuditRecord({
    tenantId: alert.tenantId || 'PLATFORM_CONTROL_PLANE',
    actorUid: AUTOMATION_SYSTEM_ACTOR.uid,
    actorEmail: AUTOMATION_SYSTEM_ACTOR.email,
    actorRole: AUTOMATION_SYSTEM_ACTOR.role,
    action: 'AUTOMATED_ALERT_RESOLVED',
    module: 'platform_alerts',
    targetType: 'alert',
    targetId: alert.alertId,
    targetName: alert.title,
    reason,
    result: 'success',
    severity: 'info',
    details: `Automated Platform Health Engine resolved alert '${alert.title}'. Reason: ${reason}`,
    previousState: { status: alert.status },
    newState: {
      status: 'RESOLVED',
      resolvedAt: now,
      resolvedBy: AUTOMATION_SYSTEM_ACTOR.email,
      resolutionReason: reason,
    },
    metadata: {
      autoResolved: true,
      alertId: alert.alertId,
      dedupKey: alert.dedupKey,
    },
  });

  if (typeof db.batch === 'function') {
    const batch = db.batch();
    batch.set(alertRef, updatedAlert, { merge: true });
    batch.set(db.collection('audit_logs').doc(auditRecord.id), auditRecord);
    await batch.commit();
  } else {
    await alertRef.set(updatedAlert, { merge: true });
    await recordAuditEvent(db, auditRecord);
  }

  return updatedAlert;
}

/**
 * Evaluates operational conditions for a single tenant, raising idempotent alerts and auto-resolving cleared conditions.
 */
export async function evaluateTenantHealthAndAlerts(
  db: any,
  tenantDoc: { id: string; [key: string]: any },
  options?: { provisioningDelayThresholdMinutes?: number }
): Promise<TenantEvaluationResult> {
  const tenantId = tenantDoc.id;
  const data = tenantDoc;
  const tenantName = String(data.name || data.slug || tenantId);
  const provisioningThresholdMins = options?.provisioningDelayThresholdMinutes || 30;

  const now = new Date();
  const nowIso = now.toISOString();
  const currentPeriod = usagePeriod(now);

  const activeConditions: string[] = [];
  const clearedConditions: string[] = [];
  const createdAlerts: string[] = [];
  const resolvedAlerts: string[] = [];

  // 1. Fetch currently active (OPEN, ACKNOWLEDGED) alerts for this tenant
  const activeAlertsSnap = await db
    .collection('platform_alerts')
    .where('tenantId', '==', tenantId)
    .where('status', 'in', ['OPEN', 'ACKNOWLEDGED'])
    .get();

  const existingAlertsByDedupKey = new Map<string, PlatformAlert>();
  for (const doc of activeAlertsSnap.docs) {
    const alertData = doc.data() as PlatformAlert;
    if (alertData.dedupKey) {
      existingAlertsByDedupKey.set(alertData.dedupKey, { alertId: doc.id, ...alertData });
    }
  }

  // 2. Evaluate Tenant Lifecycle Conditions
  const lifecycleStatus = String(data.lifecycleStatus || 'active').toLowerCase();
  const provisioningStatus = String(data.provisioningStatus || '').toLowerCase();

  const dedupProvisioningFailure = `${tenantId}_PROVISIONING_FAILURE`;
  const dedupProvisioningDelayed = `${tenantId}_PROVISIONING_DELAYED`;
  const dedupSuspension = `${tenantId}_UNEXPECTED_SUSPENSION`;

  if (lifecycleStatus === 'provisioning') {
    if (provisioningStatus === 'failed') {
      activeConditions.push('PROVISIONING_FAILURE');
      const res = await createPlatformAlert(db, {
        tenantId,
        tenantName,
        source: 'provisioning',
        severity: 'CRITICAL',
        type: 'PROVISIONING_FAILURE',
        title: `Tenant Provisioning Failed: ${tenantName}`,
        description: `Tenant ${tenantName} failed during provisioning. Error details: ${data.provisioningError || 'Unknown failure'}`,
        dedupKey: dedupProvisioningFailure,
        metadata: {
          lifecycleStatus,
          provisioningStatus,
          error: data.provisioningError || null,
        },
      });
      if (res.isNew) {
        createdAlerts.push(res.alert.alertId);
        await recordAuditEvent(
          db,
          createAuthoritativeAuditRecord({
            tenantId,
            actorUid: AUTOMATION_SYSTEM_ACTOR.uid,
            actorEmail: AUTOMATION_SYSTEM_ACTOR.email,
            actorRole: AUTOMATION_SYSTEM_ACTOR.role,
            action: 'AUTOMATED_ALERT_CREATED',
            module: 'platform_alerts',
            targetType: 'alert',
            targetId: res.alert.alertId,
            targetName: res.alert.title,
            reason: res.alert.description,
            result: 'success',
            severity: 'critical',
            details: `Automated Platform Health Engine created alert '${res.alert.title}'.`,
          })
        );
      }
    } else {
      // Check provisioning age
      const createdAt = data.createdAt ? new Date(data.createdAt).getTime() : now.getTime();
      const ageMinutes = Math.max(0, (now.getTime() - createdAt) / (1000 * 60));
      if (ageMinutes >= provisioningThresholdMins) {
        activeConditions.push('PROVISIONING_DELAYED');
        const res = await createPlatformAlert(db, {
          tenantId,
          tenantName,
          source: 'provisioning',
          severity: 'WARNING',
          type: 'PROVISIONING_DELAYED',
          title: `Provisioning Delayed: ${tenantName}`,
          description: `Tenant ${tenantName} has been in provisioning state for ${Math.round(ageMinutes)} minutes (exceeds ${provisioningThresholdMins}m threshold).`,
          dedupKey: dedupProvisioningDelayed,
          metadata: {
            lifecycleStatus,
            ageMinutes: Math.round(ageMinutes),
          },
        });
        if (res.isNew) {
          createdAlerts.push(res.alert.alertId);
          await recordAuditEvent(
            db,
            createAuthoritativeAuditRecord({
              tenantId,
              actorUid: AUTOMATION_SYSTEM_ACTOR.uid,
              actorEmail: AUTOMATION_SYSTEM_ACTOR.email,
              actorRole: AUTOMATION_SYSTEM_ACTOR.role,
              action: 'AUTOMATED_ALERT_CREATED',
              module: 'platform_alerts',
              targetType: 'alert',
              targetId: res.alert.alertId,
              targetName: res.alert.title,
              reason: res.alert.description,
              result: 'success',
              severity: 'warning',
              details: `Automated Platform Health Engine created alert '${res.alert.title}'.`,
            })
          );
        }
      }
    }
  }

  // Auto-resolve provisioning alerts if lifecycle is not provisioning
  if (lifecycleStatus !== 'provisioning') {
    const activeProvFail = existingAlertsByDedupKey.get(dedupProvisioningFailure);
    if (activeProvFail) {
      clearedConditions.push('PROVISIONING_FAILURE');
      await autoResolvePlatformAlert(
        db,
        activeProvFail,
        `Automated health evaluation: provisioning condition cleared (tenant is now ${lifecycleStatus}).`
      );
      resolvedAlerts.push(activeProvFail.alertId);
    }
    const activeProvDelay = existingAlertsByDedupKey.get(dedupProvisioningDelayed);
    if (activeProvDelay) {
      clearedConditions.push('PROVISIONING_DELAYED');
      await autoResolvePlatformAlert(
        db,
        activeProvDelay,
        `Automated health evaluation: provisioning completed (tenant is now ${lifecycleStatus}).`
      );
      resolvedAlerts.push(activeProvDelay.alertId);
    }
  }

  // Suspension condition
  if (lifecycleStatus === 'suspended') {
    activeConditions.push('UNEXPECTED_SUSPENSION');
    const res = await createPlatformAlert(db, {
      tenantId,
      tenantName,
      source: 'lifecycle',
      severity: 'CRITICAL',
      type: 'UNEXPECTED_SUSPENSION',
      title: `Tenant Suspended: ${tenantName}`,
      description: `Tenant ${tenantName} is currently in suspended status. Reason: ${data.suspensionReason || 'Operational suspension'}`,
      dedupKey: dedupSuspension,
      metadata: {
        lifecycleStatus,
        reason: data.suspensionReason || null,
      },
    });
    if (res.isNew) {
      createdAlerts.push(res.alert.alertId);
      await recordAuditEvent(
        db,
        createAuthoritativeAuditRecord({
          tenantId,
          actorUid: AUTOMATION_SYSTEM_ACTOR.uid,
          actorEmail: AUTOMATION_SYSTEM_ACTOR.email,
          actorRole: AUTOMATION_SYSTEM_ACTOR.role,
          action: 'AUTOMATED_ALERT_CREATED',
          module: 'platform_alerts',
          targetType: 'alert',
          targetId: res.alert.alertId,
          targetName: res.alert.title,
          reason: res.alert.description,
          result: 'success',
          severity: 'critical',
          details: `Automated Platform Health Engine created alert '${res.alert.title}'.`,
        })
      );
    }
  } else {
    // Auto-resolve unexpected suspension if tenant is active
    const activeSusp = existingAlertsByDedupKey.get(dedupSuspension);
    if (activeSusp) {
      clearedConditions.push('UNEXPECTED_SUSPENSION');
      await autoResolvePlatformAlert(
        db,
        activeSusp,
        `Automated health evaluation: tenant suspension lifted, status is ${lifecycleStatus}.`
      );
      resolvedAlerts.push(activeSusp.alertId);
    }
  }

  // 3. Evaluate Billing & Subscription Conditions
  const subscription = data.subscription || {};
  const subStatus = String(subscription.status || 'trialing').toLowerCase();

  const dedupPastDue = `${tenantId}_PAST_DUE_SUBSCRIPTION`;
  const dedupPaymentFail = `${tenantId}_PAYMENT_FAILURE`;
  const dedupTrialExpiring = `${tenantId}_TRIAL_EXPIRING_SOON`;

  if (subStatus === 'past_due') {
    activeConditions.push('PAST_DUE_SUBSCRIPTION');
    const res = await createPlatformAlert(db, {
      tenantId,
      tenantName,
      source: 'billing',
      severity: 'WARNING',
      type: 'PAST_DUE_SUBSCRIPTION',
      title: `Past-Due Subscription: ${tenantName}`,
      description: `Tenant ${tenantName} has an overdue subscription payment. Plan: ${subscription.planId || 'Unknown'}`,
      dedupKey: dedupPastDue,
      metadata: {
        subscriptionStatus: subStatus,
        planId: subscription.planId || null,
      },
    });
    if (res.isNew) {
      createdAlerts.push(res.alert.alertId);
      await recordAuditEvent(
        db,
        createAuthoritativeAuditRecord({
          tenantId,
          actorUid: AUTOMATION_SYSTEM_ACTOR.uid,
          actorEmail: AUTOMATION_SYSTEM_ACTOR.email,
          actorRole: AUTOMATION_SYSTEM_ACTOR.role,
          action: 'AUTOMATED_ALERT_CREATED',
          module: 'platform_alerts',
          targetType: 'alert',
          targetId: res.alert.alertId,
          targetName: res.alert.title,
          reason: res.alert.description,
          result: 'success',
          severity: 'warning',
          details: `Automated Platform Health Engine created alert '${res.alert.title}'.`,
        })
      );
    }
  } else {
    const activePastDue = existingAlertsByDedupKey.get(dedupPastDue);
    if (activePastDue) {
      clearedConditions.push('PAST_DUE_SUBSCRIPTION');
      await autoResolvePlatformAlert(
        db,
        activePastDue,
        `Automated health evaluation: billing in good standing (subscription status is now ${subStatus}).`
      );
      resolvedAlerts.push(activePastDue.alertId);
    }
  }

  // Payment failure condition
  const isPaymentFailure =
    subStatus === 'cancelled' ||
    subStatus === 'unpaid' ||
    Boolean(data.paymentFailure);

  if (isPaymentFailure) {
    activeConditions.push('PAYMENT_FAILURE');
    const res = await createPlatformAlert(db, {
      tenantId,
      tenantName,
      source: 'billing',
      severity: 'CRITICAL',
      type: 'PAYMENT_FAILURE',
      title: `Payment Failure / Cancelled Subscription: ${tenantName}`,
      description: `Tenant ${tenantName} has experienced a payment failure or subscription cancellation.`,
      dedupKey: dedupPaymentFail,
      metadata: {
        subscriptionStatus: subStatus,
        paymentFailure: Boolean(data.paymentFailure),
      },
    });
    if (res.isNew) {
      createdAlerts.push(res.alert.alertId);
      await recordAuditEvent(
        db,
        createAuthoritativeAuditRecord({
          tenantId,
          actorUid: AUTOMATION_SYSTEM_ACTOR.uid,
          actorEmail: AUTOMATION_SYSTEM_ACTOR.email,
          actorRole: AUTOMATION_SYSTEM_ACTOR.role,
          action: 'AUTOMATED_ALERT_CREATED',
          module: 'platform_alerts',
          targetType: 'alert',
          targetId: res.alert.alertId,
          targetName: res.alert.title,
          reason: res.alert.description,
          result: 'success',
          severity: 'critical',
          details: `Automated Platform Health Engine created alert '${res.alert.title}'.`,
        })
      );
    }
  } else {
    const activePaymentFail = existingAlertsByDedupKey.get(dedupPaymentFail);
    if (activePaymentFail) {
      clearedConditions.push('PAYMENT_FAILURE');
      await autoResolvePlatformAlert(
        db,
        activePaymentFail,
        `Automated health evaluation: payment condition cleared, subscription is ${subStatus}.`
      );
      resolvedAlerts.push(activePaymentFail.alertId);
    }
  }

  // Trial expiring condition
  if (subStatus === 'trialing' && subscription.trialEndsAt) {
    const trialEnd = new Date(subscription.trialEndsAt).getTime();
    const daysRemaining = (trialEnd - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysRemaining <= 3 && daysRemaining >= 0) {
      activeConditions.push('TRIAL_EXPIRING_SOON');
      const res = await createPlatformAlert(db, {
        tenantId,
        tenantName,
        source: 'billing',
        severity: 'WARNING',
        type: 'TRIAL_EXPIRING_SOON',
        title: `Trial Expiring Soon: ${tenantName}`,
        description: `Trial for ${tenantName} expires in ${Math.max(1, Math.ceil(daysRemaining))} days.`,
        dedupKey: dedupTrialExpiring,
        metadata: {
          trialEndsAt: subscription.trialEndsAt,
          daysRemaining: Math.ceil(daysRemaining),
        },
      });
      if (res.isNew) {
        createdAlerts.push(res.alert.alertId);
      }
    } else {
      const activeTrial = existingAlertsByDedupKey.get(dedupTrialExpiring);
      if (activeTrial) {
        clearedConditions.push('TRIAL_EXPIRING_SOON');
        await autoResolvePlatformAlert(
          db,
          activeTrial,
          `Automated health evaluation: trial expiration condition no longer applies.`
        );
        resolvedAlerts.push(activeTrial.alertId);
      }
    }
  } else {
    const activeTrial = existingAlertsByDedupKey.get(dedupTrialExpiring);
    if (activeTrial) {
      clearedConditions.push('TRIAL_EXPIRING_SOON');
      await autoResolvePlatformAlert(
        db,
        activeTrial,
        `Automated health evaluation: subscription is now ${subStatus}.`
      );
      resolvedAlerts.push(activeTrial.alertId);
    }
  }

  // 4. Evaluate Metered Usage
  const meterDocId = usageMeterId(tenantId, currentPeriod);
  const meterSnap = await db.collection(USAGE_METER_COLLECTION).doc(meterDocId).get();
  const meterData = meterSnap.exists ? meterSnap.data() : null;

  const planId = subscription.planId || data.planId || 'free';
  const plan = DEFAULT_PLATFORM_PLANS.find(p => p.id === planId) || DEFAULT_PLATFORM_PLANS[0];
  const monthlyOrderLimit = subscription.overrideMonthlyOrders ?? plan.limits.ordersMonthly;
  const ordersUsed = meterData?.ordersMonthly || 0;
  const usagePercent = monthlyOrderLimit > 0 ? Math.round((ordersUsed / monthlyOrderLimit) * 100) : 0;
  const isOverrideActive = Boolean(subscription.overrideMonthlyOrders);

  const dedupUsageViolation = `${tenantId}_USAGE_LIMIT_VIOLATION_${currentPeriod}`;
  const dedupUsageApproaching = `${tenantId}_USAGE_LIMIT_APPROACHING_${currentPeriod}`;

  if (!isOverrideActive) {
    if (usagePercent >= 100) {
      activeConditions.push('USAGE_LIMIT_VIOLATION');
      const res = await createPlatformAlert(db, {
        tenantId,
        tenantName,
        source: 'usage',
        severity: 'CRITICAL',
        type: 'USAGE_LIMIT_VIOLATION',
        title: `Monthly Order Limit Exceeded: ${tenantName}`,
        description: `Tenant ${tenantName} has used ${ordersUsed} of ${monthlyOrderLimit} orders (${usagePercent}%) for period ${currentPeriod}.`,
        dedupKey: dedupUsageViolation,
        metadata: {
          period: currentPeriod,
          ordersUsed,
          monthlyOrderLimit,
          usagePercent,
        },
      });
      if (res.isNew) {
        createdAlerts.push(res.alert.alertId);
        await recordAuditEvent(
          db,
          createAuthoritativeAuditRecord({
            tenantId,
            actorUid: AUTOMATION_SYSTEM_ACTOR.uid,
            actorEmail: AUTOMATION_SYSTEM_ACTOR.email,
            actorRole: AUTOMATION_SYSTEM_ACTOR.role,
            action: 'AUTOMATED_ALERT_CREATED',
            module: 'platform_alerts',
            targetType: 'alert',
            targetId: res.alert.alertId,
            targetName: res.alert.title,
            reason: res.alert.description,
            result: 'success',
            severity: 'critical',
            details: `Automated Platform Health Engine created alert '${res.alert.title}'.`,
          })
        );
      }
      // If there was an approaching alert, auto-resolve it as it transitioned to violation
      const activeApproaching = existingAlertsByDedupKey.get(dedupUsageApproaching);
      if (activeApproaching) {
        clearedConditions.push('USAGE_LIMIT_APPROACHING');
        await autoResolvePlatformAlert(
          db,
          activeApproaching,
          `Automated health evaluation: transitioned from approaching to exceeded limit (${usagePercent}%).`
        );
        resolvedAlerts.push(activeApproaching.alertId);
      }
    } else if (usagePercent >= 80) {
      activeConditions.push('USAGE_LIMIT_APPROACHING');
      const res = await createPlatformAlert(db, {
        tenantId,
        tenantName,
        source: 'usage',
        severity: 'WARNING',
        type: 'USAGE_LIMIT_APPROACHING',
        title: `Approaching Order Limit: ${tenantName}`,
        description: `Tenant ${tenantName} has used ${ordersUsed} of ${monthlyOrderLimit} orders (${usagePercent}%) for period ${currentPeriod}.`,
        dedupKey: dedupUsageApproaching,
        metadata: {
          period: currentPeriod,
          ordersUsed,
          monthlyOrderLimit,
          usagePercent,
        },
      });
      if (res.isNew) {
        createdAlerts.push(res.alert.alertId);
      }
      // If there was an active violation alert and usage fell back below 100%, resolve violation
      const activeViolation = existingAlertsByDedupKey.get(dedupUsageViolation);
      if (activeViolation) {
        clearedConditions.push('USAGE_LIMIT_VIOLATION');
        await autoResolvePlatformAlert(
          db,
          activeViolation,
          `Automated health evaluation: usage returned below violation threshold (${usagePercent}%).`
        );
        resolvedAlerts.push(activeViolation.alertId);
      }
    } else {
      // Usage is healthy (< 80%)
      const activeViolation = existingAlertsByDedupKey.get(dedupUsageViolation);
      if (activeViolation) {
        clearedConditions.push('USAGE_LIMIT_VIOLATION');
        await autoResolvePlatformAlert(
          db,
          activeViolation,
          `Automated health evaluation: usage normalized to ${usagePercent}% of limit.`
        );
        resolvedAlerts.push(activeViolation.alertId);
      }
      const activeApproaching = existingAlertsByDedupKey.get(dedupUsageApproaching);
      if (activeApproaching) {
        clearedConditions.push('USAGE_LIMIT_APPROACHING');
        await autoResolvePlatformAlert(
          db,
          activeApproaching,
          `Automated health evaluation: usage normalized to ${usagePercent}% of limit.`
        );
        resolvedAlerts.push(activeApproaching.alertId);
      }
    }
  }

  // 5. Evaluate Operational Health Score
  const healthMetrics = calculateTenantHealth({
    lifecycleStatus: data.lifecycleStatus,
    provisioningStatus: data.provisioningStatus,
    subscriptionStatus: subscription.status,
    usagePercent,
    overrideActive: isOverrideActive,
    hasPaymentFailure: subscription.status === 'past_due',
    lastActivityAt: data.updatedAt,
    createdAt: data.createdAt,
  });
  const dedupHealthAtRisk = `${tenantId}_HEALTH_AT_RISK`;

  if (healthMetrics.status === 'AT_RISK') {
    activeConditions.push('HEALTH_AT_RISK');
    const res = await createPlatformAlert(db, {
      tenantId,
      tenantName,
      source: 'analytics',
      severity: 'WARNING',
      type: 'HEALTH_AT_RISK',
      title: `Tenant Operational Health At Risk: ${tenantName}`,
      description: `Tenant ${tenantName} operational health score is ${healthMetrics.healthScore}/100 with ${healthMetrics.reasons.length} risk factor(s).`,
      dedupKey: dedupHealthAtRisk,
      metadata: {
        healthScore: healthMetrics.healthScore,
        riskFactors: healthMetrics.reasons,
      },
    });
    if (res.isNew) {
      createdAlerts.push(res.alert.alertId);
    }
  } else {
    const activeHealthAlert = existingAlertsByDedupKey.get(dedupHealthAtRisk);
    if (activeHealthAlert) {
      clearedConditions.push('HEALTH_AT_RISK');
      await autoResolvePlatformAlert(
        db,
        activeHealthAlert,
        `Automated health evaluation: operational health restored (score: ${healthMetrics.healthScore}/100, status: ${healthMetrics.status}).`
      );
      resolvedAlerts.push(activeHealthAlert.alertId);
    }
  }

  return {
    tenantId,
    tenantName,
    status: activeConditions.length > 0 ? 'issues_detected' : 'ok',
    activeConditions,
    clearedConditions,
    createdAlerts,
    resolvedAlerts,
  };
}

/**
 * Performs a platform-wide health evaluation sweep across all tenants.
 * Resilient: an error evaluating one tenant will NOT abort the entire sweep.
 */
export async function evaluatePlatformHealth(
  db: any,
  options?: PlatformHealthEvaluationOptions
): Promise<HealthEvaluationResult> {
  const startTime = Date.now();
  const batchSize = options?.batchSize || 200;

  let tenantDocs: any[] = [];
  if (options?.tenantIds && options.tenantIds.length > 0) {
    const snapshots = await Promise.all(
      options.tenantIds.map(id => db.collection('tenants').doc(id).get())
    );
    tenantDocs = snapshots
      .filter((s: any) => s.exists)
      .map((s: any) => {
        try {
          return { id: s.id, ...s.data() };
        } catch (err: any) {
          return { id: s.id, _dataReadError: err?.message || 'Failed to read tenant document' };
        }
      });
  } else {
    const snap = await db.collection('tenants').limit(batchSize).get();
    tenantDocs = snap.docs.map((d: any) => {
      try {
        return { id: d.id, ...d.data() };
      } catch (err: any) {
        return { id: d.id, _dataReadError: err?.message || 'Failed to read tenant document' };
      }
    });
  }

  let processedTenants = 0;
  let succeededTenants = 0;
  let failedTenants = 0;
  let alertsCreated = 0;
  let alertsResolved = 0;

  const tenantResults: TenantEvaluationResult[] = [];
  const errors: Array<{ tenantId: string; error: string }> = [];

  for (const tenantDoc of tenantDocs) {
    processedTenants++;
    try {
      if ((tenantDoc as any)._dataReadError) {
        throw new Error((tenantDoc as any)._dataReadError);
      }
      const res = await evaluateTenantHealthAndAlerts(db, tenantDoc, {
        provisioningDelayThresholdMinutes: options?.provisioningDelayThresholdMinutes,
      });
      succeededTenants++;
      alertsCreated += res.createdAlerts.length;
      alertsResolved += res.resolvedAlerts.length;
      tenantResults.push(res);
    } catch (err: any) {
      failedTenants++;
      const errorMessage = err?.message || 'Unknown evaluation failure';
      errors.push({ tenantId: tenantDoc.id, error: errorMessage });
      tenantResults.push({
        tenantId: tenantDoc.id,
        tenantName: String(tenantDoc.name || tenantDoc.slug || tenantDoc.id),
        status: 'failed',
        activeConditions: [],
        clearedConditions: [],
        createdAlerts: [],
        resolvedAlerts: [],
        error: errorMessage,
      });

      // Authoritative audit event for tenant evaluation failure
      try {
        await recordAuditEvent(
          db,
          createAuthoritativeAuditRecord({
            tenantId: tenantDoc.id,
            actorUid: AUTOMATION_SYSTEM_ACTOR.uid,
            actorEmail: AUTOMATION_SYSTEM_ACTOR.email,
            actorRole: AUTOMATION_SYSTEM_ACTOR.role,
            action: 'PLATFORM_HEALTH_EVALUATION_FAILED',
            module: 'platform_health_engine',
            targetType: 'tenant',
            targetId: tenantDoc.id,
            targetName: String(tenantDoc.name || tenantDoc.id),
            reason: errorMessage,
            result: 'failed',
            severity: 'critical',
            details: `Failed to evaluate automated platform health for tenant ${tenantDoc.id}: ${errorMessage}`,
          })
        );
      } catch (auditErr) {
        console.error('Failed to log evaluation failure audit event:', auditErr);
      }
    }
  }

  const durationMs = Date.now() - startTime;

  return {
    processedTenants,
    succeededTenants,
    failedTenants,
    alertsCreated,
    alertsResolved,
    tenantResults,
    errors,
    evaluatedAt: new Date().toISOString(),
    durationMs,
  };
}
