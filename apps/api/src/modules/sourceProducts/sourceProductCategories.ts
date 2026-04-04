import type { OwnerKey } from "../../contracts/owners";

import type { D1Database } from "../../config/bindings";
import { createSourceProductCategoriesRepo } from "../../db/repositories/sourceProductCategoriesRepo";

export class InvalidSourceProductCategoryNameError extends Error {
  constructor() {
    super("Kategori adi gerekli");
    this.name = "InvalidSourceProductCategoryNameError";
  }
}

export class DuplicateSourceProductCategoryNameError extends Error {
  constructor(public readonly categoryId: string) {
    super("Kategori adi zaten kullaniliyor");
    this.name = "DuplicateSourceProductCategoryNameError";
  }
}

function normalizeCategoryName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new InvalidSourceProductCategoryNameError();
  }

  return {
    displayName: trimmed,
    normalizedName: trimmed.toLowerCase(),
  };
}

export async function listSourceProductCategories(db: D1Database, ownerKey: OwnerKey) {
  return createSourceProductCategoriesRepo(db).list(ownerKey);
}

export async function createSourceProductCategory(db: D1Database, ownerKey: OwnerKey, name: string, now = new Date()) {
  const categoriesRepo = createSourceProductCategoriesRepo(db);
  const normalized = normalizeCategoryName(name);
  const existing = await categoriesRepo.findByNormalizedName(ownerKey, normalized.normalizedName);

  if (existing) {
    throw new DuplicateSourceProductCategoryNameError(existing.id);
  }

  const category = await categoriesRepo.create(ownerKey, normalized.displayName, now);
  return { category };
}

export async function renameSourceProductCategory(
  db: D1Database,
  ownerKey: OwnerKey,
  categoryId: string,
  name: string,
  now = new Date(),
) {
  const categoriesRepo = createSourceProductCategoriesRepo(db);
  const current = await categoriesRepo.get(ownerKey, categoryId);
  if (!current) {
    return null;
  }

  const normalized = normalizeCategoryName(name);
  const existing = await categoriesRepo.findByNormalizedName(ownerKey, normalized.normalizedName);
  if (existing && existing.id !== categoryId) {
    throw new DuplicateSourceProductCategoryNameError(existing.id);
  }

  return {
    category: (await categoriesRepo.rename(ownerKey, categoryId, normalized.displayName, now)) ?? current,
  };
}

export async function deleteSourceProductCategory(db: D1Database, ownerKey: OwnerKey, categoryId: string, now = new Date()) {
  return createSourceProductCategoriesRepo(db).delete(ownerKey, categoryId, now);
}
