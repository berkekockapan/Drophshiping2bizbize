import type { OwnerKey } from "../../contracts/owners";

import type { D1Database } from "../../config/bindings";
import { createProductCategoriesRepo } from "../../db/repositories/productCategoriesRepo";

export class InvalidCategoryNameError extends Error {
  constructor() {
    super("Kategori adi gerekli");
    this.name = "InvalidCategoryNameError";
  }
}

export class DuplicateCategoryNameError extends Error {
  constructor(public readonly categoryId: string) {
    super("Kategori adi zaten kullaniliyor");
    this.name = "DuplicateCategoryNameError";
  }
}

function normalizeCategoryName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new InvalidCategoryNameError();
  }

  return {
    displayName: trimmed,
    normalizedName: trimmed.toLowerCase(),
  };
}

export async function listProductCategories(db: D1Database, ownerKey: OwnerKey) {
  return createProductCategoriesRepo(db).list(ownerKey);
}

export async function createProductCategory(db: D1Database, ownerKey: OwnerKey, name: string, now = new Date()) {
  const categoriesRepo = createProductCategoriesRepo(db);
  const normalized = normalizeCategoryName(name);
  const existing = await categoriesRepo.findByNormalizedName(ownerKey, normalized.normalizedName);

  if (existing) {
    throw new DuplicateCategoryNameError(existing.id);
  }

  const category = await categoriesRepo.create(ownerKey, normalized.displayName, now);
  return {
    category,
  };
}

export async function renameProductCategory(
  db: D1Database,
  ownerKey: OwnerKey,
  categoryId: string,
  name: string,
  now = new Date(),
) {
  const categoriesRepo = createProductCategoriesRepo(db);
  const current = await categoriesRepo.get(ownerKey, categoryId);
  if (!current) {
    return null;
  }

  const normalized = normalizeCategoryName(name);
  const existing = await categoriesRepo.findByNormalizedName(ownerKey, normalized.normalizedName);
  if (existing && existing.id !== categoryId) {
    throw new DuplicateCategoryNameError(existing.id);
  }

  return {
    category: (await categoriesRepo.rename(ownerKey, categoryId, normalized.displayName, now)) ?? current,
  };
}

export async function deleteProductCategory(db: D1Database, ownerKey: OwnerKey, categoryId: string, now = new Date()) {
  return createProductCategoriesRepo(db).delete(ownerKey, categoryId, now);
}
