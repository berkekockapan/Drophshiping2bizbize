import type { D1Database } from '../../config/bindings';
import { runWithWriteRetry } from '../runWithWriteRetry';

export interface CreateTariffAnalysisRunInput<TInput = unknown, TResult = unknown> {
  productId: string;
  ownerKey: string;
  status?: string;
  usedAi: boolean;
  inputSnapshot: TInput;
  resultSnapshot: TResult;
  engineVersion: string;
  createdAt?: number;
  completedAt?: number;
}

export interface TariffAnalysisRunRow<TInput = unknown, TResult = unknown> {
  id: string;
  productId: string;
  ownerKey: string;
  status: string;
  usedAi: boolean;
  inputSnapshot: TInput | null;
  resultSnapshot: TResult | null;
  engineVersion: string;
  createdAt: number;
  completedAt: number | null;
}

function safeParseJson(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function mapRun<TInput = unknown, TResult = unknown>(row: {
  id: string;
  productId: string;
  ownerKey: string;
  status: string;
  usedAi: number | boolean;
  inputSnapshotJson: string;
  resultSnapshotJson: string | null;
  engineVersion: string;
  createdAt: number;
  completedAt: number | null;
}): TariffAnalysisRunRow<TInput, TResult> {
  return {
    id: row.id,
    productId: row.productId,
    ownerKey: row.ownerKey,
    status: row.status,
    usedAi: Boolean(row.usedAi),
    inputSnapshot: safeParseJson(row.inputSnapshotJson) as TInput | null,
    resultSnapshot: safeParseJson(row.resultSnapshotJson) as TResult | null,
    engineVersion: row.engineVersion,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
  };
}

export function createTariffAnalysisRepo(db: D1Database) {
  return {
    async createRun<TInput = unknown, TResult = unknown>(input: CreateTariffAnalysisRunInput<TInput, TResult>) {
      const id = crypto.randomUUID();
      const createdAt = input.createdAt ?? Date.now();
      const completedAt = input.completedAt ?? createdAt;

      await runWithWriteRetry(async () => {
        await db
          .prepare(
            `insert into product_tariff_analysis_runs
             (id, product_id, owner_key, status, used_ai, input_snapshot_json, result_snapshot_json, engine_version, created_at, completed_at)
             values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            id,
            input.productId,
            input.ownerKey,
            input.status ?? 'completed',
            input.usedAi ? 1 : 0,
            JSON.stringify(input.inputSnapshot),
            JSON.stringify(input.resultSnapshot),
            input.engineVersion,
            createdAt,
            completedAt,
          )
          .run();
      });

      return {
        id,
        productId: input.productId,
        ownerKey: input.ownerKey,
        status: input.status ?? 'completed',
        usedAi: input.usedAi,
        inputSnapshot: input.inputSnapshot,
        resultSnapshot: input.resultSnapshot,
        engineVersion: input.engineVersion,
        createdAt,
        completedAt,
      } satisfies TariffAnalysisRunRow<TInput, TResult>;
    },
    async getLatestRun<TInput = unknown, TResult = unknown>(productId: string) {
      const row = await db
        .prepare(
          `select id, product_id as productId, owner_key as ownerKey, status, used_ai as usedAi,
                  input_snapshot_json as inputSnapshotJson, result_snapshot_json as resultSnapshotJson,
                  engine_version as engineVersion, created_at as createdAt, completed_at as completedAt
           from product_tariff_analysis_runs
           where product_id = ?
           order by created_at desc
           limit 1`,
        )
        .bind(productId)
        .first<{
          id: string;
          productId: string;
          ownerKey: string;
          status: string;
          usedAi: number | boolean;
          inputSnapshotJson: string;
          resultSnapshotJson: string | null;
          engineVersion: string;
          createdAt: number;
          completedAt: number | null;
        }>();

      return row ? mapRun<TInput, TResult>(row) : null;
    },
  };
}
