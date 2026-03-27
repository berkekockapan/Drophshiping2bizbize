import type { OwnerKey } from "../../contracts/owners";

import type { D1Database } from "../../config/bindings";

export type ManualRefreshRunScope = "ALL" | "FAILED_ONLY";
export type ManualRefreshRunStatus = "PENDING" | "RUNNING" | "COMPLETED";
export type ManualRefreshRunItemStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";

export interface ManualRefreshRunRecord {
  id: string;
  ownerKey: OwnerKey;
  scope: ManualRefreshRunScope;
  sourceRunId: string | null;
  status: ManualRefreshRunStatus;
  totalCount: number;
  pendingCount: number;
  runningCount: number;
  successCount: number;
  failedCount: number;
  startedAt: number | null;
  finishedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface ManualRefreshRunItemRecord {
  id: string;
  runId: string;
  productId: string;
  status: ManualRefreshRunItemStatus;
  attemptCount: number;
  errorMessage: string | null;
  startedAt: number | null;
  finishedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

function mapRun(
  row: {
    id: string;
    ownerKey: OwnerKey;
    scope: string;
    sourceRunId: string | null;
    status: string;
    totalCount: number;
    pendingCount: number;
    runningCount: number;
    successCount: number;
    failedCount: number;
    startedAt: number | null;
    finishedAt: number | null;
    createdAt: number;
    updatedAt: number;
  } | null,
) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    ownerKey: row.ownerKey,
    scope: row.scope as ManualRefreshRunScope,
    sourceRunId: row.sourceRunId,
    status: row.status as ManualRefreshRunStatus,
    totalCount: row.totalCount,
    pendingCount: row.pendingCount,
    runningCount: row.runningCount,
    successCount: row.successCount,
    failedCount: row.failedCount,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  } satisfies ManualRefreshRunRecord;
}

function mapItem(
  row: {
    id: string;
    runId: string;
    productId: string;
    status: string;
    attemptCount: number;
    errorMessage: string | null;
    startedAt: number | null;
    finishedAt: number | null;
    createdAt: number;
    updatedAt: number;
  },
) {
  return {
    id: row.id,
    runId: row.runId,
    productId: row.productId,
    status: row.status as ManualRefreshRunItemStatus,
    attemptCount: row.attemptCount,
    errorMessage: row.errorMessage,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  } satisfies ManualRefreshRunItemRecord;
}

function withOptionalOwnerFilter(query: string, ownerKey?: OwnerKey) {
  if (!ownerKey) {
    return { query, values: [] as unknown[] };
  }

  return {
    query: `${query} and owner_key = ?`,
    values: [ownerKey] as unknown[],
  };
}

export function createManualRefreshRunsRepo(db: D1Database) {
  return {
    async createRun(
      input: {
        ownerKey: OwnerKey;
        productIds: string[];
        scope: ManualRefreshRunScope;
        sourceRunId?: string | null;
      },
      now: Date,
    ) {
      const productIds = [...new Set(input.productIds)];
      const runId = crypto.randomUUID();
      const timestamp = now.getTime();
      const totalCount = productIds.length;

      await db
        .prepare(
          `insert into manual_refresh_runs (
             id, owner_key, scope, source_run_id, status, total_count, pending_count, running_count,
             success_count, failed_count, started_at, finished_at, created_at, updated_at
           ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          runId,
          input.ownerKey,
          input.scope,
          input.sourceRunId ?? null,
          "RUNNING",
          totalCount,
          totalCount,
          0,
          0,
          0,
          timestamp,
          null,
          timestamp,
          timestamp,
        )
        .run();

      for (const productId of productIds) {
        await db
          .prepare(
            `insert into manual_refresh_run_items (
               id, run_id, product_id, status, attempt_count, error_message,
               started_at, finished_at, created_at, updated_at
             ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            crypto.randomUUID(),
            runId,
            productId,
            "PENDING",
            0,
            null,
            null,
            null,
            timestamp,
            timestamp,
          )
          .run();
      }

      return { id: runId };
    },
    async getRun(runId: string, ownerKey?: OwnerKey) {
      const query = withOptionalOwnerFilter(
        `select id, owner_key as ownerKey, scope, source_run_id as sourceRunId, status,
                total_count as totalCount, pending_count as pendingCount, running_count as runningCount,
                success_count as successCount, failed_count as failedCount,
                started_at as startedAt, finished_at as finishedAt,
                created_at as createdAt, updated_at as updatedAt
         from manual_refresh_runs
         where id = ?`,
        ownerKey,
      );
      const row = await db
        .prepare(`${query.query} limit 1`)
        .bind(runId, ...query.values)
        .first<{
          id: string;
          ownerKey: OwnerKey;
          scope: string;
          sourceRunId: string | null;
          status: string;
          totalCount: number;
          pendingCount: number;
          runningCount: number;
          successCount: number;
          failedCount: number;
          startedAt: number | null;
          finishedAt: number | null;
          createdAt: number;
          updatedAt: number;
        }>();

      return mapRun(row);
    },
    async getActiveRun(ownerKey: OwnerKey) {
      const row = await db
        .prepare(
          `select id, owner_key as ownerKey, scope, source_run_id as sourceRunId, status,
                  total_count as totalCount, pending_count as pendingCount, running_count as runningCount,
                  success_count as successCount, failed_count as failedCount,
                  started_at as startedAt, finished_at as finishedAt,
                  created_at as createdAt, updated_at as updatedAt
           from manual_refresh_runs
           where owner_key = ? and status != 'COMPLETED'
           order by created_at desc
           limit 1`,
        )
        .bind(ownerKey)
        .first<{
          id: string;
          ownerKey: OwnerKey;
          scope: string;
          sourceRunId: string | null;
          status: string;
          totalCount: number;
          pendingCount: number;
          runningCount: number;
          successCount: number;
          failedCount: number;
          startedAt: number | null;
          finishedAt: number | null;
          createdAt: number;
          updatedAt: number;
        }>();

      return mapRun(row);
    },
    async listStaleRunIds(updatedBefore: number, ownerKey?: OwnerKey) {
      const query = withOptionalOwnerFilter(
        `select id
         from manual_refresh_runs
         where status != 'COMPLETED' and updated_at < ?`,
        ownerKey,
      );
      const rows = await db
        .prepare(`${query.query} order by created_at asc`)
        .bind(updatedBefore, ...query.values)
        .all<{ id: string }>();

      return rows.results.map((row) => row.id);
    },
    async listRunItems(runId: string) {
      const rows = await db
        .prepare(
          `select id, run_id as runId, product_id as productId, status,
                  attempt_count as attemptCount, error_message as errorMessage,
                  started_at as startedAt, finished_at as finishedAt,
                  created_at as createdAt, updated_at as updatedAt
           from manual_refresh_run_items
           where run_id = ?
           order by created_at asc`,
        )
        .bind(runId)
        .all<{
          id: string;
          runId: string;
          productId: string;
          status: string;
          attemptCount: number;
          errorMessage: string | null;
          startedAt: number | null;
          finishedAt: number | null;
          createdAt: number;
          updatedAt: number;
        }>();

      return rows.results.map(mapItem);
    },
    async getRunWithItems(runId: string, ownerKey?: OwnerKey) {
      const run = await this.getRun(runId, ownerKey);
      if (!run) {
        return null;
      }

      return {
        ...run,
        items: await this.listRunItems(runId),
      };
    },
    async markItemRunning(runId: string, productId: string, now: Date) {
      const timestamp = now.getTime();

      await db
        .prepare(
          `update manual_refresh_run_items
           set status = 'RUNNING',
               attempt_count = attempt_count + 1,
               started_at = ?,
               updated_at = ?
           where run_id = ? and product_id = ?`,
        )
        .bind(timestamp, timestamp, runId, productId)
        .run();

      await db
        .prepare(
          `update manual_refresh_runs
           set pending_count = pending_count - 1,
               running_count = running_count + 1,
               updated_at = ?
           where id = ?`,
        )
        .bind(timestamp, runId)
        .run();
    },
    async markItemSucceeded(runId: string, productId: string, now: Date) {
      const timestamp = now.getTime();

      await db
        .prepare(
          `update manual_refresh_run_items
           set status = 'SUCCESS',
               error_message = null,
               finished_at = ?,
               updated_at = ?
           where run_id = ? and product_id = ?`,
        )
        .bind(timestamp, timestamp, runId, productId)
        .run();

      await db
        .prepare(
          `update manual_refresh_runs
           set running_count = running_count - 1,
               success_count = success_count + 1,
               updated_at = ?
           where id = ?`,
        )
        .bind(timestamp, runId)
        .run();
    },
    async markItemFailed(runId: string, productId: string, errorMessage: string, now: Date) {
      const timestamp = now.getTime();

      await db
        .prepare(
          `update manual_refresh_run_items
           set status = 'FAILED',
               error_message = ?,
               finished_at = ?,
               updated_at = ?
           where run_id = ? and product_id = ?`,
        )
        .bind(errorMessage, timestamp, timestamp, runId, productId)
        .run();

      await db
        .prepare(
          `update manual_refresh_runs
           set running_count = running_count - 1,
               failed_count = failed_count + 1,
               updated_at = ?
           where id = ?`,
        )
        .bind(timestamp, runId)
        .run();
    },
    async completeRun(runId: string, now: Date) {
      const timestamp = now.getTime();

      await db
        .prepare(
          `update manual_refresh_runs
           set status = 'COMPLETED',
               finished_at = ?,
               updated_at = ?
           where id = ?`,
        )
        .bind(timestamp, timestamp, runId)
        .run();
    },
    async completeRunAsInterrupted(runId: string, errorMessage: string, now: Date) {
      const timestamp = now.getTime();

      await db
        .prepare(
          `update manual_refresh_run_items
           set status = 'FAILED',
               error_message = case
                 when error_message is null or error_message = '' then ?
                 else error_message
               end,
               finished_at = coalesce(finished_at, ?),
               updated_at = ?
           where run_id = ? and status in ('PENDING', 'RUNNING')`,
        )
        .bind(errorMessage, timestamp, timestamp, runId)
        .run();

      const counts = await db
        .prepare(
          `select count(*) as totalCount,
                  sum(case when status = 'PENDING' then 1 else 0 end) as pendingCount,
                  sum(case when status = 'RUNNING' then 1 else 0 end) as runningCount,
                  sum(case when status = 'SUCCESS' then 1 else 0 end) as successCount,
                  sum(case when status = 'FAILED' then 1 else 0 end) as failedCount
           from manual_refresh_run_items
           where run_id = ?`,
        )
        .bind(runId)
        .first<{
          totalCount: number;
          pendingCount: number | null;
          runningCount: number | null;
          successCount: number | null;
          failedCount: number | null;
        }>();

      await db
        .prepare(
          `update manual_refresh_runs
           set status = 'COMPLETED',
               total_count = ?,
               pending_count = ?,
               running_count = ?,
               success_count = ?,
               failed_count = ?,
               finished_at = ?,
               updated_at = ?
           where id = ?`,
        )
        .bind(
          counts?.totalCount ?? 0,
          counts?.pendingCount ?? 0,
          counts?.runningCount ?? 0,
          counts?.successCount ?? 0,
          counts?.failedCount ?? 0,
          timestamp,
          timestamp,
          runId,
        )
        .run();
    },
  };
}
