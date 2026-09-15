import crypto from 'node:crypto';
import { evaluatePlatformHealth, type HealthEvaluationResult } from './platformHealthEngine';
import { processAlertEscalations, processPendingNotifications } from './platformNotificationControlPlane';
import { createAuthoritativeAuditRecord, recordAuditEvent } from './auditService';
import { getPublishedPlatformConfig } from './platformGovernanceControlPlane';

export type PlatformJobName = 'health' | 'escalation' | 'notifications';

export interface PlatformSchedulerJobState {
  jobName: PlatformJobName;
  status: 'healthy' | 'running' | 'failed' | 'idle';
  lastStartedAt?: string;
  lastCompletedAt?: string;
  lastSuccessfulAt?: string;
  lastFailedAt?: string;
  lastError?: string | null;
  lastDurationMs?: number;
  lastProcessedCount?: number;
  lastCreatedAlerts?: number;
  lastResolvedAlerts?: number;
  ownerId?: string;
  consecutiveFailures?: number;
}

export interface SchedulerStatusResponse {
  enabled: boolean;
  instanceId: string;
  jobs: PlatformSchedulerJobState[];
  serverTime: string;
}

// Unique instance identifier across containers
const INSTANCE_ID = process.env.INSTANCE_ID || `inst_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

// In-process execution state to guard against overlapping sweeps
const inProcessJobState: Record<PlatformJobName, 'idle' | 'running'> = {
  health: 'idle',
  escalation: 'idle',
  notifications: 'idle',
};

// Scheduler timer handles
let schedulerTimers: NodeJS.Timeout[] = [];
let isSchedulerRunning = false;

/**
 * Attempts to transactionally acquire a distributed lease for a scheduled job.
 */
export async function acquireSchedulerLease(
  db: any,
  jobName: PlatformJobName,
  ownerId: string = INSTANCE_ID,
  leaseDurationMs: number = 60000
): Promise<boolean> {
  if (!db) return false;
  const lockRef = db.collection('platform_scheduler_locks').doc(jobName);
  const now = Date.now();
  const leaseUntilIso = new Date(now + leaseDurationMs).toISOString();
  const nowIso = new Date(now).toISOString();

  try {
    const acquired = await db.runTransaction(async (transaction: any) => {
      const snap = await transaction.get(lockRef);
      if (snap.exists) {
        const data = snap.data();
        const currentLeaseUntil = data?.leaseUntil ? new Date(data.leaseUntil).getTime() : 0;
        // If lease is active and held by a different instance, acquisition fails
        if (currentLeaseUntil > now && data?.ownerId !== ownerId) {
          return false;
        }
      }

      transaction.set(
        lockRef,
        {
          jobName,
          ownerId,
          leaseUntil: leaseUntilIso,
          updatedAt: nowIso,
        },
        { merge: true }
      );
      return true;
    });

    return acquired === true;
  } catch (err) {
    console.error(`[SchedulerLock] Error acquiring lease for ${jobName}:`, err);
    return false;
  }
}

/**
 * Transactionally releases a distributed lease held by this instance.
 */
export async function releaseSchedulerLease(
  db: any,
  jobName: PlatformJobName,
  ownerId: string = INSTANCE_ID
): Promise<void> {
  if (!db) return;
  const lockRef = db.collection('platform_scheduler_locks').doc(jobName);
  try {
    await db.runTransaction(async (transaction: any) => {
      const snap = await transaction.get(lockRef);
      if (snap.exists) {
        const data = snap.data();
        if (data?.ownerId === ownerId) {
          transaction.update(lockRef, {
            leaseUntil: new Date(0).toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    });
  } catch (err) {
    console.error(`[SchedulerLock] Error releasing lease for ${jobName}:`, err);
  }
}

/**
 * Persists the authoritative status of a scheduler job.
 */
export async function updateSchedulerJobState(
  db: any,
  patch: Partial<PlatformSchedulerJobState> & { jobName: PlatformJobName }
): Promise<void> {
  if (!db) return;
  try {
    const stateRef = db.collection('platform_scheduler_state').doc(patch.jobName);
    await stateRef.set(
      {
        ...patch,
        ownerId: INSTANCE_ID,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error(`[SchedulerState] Failed to update state for ${patch.jobName}:`, err);
  }
}

/**
 * Executes a job guarded by in-process state and a distributed Firestore lease.
 */
export async function runJobWithLock(
  db: any,
  jobName: PlatformJobName,
  jobFn: () => Promise<{
    processedCount: number;
    createdAlerts?: number;
    resolvedAlerts?: number;
  }>
): Promise<{
  executed: boolean;
  skippedReason?: 'already_running_locally' | 'lease_unavailable';
  result?: any;
  error?: string;
}> {
  // 1. Guard against overlapping runs within this process
  if (inProcessJobState[jobName] === 'running') {
    return { executed: false, skippedReason: 'already_running_locally' };
  }

  const govConfig = await getPublishedPlatformConfig(db);
  if (govConfig?.schedulerPolicy?.enabled === false) {
    return { executed: false, skippedReason: 'lease_unavailable' };
  }

  // 2. Acquire distributed lease
  const leaseDuration = govConfig?.schedulerPolicy?.distributedLockLeaseMs || 120000;
  const leaseAcquired = await acquireSchedulerLease(db, jobName, INSTANCE_ID, leaseDuration);
  if (!leaseAcquired) {
    return { executed: false, skippedReason: 'lease_unavailable' };
  }

  inProcessJobState[jobName] = 'running';
  const startTime = Date.now();
  const startIso = new Date(startTime).toISOString();

  await updateSchedulerJobState(db, {
    jobName,
    status: 'running',
    lastStartedAt: startIso,
  });

  try {
    const outcome = await jobFn();
    const durationMs = Date.now() - startTime;
    const completedIso = new Date().toISOString();

    await updateSchedulerJobState(db, {
      jobName,
      status: 'healthy',
      lastCompletedAt: completedIso,
      lastSuccessfulAt: completedIso,
      lastDurationMs: durationMs,
      lastProcessedCount: outcome.processedCount,
      lastCreatedAlerts: outcome.createdAlerts ?? 0,
      lastResolvedAlerts: outcome.resolvedAlerts ?? 0,
      lastError: null,
      consecutiveFailures: 0,
    });

    return { executed: true, result: outcome };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    const failedIso = new Date().toISOString();
    const errorMessage = err?.message || 'Job execution error';

    await updateSchedulerJobState(db, {
      jobName,
      status: 'failed',
      lastCompletedAt: failedIso,
      lastFailedAt: failedIso,
      lastDurationMs: durationMs,
      lastError: errorMessage,
    });

    // Record authoritative audit record for scheduler failure
    try {
      await recordAuditEvent(
        db,
        createAuthoritativeAuditRecord({
          tenantId: 'PLATFORM_CONTROL_PLANE',
          actorUid: INSTANCE_ID,
          actorEmail: 'system.scheduler@markithub.internal',
          actorRole: 'Platform Scheduler',
          action: 'PLATFORM_SCHEDULER_FAILURE',
          module: 'platform_scheduler',
          targetType: 'scheduler_job',
          targetId: jobName,
          targetName: `Platform Scheduler Job: ${jobName}`,
          reason: errorMessage,
          result: 'failed',
          severity: 'critical',
          details: `Platform Scheduler job '${jobName}' failed on instance ${INSTANCE_ID}: ${errorMessage}`,
        })
      );
    } catch (auditErr) {
      console.error('[PlatformScheduler] Error logging audit failure:', auditErr);
    }

    return { executed: false, error: errorMessage };
  } finally {
    inProcessJobState[jobName] = 'idle';
    await releaseSchedulerLease(db, jobName, INSTANCE_ID);
  }
}

/**
 * Manually or programmatically runs a specific platform scheduler job.
 */
export async function runPlatformJob(
  db: any,
  jobName: string,
  _triggerSource?: string
): Promise<any> {
  const govConfig = await getPublishedPlatformConfig(db);
  if (govConfig?.schedulerPolicy?.enabled === false) {
    return {
      status: 'skipped',
      message: `Job ${jobName} skipped: scheduler is disabled by governance configuration.`,
    };
  }

  const normalized = (jobName === 'platform_health_evaluation' || jobName === 'health') ? 'health'
    : (jobName === 'platform_escalation_sweep' || jobName === 'escalation') ? 'escalation'
    : (jobName === 'platform_notification_sweep' || jobName === 'notifications') ? 'notifications'
    : (jobName as PlatformJobName);

  if (normalized === 'health') {
    return runJobWithLock(db, 'health', async () => {
      const res: HealthEvaluationResult = await evaluatePlatformHealth(db);
      return {
        status: 'completed',
        processedCount: res.processedTenants,
        createdAlerts: res.alertsCreated,
        resolvedAlerts: res.alertsResolved,
      };
    });
  }

  if (normalized === 'escalation') {
    return runJobWithLock(db, 'escalation', async () => {
      const res = await processAlertEscalations(db);
      return {
        status: 'completed',
        processedCount: res.processedCount,
        createdAlerts: res.escalatedCount,
        resolvedAlerts: 0,
      };
    });
  }

  if (normalized === 'notifications') {
    return runJobWithLock(db, 'notifications', async () => {
      const res = await processPendingNotifications(db);
      return {
        status: 'completed',
        processedCount: res.processedCount,
        createdAlerts: 0,
        resolvedAlerts: 0,
      };
    });
  }

  throw new Error(`Unknown platform job: ${jobName}`);
}

/**
 * Returns the current authoritative status of all scheduler jobs.
 */
export async function getSchedulerStatus(db: any): Promise<SchedulerStatusResponse> {
  const jobs: PlatformJobName[] = ['health', 'escalation', 'notifications'];
  const jobStates: PlatformSchedulerJobState[] = [];

  for (const jobName of jobs) {
    if (db) {
      try {
        const snap = await db.collection('platform_scheduler_state').doc(jobName).get();
        if (snap.exists) {
          jobStates.push(snap.data() as PlatformSchedulerJobState);
          continue;
        }
      } catch (err) {
        console.error(`Error reading scheduler state for ${jobName}:`, err);
      }
    }

    // Default fallback state if doc does not yet exist
    jobStates.push({
      jobName,
      status: inProcessJobState[jobName] === 'running' ? 'running' : 'idle',
      ownerId: INSTANCE_ID,
    });
  }

  const enabled = process.env.PLATFORM_SCHEDULER_ENABLED !== 'false';

  return {
    enabled,
    instanceId: INSTANCE_ID,
    jobs: jobStates,
    serverTime: new Date().toISOString(),
  };
}

/**
 * Starts the platform background scheduler timers.
 */
export function startPlatformScheduler(db: any): void {
  if (isSchedulerRunning) {
    return;
  }

  if (process.env.PLATFORM_SCHEDULER_ENABLED === 'false') {
    console.log('[PlatformScheduler] Disabled via PLATFORM_SCHEDULER_ENABLED=false');
    return;
  }

  if (!db) {
    console.warn('[PlatformScheduler] Database not initialized; scheduler not started.');
    return;
  }

  isSchedulerRunning = true;

  const healthIntervalMs = Number(process.env.PLATFORM_HEALTH_INTERVAL_MS) || 300000; // 5 mins
  const escalationIntervalMs = Number(process.env.PLATFORM_ESCALATION_INTERVAL_MS) || 60000; // 1 min
  const notificationIntervalMs = Number(process.env.PLATFORM_NOTIFICATION_INTERVAL_MS) || 60000; // 1 min

  console.log(`[PlatformScheduler] Starting automation engine on instance ${INSTANCE_ID}`);
  console.log(`[PlatformScheduler] Health Interval: ${healthIntervalMs}ms | Escalation: ${escalationIntervalMs}ms | Notifications: ${notificationIntervalMs}ms`);

  // Register background intervals
  const healthTimer = setInterval(async () => {
    try {
      await runPlatformJob(db, 'health');
    } catch (err) {
      console.error('[PlatformScheduler] Background health error:', err);
    }
  }, healthIntervalMs);

  const escalationTimer = setInterval(async () => {
    try {
      await runPlatformJob(db, 'escalation');
    } catch (err) {
      console.error('[PlatformScheduler] Background escalation error:', err);
    }
  }, escalationIntervalMs);

  const notificationTimer = setInterval(async () => {
    try {
      await runPlatformJob(db, 'notifications');
    } catch (err) {
      console.error('[PlatformScheduler] Background notification error:', err);
    }
  }, notificationIntervalMs);

  // Initial trigger after short delay (5s) for instant evaluation upon startup
  const initialTrigger = setTimeout(async () => {
    try {
      await runPlatformJob(db, 'health');
      await runPlatformJob(db, 'escalation');
    } catch (err) {
      console.error('[PlatformScheduler] Initial run error:', err);
    }
  }, 5000);

  schedulerTimers = [healthTimer, escalationTimer, notificationTimer, initialTrigger];
}

/**
 * Gracefully stops the platform scheduler timers and releases any active locks.
 */
export async function stopPlatformScheduler(db?: any): Promise<void> {
  if (!isSchedulerRunning) {
    return;
  }

  console.log(`[PlatformScheduler] Stopping background scheduler on instance ${INSTANCE_ID}`);
  for (const timer of schedulerTimers) {
    clearInterval(timer);
    clearTimeout(timer);
  }
  schedulerTimers = [];
  isSchedulerRunning = false;

  // Release any active leases
  if (db) {
    const jobs: PlatformJobName[] = ['health', 'escalation', 'notifications'];
    await Promise.all(jobs.map(job => releaseSchedulerLease(db, job, INSTANCE_ID)));
  }
}
