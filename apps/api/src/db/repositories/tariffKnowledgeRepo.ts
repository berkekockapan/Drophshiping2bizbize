import type { D1Database } from '../../config/bindings';
import { runWithWriteRetry } from '../runWithWriteRetry';

export interface CreateTariffKnowledgeCandidateRepoInput {
  productId: string;
  ownerKey: string;
  catalogId: string;
  usProfileId: string | null;
  candidateSource: string;
  payloadJson: string;
  status: string;
  submittedBy: string;
  submittedAt: number;
}

export interface TariffKnowledgeCandidateRow {
  id: string;
  productId: string;
  ownerKey: string;
  catalogId: string;
  usProfileId: string | null;
  candidateSource: string;
  payload: unknown;
  status: string;
  submittedBy: string;
  submittedAt: number;
}

function safeParseJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function createTariffKnowledgeRepo(db: D1Database) {
  return {
    async createCandidate(input: CreateTariffKnowledgeCandidateRepoInput) {
      const id = crypto.randomUUID();

      await runWithWriteRetry(async () => {
        await db
          .prepare(
            `insert into tariff_knowledge_candidates
             (id, product_id, owner_key, catalog_id, us_profile_id, candidate_source, payload_json, status, submitted_by, submitted_at)
             values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            id,
            input.productId,
            input.ownerKey,
            input.catalogId,
            input.usProfileId,
            input.candidateSource,
            input.payloadJson,
            input.status,
            input.submittedBy,
            input.submittedAt,
          )
          .run();
      });

      return {
        id,
        productId: input.productId,
        ownerKey: input.ownerKey,
        catalogId: input.catalogId,
        usProfileId: input.usProfileId,
        candidateSource: input.candidateSource,
        payload: safeParseJson(input.payloadJson),
        status: input.status,
        submittedBy: input.submittedBy,
        submittedAt: input.submittedAt,
      } satisfies TariffKnowledgeCandidateRow;
    },
  };
}
