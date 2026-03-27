import type { OwnerKey } from "../../contracts/owners";

import type { D1Database } from "../../config/bindings";
import { createProductsRepo } from "../../db/repositories/productsRepo";

export type DownloadProductImageAsJpgResult =
  | {
      kind: "ok";
      response: Response;
    }
  | {
      kind: "invalid-image";
    }
  | {
      kind: "fetch-error";
      error: Error;
    }
  | {
      kind: "not-found";
    };

export interface DownloadProductImageAsJpgOptions {
  fetchImpl?: typeof fetch;
}

function normalizeUrl(value: string) {
  try {
    return new URL(value).toString();
  } catch {
    return null;
  }
}

function parseImageUrls(imagesRaw: string | null) {
  if (!imagesRaw) {
    return null;
  }

  try {
    const parsed = JSON.parse(imagesRaw);
    if (!Array.isArray(parsed)) {
      return null;
    }

    const urls = parsed
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .map((value) => normalizeUrl(value))
      .filter((value): value is string => Boolean(value));

    return urls.length > 0 ? urls : null;
  } catch {
    return null;
  }
}

function slugifyTitle(title: string | null) {
  const normalized = title
    ?.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .trim();

  return normalized && normalized.length > 0 ? normalized : "urun-gorseli";
}

function buildFilename(title: string | null) {
  return `${slugifyTitle(title)}.jpg`;
}

function buildAttachmentHeader(filename: string) {
  const safeFilename = filename.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `attachment; filename="${safeFilename}"`;
}

export async function downloadProductImageAsJpg(
  db: D1Database,
  ownerKey: OwnerKey,
  productId: string,
  targetUrl: string,
  options: DownloadProductImageAsJpgOptions = {},
): Promise<DownloadProductImageAsJpgResult> {
  const productsRepo = createProductsRepo(db);
  const snapshot = await productsRepo.getProductImageSnapshot(ownerKey, productId);

  if (!snapshot) {
    return { kind: "not-found" };
  }

  const normalizedTargetUrl = normalizeUrl(targetUrl);
  const imageUrls = parseImageUrls(snapshot.imagesRaw);

  if (!normalizedTargetUrl || !imageUrls || !imageUrls.includes(normalizedTargetUrl)) {
    return { kind: "invalid-image" };
  }

  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const upstreamResponse = await fetchImpl(normalizedTargetUrl, {
      cf: {
        image: {
          format: "jpeg",
          quality: 95,
        },
      },
    } as RequestInit);

    if (!upstreamResponse.ok) {
      return {
        kind: "fetch-error",
        error: new Error(`Upstream image request failed with status ${upstreamResponse.status}`),
      };
    }

    const bytes = await upstreamResponse.arrayBuffer();
    const filename = buildFilename(snapshot.title);

    return {
      kind: "ok",
      response: new Response(bytes, {
        status: 200,
        headers: {
          "content-type": "image/jpeg",
          "content-disposition": buildAttachmentHeader(filename),
          "cache-control": "no-store",
        },
      }),
    };
  } catch (error) {
    return {
      kind: "fetch-error",
      error: error instanceof Error ? error : new Error("Failed to fetch product image"),
    };
  }
}
