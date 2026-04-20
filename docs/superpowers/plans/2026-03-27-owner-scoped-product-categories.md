# Owner-Scoped Product Categories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `berke` ve `kaan` icin birbirinden bagimsiz kategori havuzlari, urun basi tek kategori atamasi, kategoriye gore filtreleme ve kategori silinince urunu koruyan owner-scoped kategori yonetimini teslim etmek.

**Architecture:** D1 semasina owner-scoped `product_categories` tablosu ve `products.user_category_id` alani eklenecek; mevcut `products.category` alani kaynak kategori olarak korunacak. Hono altinda `/owners/:ownerKey/categories` CRUD endpoint'leri ve `/owners/:ownerKey/products/:productId/category` atama endpoint'i eklenecek; tracking/detail view builder'lari `userCategory` nesnesi donerek kategori filtresini SQL seviyesinde uygulayacak. React tarafinda kategori listesi TanStack Query ile owner-scoped yuklenecek; tracking ekranina kategori filtresi ve kategori yonetim modal'i eklenecek, urun karti ve detay sayfasi ayni `Takip kategorisi` secicisini yeniden kullanacak.

**Tech Stack:** TypeScript, Hono, Cloudflare Workers/D1, React, React Router, TanStack Query, Tailwind CSS, Vitest

---

## Implementation Notes

- Source spec: `docs/superpowers/specs/2026-03-27-owner-scoped-product-categories-design.md`
- Mevcut `products.category` alanini yeniden adlandirma; bu iterasyonda onu kaynak kategori olarak koru ve yeni kullanici tanimli alan icin ayri `userCategory` yuzeyi ekle.
- `packages/shared` icin zoraki bir refactor yapma. Bu repo su an kategori DTO'larini aktif olarak paylasmiyor; yeni tipleri `apps/api` ve `apps/web/src/app/api.ts` icinde lokal tutmak daha dusuk riskli.
- UI kopyasinda yeni alanin adini `Takip kategorisi`, mevcut Trendyol verisinin adini `Kaynak kategori` olarak kullan. Boylece iki kategori kavrami karismaz.
- `categoryId=uncategorized` token'ini hem backend hem frontend tarafinda ayni literal ile kullan; farkli sentinel degerleri uretme.
- Kategori silme icin iki adimli transaction davranisini `db.batch(...)` ile kapsulle: once urunleri `user_category_id = null` yap, sonra kategori satirini sil.
- Kategori adini duplicate kontrolunde `trim()` + `lower(...)` ile normalize et; ayni owner altinda `Bileklik` ve ` bileklik ` ayri kategoriye donusmesin.
- Because explicit subagent delegation was not requested, do a local plan review instead of the skill's reviewer subagent loop.

## File Structure

### API schema and persistence
- Create: `apps/api/drizzle/0008_product_categories.sql` - `product_categories` tablosu, `products.user_category_id` kolonu ve kategori filtre indeksleri.
- Modify: `apps/api/src/db/schema.ts:4-33,312-348` - yeni tabloyu, yeni kolonu, schema export'larini ve tablo listelerini ekle.
- Create: `apps/api/src/db/repositories/productCategoriesRepo.ts` - owner-scoped kategori listeleme/olusturma/guncelleme/silme ve delete+unassign transaction'ini kapsulle.
- Modify: `apps/api/src/db/repositories/productsRepo.ts:195-397` - tracking/detail sorgularina `userCategory` join'i, `categoryId` filtresi ve `setUserCategory(...)` guncellemesi ekle.
- Modify: `apps/api/tests/integration/schema.test.ts:8-80` - yeni tablo, kolon ve indeks beklentilerini dogrula.

### API category services and routes
- Create: `apps/api/src/modules/tracking/productCategories.ts` - kategori adi normalize etme, duplicate/invalid name hatalari ve CRUD servisleri.
- Create: `apps/api/src/modules/tracking/setTrackedProductCategory.ts` - urun + kategori owner eslesmesini dogrulayan atama servisi.
- Modify: `apps/api/src/modules/tracking/buildTrackingListView.ts:6-56` - `categoryId` filtresi ve `userCategory` alanlarini response'a gecir.
- Modify: `apps/api/src/modules/tracking/buildProductDetailView.ts:55-99` - detail payload'ina `product.userCategory` ekle.
- Create: `apps/api/src/routes/categories.ts` - `GET/POST/PATCH/DELETE /owners/:ownerKey/categories` route grubu.
- Modify: `apps/api/src/routes/owners.ts:32-49,149-166,230-231` - liste filtresine `categoryId` ekle, `PATCH /products/:productId/category` endpoint'ini ekle ve kategori router'ini mount et.
- Create: `apps/api/tests/integration/productCategories.test.ts` - owner-scoped kategori CRUD, atama, filtreleme, `uncategorized`, duplicate ve delete-unassign akislarini dogrula.

### Web API client and tracking management UI
- Modify: `apps/web/src/app/api.ts:3-35,74-132,448-519` - `ProductCategory`, `userCategory` tipleri, kategori CRUD helper'lari ve `fetchTrackingView(...categoryId)` opsiyonunu ekle.
- Create: `apps/web/src/features/tracking/components/CategoryManagerDialog.tsx` - kategori olusturma / yeniden adlandirma / silme modal'i.
- Create: `apps/web/src/features/tracking/components/CategoryManagerDialog.test.tsx` - modal callback'lerinin ve hata gorunumunun testleri.
- Modify: `apps/web/src/features/tracking/components/TrackingFilters.tsx:1-20` - aramaya ek olarak kategori secici ve `Kategori yonet` aksiyonu ekle.
- Modify: `apps/web/src/features/tracking/routes/TrackingCenterPage.tsx:22-167` - kategori listesini yukle, filtre query key'ini genislet, modal mutation'larini bagla.
- Modify: `apps/web/src/features/tracking/routes/TrackingCenterPage.test.tsx:9-165` - owner-scoped kategori fetch'i, `categoryId` query string'i ve modal acma davranisini test et.

### Web product-level category assignment UI
- Create: `apps/web/src/features/tracking/components/ProductCategorySelect.tsx` - kart ve detayda ortak kullanilacak kategori secici.
- Modify: `apps/web/src/features/tracking/components/ProductCard.tsx:8-107` - kategori chip'i ve hizli atama secicisi ekle.
- Modify: `apps/web/src/features/tracking/components/ProductCard.test.tsx:9-122` - kart seviyesinde kategori degistirme callback'ini test et.
- Modify: `apps/web/src/features/tracking/routes/TrackingCenterPage.tsx:22-167` - kartlara kategori atama mutation'ini bagla.
- Modify: `apps/web/src/features/product/components/ProductSummary.tsx:11-97` - `Kaynak kategori` + `Takip kategorisi` ayrimini ve detay secicisini goster.
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.tsx:16-80` - kategori listesini yukle, kategori mutation'ini bagla, detail/tracking query'lerini invalidate et.
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.test.tsx:10-185` - owner-scoped kategori endpoint'lerinin detail ekranindan cagrildigini test et.

## Task 1: Add the owner-scoped category schema

**Files:**
- Create: `apps/api/drizzle/0008_product_categories.sql`
- Modify: `apps/api/src/db/schema.ts:4-33,312-348`
- Modify: `apps/api/tests/integration/schema.test.ts:8-80`

- [ ] **Step 1: Extend the schema integration test with product category expectations**

```ts
const categoryColumns = database
  .prepare("pragma table_info(product_categories)")
  .all() as Array<{ name: string; dflt_value: string | null }>;
const productIndexes = database
  .prepare("pragma index_list(products)")
  .all() as Array<{ name: string; partial: number }>;

expect(tables).toEqual(
  expect.arrayContaining([
    { name: "product_categories" },
  ]),
);
expect(columns).toEqual(
  expect.arrayContaining([
    expect.objectContaining({ name: "user_category_id" }),
  ]),
);
expect(categoryColumns).toEqual(
  expect.arrayContaining([
    expect.objectContaining({ name: "owner_key" }),
    expect.objectContaining({ name: "name" }),
    expect.objectContaining({ name: "created_at" }),
    expect.objectContaining({ name: "updated_at" }),
  ]),
);
expect(productIndexes).toEqual(
  expect.arrayContaining([
    expect.objectContaining({ name: "products_owner_category_created_idx" }),
  ]),
);
```

- [ ] **Step 2: Run the schema test to verify the category table and column do not exist yet**

Run: `pnpm --filter @trendyol-etsy/api test -- schema.test.ts`
Expected: FAIL with missing `product_categories`, `user_category_id`, or `products_owner_category_created_idx`

- [ ] **Step 3: Add the migration that creates `product_categories` and the nullable `user_category_id` column**

```sql
-- apps/api/drizzle/0008_product_categories.sql
alter table products add column user_category_id text;

create index products_owner_category_created_idx
  on products(owner_key, user_category_id, created_at);

create table product_categories (
  id text primary key,
  owner_key text not null check (owner_key in ('berke', 'kaan')),
  name text not null check (length(trim(name)) > 0),
  created_at integer not null,
  updated_at integer not null
);

create unique index product_categories_owner_name_unique
  on product_categories(owner_key, name);

create index product_categories_owner_name_idx
  on product_categories(owner_key, name);
```

- [ ] **Step 4: Mirror the migration in the Drizzle schema and export lists**

```ts
// apps/api/src/db/schema.ts
export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    ownerKey: text("owner_key").notNull().default("berke"),
    trendyolUrl: text("trendyol_url").notNull(),
    sourceProductId: text("source_product_id"),
    title: text("title"),
    brand: text("brand"),
    category: text("category"),
    userCategoryId: text("user_category_id"),
    descriptionRaw: text("description_raw"),
    attributesRaw: text("attributes_raw"),
    imagesRaw: text("images_raw"),
    isFavorite: integer("is_favorite", { mode: "boolean" }).notNull().default(false),
    status: text("status").notNull(),
    parseStatus: text("parse_status").notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
    deletedReason: text("deleted_reason"),
    lastCheckedAt: integer("last_checked_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    ownerTrendyolActiveUnique: uniqueIndex("products_owner_trendyol_active_unique")
      .on(table.ownerKey, table.trendyolUrl)
      .where(sql`${table.deletedAt} is null`),
    ownerDeletedCreatedIdx: index("products_owner_deleted_created_idx").on(table.ownerKey, table.deletedAt, table.createdAt),
    ownerCategoryCreatedIdx: index("products_owner_category_created_idx").on(table.ownerKey, table.userCategoryId, table.createdAt),
    sourceProductIdIdx: index("products_source_product_id_idx").on(table.sourceProductId),
  }),
);

export const productCategories = sqliteTable(
  "product_categories",
  {
    id: text("id").primaryKey(),
    ownerKey: text("owner_key").notNull(),
    name: text("name").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    ownerNameUnique: uniqueIndex("product_categories_owner_name_unique").on(table.ownerKey, table.name),
    ownerNameIdx: index("product_categories_owner_name_idx").on(table.ownerKey, table.name),
  }),
);

export const schema = {
  products,
  productVariants,
  productCurrentState,
  priceHistory,
  stockHistory,
  productRefreshAudits,
  productContentHistory,
  notifications,
  etsyDrafts,
  aiProfiles,
  aiOpenAiCredentials,
  aiOpenAiConnectionAttempts,
  aiOpenAiWorkspaces,
  appSettings,
  manualRefreshRuns,
  manualRefreshRunItems,
  productCategories,
};

export const schemaTableNames = [
  "products",
  "product_variants",
  "product_current_state",
  "price_history",
  "stock_history",
  "product_refresh_audits",
  "product_content_history",
  "notifications",
  "etsy_drafts",
  "ai_profiles",
  "ai_openai_credentials",
  "ai_openai_connection_attempts",
  "ai_openai_workspaces",
  "app_settings",
  "manual_refresh_runs",
  "manual_refresh_run_items",
  "product_categories",
] as const;
```

- [ ] **Step 5: Re-run the focused schema checks and typecheck**

Run: `pnpm --filter @trendyol-etsy/api test -- schema.test.ts && pnpm --filter @trendyol-etsy/api typecheck`
Expected: PASS, and `schema.test.ts` now sees the new table, column, and index

- [ ] **Step 6: Commit the schema slice**

```bash
git add apps/api/drizzle/0008_product_categories.sql apps/api/src/db/schema.ts apps/api/tests/integration/schema.test.ts
git commit -m "feat: add product category schema"
```

## Task 2: Build the category API, assignment service, and SQL-backed filters

**Files:**
- Create: `apps/api/src/db/repositories/productCategoriesRepo.ts`
- Modify: `apps/api/src/db/repositories/productsRepo.ts:195-397`
- Create: `apps/api/src/modules/tracking/productCategories.ts`
- Create: `apps/api/src/modules/tracking/setTrackedProductCategory.ts`
- Modify: `apps/api/src/modules/tracking/buildTrackingListView.ts:6-56`
- Modify: `apps/api/src/modules/tracking/buildProductDetailView.ts:55-99`
- Create: `apps/api/src/routes/categories.ts`
- Modify: `apps/api/src/routes/owners.ts:32-49,149-166,230-231`
- Create: `apps/api/tests/integration/productCategories.test.ts`

- [ ] **Step 1: Write the failing owner-scoped category integration test**

```ts
it("creates owner-scoped categories, assigns them to products, filters, and clears assignments on delete", async () => {
  const { env } = createTestEnv();
  const fetchImpl = async () => new Response(productWithVariantsHtml, { status: 200 });
  const app = createApp({ fetchImpl });

  const berkeProduct = await createTrackedProduct(
    env,
    { ownerKey: "berke", trendyolUrl: "https://www.trendyol.com/example/berke-p-1" },
    { fetchImpl, now: new Date("2026-03-27T10:00:00.000Z") },
  );
  const kaanProduct = await createTrackedProduct(
    env,
    { ownerKey: "kaan", trendyolUrl: "https://www.trendyol.com/example/kaan-p-1" },
    { fetchImpl, now: new Date("2026-03-27T10:01:00.000Z") },
  );

  const createBerke = await app.request(
    "http://localhost/owners/berke/categories",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Bileklik" }),
    },
    env,
  );
  const createKaan = await app.request(
    "http://localhost/owners/kaan/categories",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Bileklik" }),
    },
    env,
  );
  const duplicate = await app.request(
    "http://localhost/owners/berke/categories",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: " bileklik " }),
    },
    env,
  );

  const berkeCategory = ((await createBerke.json()) as { category: { id: string; name: string } }).category;

  const assign = await app.request(
    `http://localhost/owners/berke/products/${berkeProduct.product.id}/category`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ categoryId: berkeCategory.id }),
    },
    env,
  );
  const filtered = await app.request(
    `http://localhost/owners/berke/products?categoryId=${berkeCategory.id}`,
    undefined,
    env,
  );
  const uncategorized = await app.request("http://localhost/owners/berke/products?categoryId=uncategorized", undefined, env);
  const crossOwnerAssign = await app.request(
    `http://localhost/owners/kaan/products/${kaanProduct.product.id}/category`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ categoryId: berkeCategory.id }),
    },
    env,
  );
  const deleted = await app.request(
    `http://localhost/owners/berke/categories/${berkeCategory.id}`,
    { method: "DELETE" },
    env,
  );
  const detailAfterDelete = await app.request(
    `http://localhost/owners/berke/products/${berkeProduct.product.id}`,
    undefined,
    env,
  );

  expect(createBerke.status).toBe(201);
  expect(createKaan.status).toBe(201);
  expect(duplicate.status).toBe(409);
  expect(assign.status).toBe(200);
  expect((await filtered.json()) as { summary: unknown; items: unknown[]; filters: unknown }).toEqual({
    items: [expect.objectContaining({ id: berkeProduct.product.id, userCategory: { id: berkeCategory.id, name: "Bileklik" } })],
    summary: expect.any(Object),
    filters: expect.objectContaining({ categoryId: berkeCategory.id }),
  });
  expect((await uncategorized.json()) as { summary: unknown; items: unknown[]; filters: unknown }).toEqual({
    items: [],
    summary: expect.any(Object),
    filters: expect.objectContaining({ categoryId: "uncategorized" }),
  });
  expect(crossOwnerAssign.status).toBe(404);
  expect(deleted.status).toBe(204);
  expect((await detailAfterDelete.json()) as { product: { userCategory: null } }).toEqual(
    expect.objectContaining({
      product: expect.objectContaining({ userCategory: null }),
    }),
  );
});
```

- [ ] **Step 2: Run the focused integration test to capture the missing repository, route, and response shape failures**

Run: `pnpm --filter @trendyol-etsy/api test -- productCategories.test.ts`
Expected: FAIL with `404`, missing `product_categories` queries, or response objects that do not yet include `userCategory`

- [ ] **Step 3: Add the repository and service layer for normalized owner-scoped category CRUD**

```ts
// apps/api/src/db/repositories/productCategoriesRepo.ts
import type { OwnerKey } from "../../contracts/owners";
import type { D1Database } from "../../config/bindings";
import { productCategories } from "../schema";

export interface ProductCategoryRecord {
  id: string;
  ownerKey: OwnerKey;
  name: string;
}

export function createProductCategoriesRepo(db: D1Database) {
  return {
    db,
    tables: { productCategories },
    async list(ownerKey: OwnerKey) {
      const result = await db
        .prepare(
          `select id, owner_key as ownerKey, name
           from product_categories
           where owner_key = ?
           order by lower(name) asc, created_at asc`,
        )
        .bind(ownerKey)
        .all<ProductCategoryRecord>();

      return result.results;
    },
    async get(ownerKey: OwnerKey, categoryId: string) {
      return db
        .prepare(
          `select id, owner_key as ownerKey, name
           from product_categories
           where owner_key = ?
             and id = ?
           limit 1`,
        )
        .bind(ownerKey, categoryId)
        .first<ProductCategoryRecord>();
    },
    async findByNormalizedName(ownerKey: OwnerKey, normalizedName: string) {
      return db
        .prepare(
          `select id, owner_key as ownerKey, name
           from product_categories
           where owner_key = ?
             and lower(name) = lower(?)
           limit 1`,
        )
        .bind(ownerKey, normalizedName)
        .first<ProductCategoryRecord>();
    },
    async create(ownerKey: OwnerKey, name: string, now: Date) {
      const id = crypto.randomUUID();
      await db
        .prepare(
          `insert into product_categories (id, owner_key, name, created_at, updated_at)
           values (?, ?, ?, ?, ?)`,
        )
        .bind(id, ownerKey, name, now.getTime(), now.getTime())
        .run();

      return { id, ownerKey, name };
    },
    async rename(ownerKey: OwnerKey, categoryId: string, name: string, now: Date) {
      await db
        .prepare(
          `update product_categories
           set name = ?, updated_at = ?
           where owner_key = ?
             and id = ?`,
        )
        .bind(name, now.getTime(), ownerKey, categoryId)
        .run();

      return this.get(ownerKey, categoryId);
    },
    async deleteAndUnassign(ownerKey: OwnerKey, categoryId: string, now: Date) {
      const existing = await this.get(ownerKey, categoryId);
      if (!existing) {
        return null;
      }

      await db.batch([
        db.prepare(
          `update products
           set user_category_id = null, updated_at = ?
           where owner_key = ?
             and user_category_id = ?`,
        ).bind(now.getTime(), ownerKey, categoryId),
        db.prepare(
          `delete from product_categories
           where owner_key = ?
             and id = ?`,
        ).bind(ownerKey, categoryId),
      ]);

      return existing;
    },
  };
}
```

```ts
// apps/api/src/modules/tracking/productCategories.ts
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
  constructor() {
    super("Bu kategori zaten mevcut");
    this.name = "DuplicateCategoryNameError";
  }
}

function normalizeCategoryName(name: string) {
  const normalized = name.trim();
  if (!normalized) {
    throw new InvalidCategoryNameError();
  }
  return normalized;
}

export async function listProductCategories(db: D1Database, ownerKey: OwnerKey) {
  return createProductCategoriesRepo(db).list(ownerKey);
}

export async function createProductCategory(db: D1Database, ownerKey: OwnerKey, name: string, now = new Date()) {
  const normalized = normalizeCategoryName(name);
  const repo = createProductCategoriesRepo(db);
  const duplicate = await repo.findByNormalizedName(ownerKey, normalized);
  if (duplicate) {
    throw new DuplicateCategoryNameError();
  }
  return repo.create(ownerKey, normalized, now);
}

export async function renameProductCategory(
  db: D1Database,
  ownerKey: OwnerKey,
  categoryId: string,
  name: string,
  now = new Date(),
) {
  const normalized = normalizeCategoryName(name);
  const repo = createProductCategoriesRepo(db);
  const existing = await repo.get(ownerKey, categoryId);
  if (!existing) {
    return null;
  }
  const duplicate = await repo.findByNormalizedName(ownerKey, normalized);
  if (duplicate && duplicate.id !== categoryId) {
    throw new DuplicateCategoryNameError();
  }
  return repo.rename(ownerKey, categoryId, normalized, now);
}

export async function deleteProductCategory(db: D1Database, ownerKey: OwnerKey, categoryId: string, now = new Date()) {
  return createProductCategoriesRepo(db).deleteAndUnassign(ownerKey, categoryId, now);
}
```

- [ ] **Step 4: Extend product queries, view builders, and owner routes with category assignment and filtering**

```ts
// apps/api/src/db/repositories/productsRepo.ts
async listTrackingCards(
  ownerKey: OwnerKey,
  filters: {
    status?: string | null;
    parseStatus?: string | null;
    search?: string | null;
    favorite?: boolean;
    categoryId?: string | "uncategorized" | null;
  } = {},
) {
  const clauses: string[] = ["p.owner_key = ?", "p.deleted_at is null"];
  const values: unknown[] = [ownerKey];

  if (filters.categoryId === "uncategorized") {
    clauses.push("p.user_category_id is null");
  } else if (filters.categoryId) {
    clauses.push("p.user_category_id = ?");
    values.push(filters.categoryId);
  }

  const where = `where ${clauses.join(" and ")}`;
  const result = await db
    .prepare(
      `select p.id, p.owner_key as ownerKey, p.trendyol_url as trendyolUrl, p.title, p.brand, p.status,
              p.parse_status as parseStatus, p.images_raw as imagesRaw, p.is_favorite as isFavorite,
              pcs.current_price as currentPrice, pcs.min_price as minPrice, pcs.max_price as maxPrice,
              pcs.in_stock_variant_count as inStockVariantCount, pcs.total_variant_count as totalVariantCount,
              pcs.last_checked_at as lastCheckedAt,
              pc.id as userCategoryId, pc.name as userCategoryName
       from products p
       left join product_current_state pcs on pcs.product_id = p.id
       left join product_categories pc on pc.id = p.user_category_id and pc.owner_key = p.owner_key
       ${where}
       order by coalesce(pcs.last_checked_at, p.updated_at) desc, p.created_at desc`,
    )
    .bind(...values)
    .all<{
      id: string;
      ownerKey: OwnerKey;
      trendyolUrl: string;
      title: string | null;
      brand: string | null;
      status: string;
      parseStatus: string;
      imagesRaw: string | null;
      isFavorite: number | boolean | null;
      currentPrice: number | null;
      minPrice: number | null;
      maxPrice: number | null;
      inStockVariantCount: number | null;
      totalVariantCount: number | null;
      lastCheckedAt: number | null;
      userCategoryId: string | null;
      userCategoryName: string | null;
    }>();

  return result.results.map((item) => ({
    ...item,
    isFavorite: Boolean(item.isFavorite),
    userCategory:
      item.userCategoryId && item.userCategoryName
        ? { id: item.userCategoryId, name: item.userCategoryName }
        : null,
  }));
},
async getProductDetail(ownerKey: OwnerKey, productId: string) {
  const product = await db
    .prepare(
      `select p.id, p.owner_key as ownerKey, p.trendyol_url as trendyolUrl, p.source_product_id as sourceProductId,
              p.title, p.brand, p.category, p.user_category_id as userCategoryId,
              p.description_raw as descriptionRaw, p.attributes_raw as attributesRaw, p.images_raw as imagesRaw,
              p.status, p.parse_status as parseStatus, p.last_checked_at as lastCheckedAt,
              pcs.current_price as currentPrice, pcs.min_price as minPrice, pcs.max_price as maxPrice,
              pcs.in_stock_variant_count as inStockVariantCount, pcs.total_variant_count as totalVariantCount,
              pcs.last_change_at as lastChangeAt,
              pc.name as userCategoryName
       from products p
       left join product_current_state pcs on pcs.product_id = p.id
       left join product_categories pc on pc.id = p.user_category_id and pc.owner_key = p.owner_key
       where p.id = ?
         and p.owner_key = ?
         and p.deleted_at is null
       limit 1`,
    )
    .bind(productId, ownerKey)
    .first<{
      id: string;
      ownerKey: OwnerKey;
      trendyolUrl: string;
      sourceProductId: string | null;
      title: string | null;
      brand: string | null;
      category: string | null;
      userCategoryId: string | null;
      userCategoryName: string | null;
      descriptionRaw: string | null;
      attributesRaw: string | null;
      imagesRaw: string | null;
      status: string;
      parseStatus: string;
      lastCheckedAt: number | null;
      currentPrice: number | null;
      minPrice: number | null;
      maxPrice: number | null;
      inStockVariantCount: number | null;
      totalVariantCount: number | null;
      lastChangeAt: number | null;
    }>();

  if (!product) {
    return null;
  }

  return {
    product: {
      ...product,
      userCategory:
        product.userCategoryId && product.userCategoryName
          ? { id: product.userCategoryId, name: product.userCategoryName }
          : null,
    },
    currentState: {
      currentPrice: product.currentPrice,
      minPrice: product.minPrice,
      maxPrice: product.maxPrice,
      inStockVariantCount: product.inStockVariantCount ?? 0,
      totalVariantCount: product.totalVariantCount ?? 0,
      lastChangeAt: product.lastChangeAt,
      lastCheckedAt: product.lastCheckedAt,
    },
    variants,
  };
},
async setUserCategory(ownerKey: OwnerKey, productId: string, categoryId: string | null, now: Date) {
  const existing = await db
    .prepare("select id from products where id = ? and owner_key = ? and deleted_at is null limit 1")
    .bind(productId, ownerKey)
    .first<{ id: string }>();

  if (!existing) {
    return null;
  }

  await db
    .prepare(
      `update products
       set user_category_id = ?, updated_at = ?
       where id = ?
         and owner_key = ?
         and deleted_at is null`,
    )
    .bind(categoryId, now.getTime(), productId, ownerKey)
    .run();

  return { productId, userCategoryId: categoryId };
},
```

```ts
// apps/api/src/modules/tracking/setTrackedProductCategory.ts
import type { OwnerKey } from "../../contracts/owners";
import type { D1Database } from "../../config/bindings";
import { createProductCategoriesRepo } from "../../db/repositories/productCategoriesRepo";
import { createProductsRepo } from "../../db/repositories/productsRepo";

export async function setTrackedProductCategory(
  db: D1Database,
  ownerKey: OwnerKey,
  productId: string,
  categoryId: string | null,
  now = new Date(),
) {
  const productsRepo = createProductsRepo(db);
  const product = await productsRepo.getTrackedProduct(productId, ownerKey);
  if (!product) {
    return null;
  }

  const category = categoryId ? await createProductCategoriesRepo(db).get(ownerKey, categoryId) : null;
  if (categoryId && !category) {
    return null;
  }

  await productsRepo.setUserCategory(ownerKey, productId, categoryId, now);

  return {
    productId,
    userCategory: category ? { id: category.id, name: category.name } : null,
  };
}
```

```ts
// apps/api/src/routes/categories.ts
import { Hono } from "hono";

import type { Env } from "../config/bindings";
import { ownerKeySchema } from "../contracts/owners";
import {
  createProductCategory,
  deleteProductCategory,
  DuplicateCategoryNameError,
  InvalidCategoryNameError,
  listProductCategories,
  renameProductCategory,
} from "../modules/tracking/productCategories";

function parseOwnerKey(value: string | undefined) {
  const parsed = ownerKeySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function createCategoriesRouter() {
  const app = new Hono<{ Bindings: Env }>();

  app.get("/", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    return c.json({ items: await listProductCategories(c.env.DB, ownerKey) });
  });

  app.post("/", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const body = await c.req.json<{ name?: string }>().catch(() => null);
    if (typeof body?.name !== "string") {
      return c.json({ error: "Kategori adi gerekli" }, 400);
    }

    try {
      const category = await createProductCategory(c.env.DB, ownerKey, body.name, new Date());
      return c.json({ category }, 201);
    } catch (error) {
      if (error instanceof InvalidCategoryNameError) {
        return c.json({ error: error.message }, 400);
      }
      if (error instanceof DuplicateCategoryNameError) {
        return c.json({ error: error.message }, 409);
      }
      throw error;
    }
  });

  app.patch("/:categoryId", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const body = await c.req.json<{ name?: string }>().catch(() => null);
    if (typeof body?.name !== "string") {
      return c.json({ error: "Kategori adi gerekli" }, 400);
    }

    try {
      const category = await renameProductCategory(c.env.DB, ownerKey, c.req.param("categoryId"), body.name, new Date());
      if (!category) {
        return c.json({ error: "Kayit bulunamadi" }, 404);
      }
      return c.json({ category });
    } catch (error) {
      if (error instanceof InvalidCategoryNameError) {
        return c.json({ error: error.message }, 400);
      }
      if (error instanceof DuplicateCategoryNameError) {
        return c.json({ error: error.message }, 409);
      }
      throw error;
    }
  });

  app.delete("/:categoryId", async (c) => {
    const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
    if (!ownerKey) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    const deleted = await deleteProductCategory(c.env.DB, ownerKey, c.req.param("categoryId"), new Date());
    if (!deleted) {
      return c.json({ error: "Kayit bulunamadi" }, 404);
    }

    return c.body(null, 204);
  });

  return app;
}
```

```ts
// apps/api/src/routes/owners.ts
const view = await buildTrackingListView(c.env.DB, ownerKey, {
  status: c.req.query("status"),
  parseStatus: c.req.query("parseStatus"),
  search: c.req.query("search"),
  favorite,
  categoryId: c.req.query("categoryId") ?? undefined,
});

app.patch("/products/:productId/category", async (c) => {
  const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
  if (!ownerKey) {
    return c.json({ error: "Kayit bulunamadi" }, 404);
  }

  const body = await c.req.json<{ categoryId?: string | null }>().catch(() => null);
  if (!body || !("categoryId" in body) || (body.categoryId !== null && typeof body.categoryId !== "string")) {
    return c.json({ error: "categoryId is required" }, 400);
  }

  const result = await setTrackedProductCategory(c.env.DB, ownerKey, c.req.param("productId"), body.categoryId, new Date());
  if (!result) {
    return c.json({ error: "Kayit bulunamadi" }, 404);
  }

  return c.json(result);
});

app.route("/categories", createCategoriesRouter());
```

- [ ] **Step 5: Re-run the API tests and typecheck**

Run: `pnpm --filter @trendyol-etsy/api test -- productCategories.test.ts && pnpm --filter @trendyol-etsy/api typecheck`
Expected: PASS, with `201/200/204/409/404` statuses matching the owner-scoped category rules

- [ ] **Step 6: Commit the API slice**

```bash
git add apps/api/src/db/repositories/productCategoriesRepo.ts apps/api/src/db/repositories/productsRepo.ts apps/api/src/modules/tracking/productCategories.ts apps/api/src/modules/tracking/setTrackedProductCategory.ts apps/api/src/modules/tracking/buildTrackingListView.ts apps/api/src/modules/tracking/buildProductDetailView.ts apps/api/src/routes/categories.ts apps/api/src/routes/owners.ts apps/api/tests/integration/productCategories.test.ts
git commit -m "feat: add owner scoped product categories api"
```

## Task 3: Add category filters and category management to the tracking screen

**Files:**
- Modify: `apps/web/src/app/api.ts:3-35,74-132,448-519`
- Create: `apps/web/src/features/tracking/components/CategoryManagerDialog.tsx`
- Create: `apps/web/src/features/tracking/components/CategoryManagerDialog.test.tsx`
- Modify: `apps/web/src/features/tracking/components/TrackingFilters.tsx:1-20`
- Modify: `apps/web/src/features/tracking/routes/TrackingCenterPage.tsx:22-167`
- Modify: `apps/web/src/features/tracking/routes/TrackingCenterPage.test.tsx:9-165`

- [ ] **Step 1: Write the failing web tests for category fetch, filter selection, and management modal**

```tsx
it("loads owner-scoped categories, forwards categoryId to the list request, and opens the manager modal", async () => {
  const user = userEvent.setup();
  const trackingPayload = {
    summary: {
      trackedCount: 186,
      activeCount: 183,
      reviewNeededCount: 3,
    },
    items: [
      {
        id: "prod_1",
        ownerKey: "berke",
        title: "Oversize Hoodie",
        brand: "North Apparel",
        trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123",
        status: "ACTIVE",
        parseStatus: "OK",
        thumbnailImage: "https://cdn.example.com/hoodie-1.jpg",
        currentPrice: 42990,
        minPrice: 34990,
        maxPrice: 44990,
        inStockVariantCount: 12,
        totalVariantCount: 18,
        isFavorite: false,
        userCategory: null,
      },
    ],
    filters: {},
  };
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);

    if (url.includes("/owners/berke/categories") && (!init?.method || init.method === "GET")) {
      return new Response(JSON.stringify({ items: [{ id: "cat_bileklik", name: "Bileklik" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.includes("categoryId=cat_bileklik")) {
      return new Response(JSON.stringify({ summary: trackingPayload.summary, items: [], filters: { categoryId: "cat_bileklik" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.includes("/owners/berke/products/refresh-runs/active")) {
      return new Response(JSON.stringify({ run: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(trackingPayload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  renderWithProviders(<TrackingCenterPage />, {
    route: "/owners/berke/products",
    path: "/owners/:ownerKey/products",
  });

  await user.selectOptions(await screen.findByLabelText(/kategori filtresi/i), "cat_bileklik");
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/owners/berke/products?categoryId=cat_bileklik"),
      expect.anything(),
    ),
  );

  await user.click(screen.getByRole("button", { name: /kategori yonet/i }));
  expect(screen.getByRole("heading", { name: /kategorileri yonet/i })).toBeInTheDocument();
});
```

```tsx
it("submits create, rename, and delete callbacks from the category manager dialog", async () => {
  const user = userEvent.setup();
  const onCreate = vi.fn();
  const onRename = vi.fn();
  const onDelete = vi.fn();

  renderWithProviders(
    <CategoryManagerDialog
      open
      categories={[{ id: "cat_1", name: "Bileklik" }]}
      onClose={vi.fn()}
      onCreate={onCreate}
      onRename={onRename}
      onDelete={onDelete}
      errorMessage={null}
    />,
  );

  await user.type(screen.getByLabelText(/yeni kategori/i), "Bardak");
  await user.click(screen.getByRole("button", { name: /kategori olustur/i }));
  await user.clear(screen.getByDisplayValue("Bileklik"));
  await user.type(screen.getByLabelText(/kategori adi cat_1/i), "Kolye");
  await user.click(screen.getByRole("button", { name: /kaydet cat_1/i }));
  await user.click(screen.getByRole("button", { name: /sil cat_1/i }));

  expect(onCreate).toHaveBeenCalledWith("Bardak");
  expect(onRename).toHaveBeenCalledWith("cat_1", "Kolye");
  expect(onDelete).toHaveBeenCalledWith("cat_1");
});
```

- [ ] **Step 2: Run the focused web tests to capture the missing client types and UI controls**

Run: `pnpm --filter @trendyol-etsy/web test -- TrackingCenterPage.test.tsx CategoryManagerDialog.test.tsx`
Expected: FAIL with missing `fetchProductCategories`, missing category filter UI, or missing modal component

- [ ] **Step 3: Extend the web API client with category DTOs and CRUD helpers**

```ts
// apps/web/src/app/api.ts
export interface ProductCategory {
  id: string;
  name: string;
}

export interface TrackingItem {
  id: string;
  ownerKey: OwnerKey;
  trendyolUrl?: string;
  title: string | null;
  brand: string | null;
  status: string;
  parseStatus: string;
  thumbnailImage: string | null;
  currentPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  inStockVariantCount: number | null;
  totalVariantCount: number | null;
  isFavorite: boolean;
  userCategory: ProductCategory | null;
  lastCheckedAt?: number | null;
}

export interface TrackingViewResponse {
  summary: TrackingSummary;
  items: TrackingItem[];
  filters: {
    status?: string | null;
    parseStatus?: string | null;
    search?: string | null;
    favorite?: boolean;
    categoryId?: string | null;
  };
}

export interface ProductDetailResponse {
  product: {
    id: string;
    ownerKey: OwnerKey;
    trendyolUrl: string;
    sourceProductId: string | null;
    title: string | null;
    brand: string | null;
    category: string | null;
    userCategory: ProductCategory | null;
    descriptionRaw: string | null;
    attributes: DetailAttribute[] | null;
    images: string[] | null;
    status: string;
    parseStatus: string;
    lastCheckedAt: number | null;
  };
  currentState: {
    currentPrice: number | null;
    minPrice: number | null;
    maxPrice: number | null;
    inStockVariantCount: number;
    totalVariantCount: number;
    lastChangeAt: number | null;
    lastCheckedAt: number | null;
  };
  variants: Array<{
    id: string;
    variantKey: string;
    option1: string | null;
    option2: string | null;
    option3: string | null;
    trendyolUrl: string | null;
    currentStockState: string;
    currentPrice: number | null;
    lastSeenAt: number | null;
    rawPayload: Record<string, unknown> | null;
  }>;
  priceHistory: Array<{
    id: string;
    productId: string;
    variantId: string | null;
    previousPrice: number | null;
    newPrice: number | null;
    changedAt: number;
    changeReason: string | null;
    refreshAuditId: string | null;
  }>;
  stockHistory: Array<{
    id: string;
    productId: string;
    variantId: string;
    previousStockState: string | null;
    newStockState: string;
    changedAt: number;
    refreshAuditId: string | null;
  }>;
  changeTimeline: ProductChangeTimelineItem[];
  notifications: NotificationItem[];
}

export async function fetchTrackingView(
  ownerKey: OwnerKey,
  options: { favoriteOnly?: boolean; categoryId?: string | "uncategorized" | null } = {},
): Promise<TrackingViewResponse> {
  const search = new URLSearchParams();
  if (options.favoriteOnly) {
    search.set("favorite", "true");
  }
  if (options.categoryId) {
    search.set("categoryId", options.categoryId);
  }

  const suffix = search.toString() ? `?${search.toString()}` : "";
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products${suffix}`);
  return parseJson<TrackingViewResponse>(response);
}

export async function fetchProductCategories(ownerKey: OwnerKey) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/categories`);
  return parseJson<{ items: ProductCategory[] }>(response);
}

export async function createProductCategory(ownerKey: OwnerKey, name: string) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return parseJson<{ category: ProductCategory }>(response);
}

export async function renameProductCategory(ownerKey: OwnerKey, categoryId: string, name: string) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/categories/${categoryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return parseJson<{ category: ProductCategory }>(response);
}

export async function deleteProductCategory(ownerKey: OwnerKey, categoryId: string) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/categories/${categoryId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    await parseJson<{ error: string }>(response);
  }
}

export async function setTrackedProductCategory(ownerKey: OwnerKey, productId: string, categoryId: string | null) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products/${productId}/category`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ categoryId }),
  });
  return parseJson<{ productId: string; userCategory: ProductCategory | null }>(response);
}
```

- [ ] **Step 4: Build the category manager dialog and wire category filtering into `TrackingCenterPage`**

```tsx
// apps/web/src/features/tracking/components/CategoryManagerDialog.tsx
import { useEffect, useState } from "react";

import type { ProductCategory } from "../../../app/api";

interface CategoryManagerDialogProps {
  open: boolean;
  categories: ProductCategory[];
  errorMessage: string | null;
  onClose: () => void;
  onCreate: (name: string) => void;
  onRename: (categoryId: string, name: string) => void;
  onDelete: (categoryId: string) => void;
}

export function CategoryManagerDialog({
  open,
  categories,
  errorMessage,
  onClose,
  onCreate,
  onRename,
  onDelete,
}: CategoryManagerDialogProps) {
  const [newName, setNewName] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setDrafts(Object.fromEntries(categories.map((category) => [category.id, category.name])));
  }, [categories]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-xl font-semibold text-slate-900">Kategorileri Yonet</h3>
          <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-600">
            Kapat
          </button>
        </div>

        <div className="mt-6 rounded-3xl bg-slate-50 p-4">
          <label className="block text-sm font-medium text-slate-700" htmlFor="new-category-name">
            Yeni kategori
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="new-category-name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            />
            <button
              type="button"
              onClick={() => {
                onCreate(newName.trim());
                setNewName("");
              }}
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
            >
              Kategori olustur
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center gap-2 rounded-2xl border border-slate-200 p-3">
              <label className="sr-only" htmlFor={`category-name-${category.id}`}>
                {`Kategori adi ${category.id}`}
              </label>
              <input
                id={`category-name-${category.id}`}
                value={drafts[category.id] ?? category.name}
                onChange={(event) => setDrafts((current) => ({ ...current, [category.id]: event.target.value }))}
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              />
              <button
                type="button"
                onClick={() => onRename(category.id, (drafts[category.id] ?? category.name).trim())}
                aria-label={`Kaydet ${category.id}`}
                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
              >
                Kaydet
              </button>
              <button
                type="button"
                onClick={() => onDelete(category.id)}
                aria-label={`Sil ${category.id}`}
                className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
              >
                Sil
              </button>
            </div>
          ))}
        </div>

        {errorMessage ? <p className="mt-4 text-sm text-rose-600">{errorMessage}</p> : null}
      </div>
    </div>
  );
}
```

```tsx
// apps/web/src/features/tracking/components/TrackingFilters.tsx
import type { ProductCategory } from "../../../app/api";

interface TrackingFiltersProps {
  search: string;
  selectedCategoryId: string | "uncategorized" | null;
  categories: ProductCategory[];
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string | "uncategorized" | null) => void;
  onManageCategories: () => void;
}

export function TrackingFilters({
  search,
  selectedCategoryId,
  categories,
  onSearchChange,
  onCategoryChange,
  onManageCategories,
}: TrackingFiltersProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)_auto] lg:items-end">
        <div>
          <label className="block text-sm font-medium text-slate-600" htmlFor="tracking-search">
            Arama
          </label>
          <input
            id="tracking-search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Urun veya marka ara"
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#F1641E]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600" htmlFor="tracking-category-filter">
            Kategori filtresi
          </label>
          <select
            id="tracking-category-filter"
            value={selectedCategoryId ?? ""}
            onChange={(event) => onCategoryChange(event.target.value === "" ? null : (event.target.value as string | "uncategorized"))}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#F1641E]"
          >
            <option value="">Tumu</option>
            <option value="uncategorized">Kategorisiz</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={onManageCategories}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
        >
          Kategori yonet
        </button>
      </div>
    </div>
  );
}
```

```tsx
// apps/web/src/features/tracking/routes/TrackingCenterPage.tsx
const [selectedCategoryId, setSelectedCategoryId] = useState<string | "uncategorized" | null>(null);
const [isCategoryManagerOpen, setCategoryManagerOpen] = useState(false);

const categoriesQuery = useQuery({
  queryKey: ["product-categories", ownerKey],
  enabled: Boolean(ownerKey),
  queryFn: async () => (await fetchProductCategories(ownerKey as OwnerKey)).items,
});

const trackingQuery = useQuery({
  queryKey: ["tracking-products", ownerKey, view, selectedCategoryId],
  enabled: Boolean(ownerKey),
  queryFn: () =>
    fetchTrackingView(ownerKey as OwnerKey, {
      favoriteOnly: view === "favorites",
      categoryId: selectedCategoryId,
    }),
});

const createCategoryMutation = useMutation({
  mutationFn: (name: string) => createProductCategory(ownerKey as OwnerKey, name),
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: ["product-categories", ownerKey] });
  },
});

const renameCategoryMutation = useMutation({
  mutationFn: ({ categoryId, name }: { categoryId: string; name: string }) =>
    renameProductCategory(ownerKey as OwnerKey, categoryId, name),
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: ["product-categories", ownerKey] });
    await queryClient.invalidateQueries({ queryKey: ["tracking-products", ownerKey] });
  },
});

const deleteCategoryMutation = useMutation({
  mutationFn: (categoryId: string) => deleteProductCategory(ownerKey as OwnerKey, categoryId),
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: ["product-categories", ownerKey] });
    await queryClient.invalidateQueries({ queryKey: ["tracking-products", ownerKey] });
  },
});

<TrackingFilters
  search={search}
  selectedCategoryId={selectedCategoryId}
  categories={categoriesQuery.data ?? []}
  onSearchChange={setSearch}
  onCategoryChange={setSelectedCategoryId}
  onManageCategories={() => setCategoryManagerOpen(true)}
/>

<CategoryManagerDialog
  open={isCategoryManagerOpen}
  categories={categoriesQuery.data ?? []}
  errorMessage={
    createCategoryMutation.error instanceof Error
      ? createCategoryMutation.error.message
      : renameCategoryMutation.error instanceof Error
        ? renameCategoryMutation.error.message
        : deleteCategoryMutation.error instanceof Error
          ? deleteCategoryMutation.error.message
          : null
  }
  onClose={() => setCategoryManagerOpen(false)}
  onCreate={(name) => createCategoryMutation.mutate(name)}
  onRename={(categoryId, name) => renameCategoryMutation.mutate({ categoryId, name })}
  onDelete={(categoryId) => deleteCategoryMutation.mutate(categoryId)}
/>
```

- [ ] **Step 5: Re-run the web tests and typecheck**

Run: `pnpm --filter @trendyol-etsy/web test -- TrackingCenterPage.test.tsx CategoryManagerDialog.test.tsx && pnpm --filter @trendyol-etsy/web typecheck`
Expected: PASS, and the list request now includes `categoryId` when the filter changes

- [ ] **Step 6: Commit the tracking management UI slice**

```bash
git add apps/web/src/app/api.ts apps/web/src/features/tracking/components/CategoryManagerDialog.tsx apps/web/src/features/tracking/components/CategoryManagerDialog.test.tsx apps/web/src/features/tracking/components/TrackingFilters.tsx apps/web/src/features/tracking/routes/TrackingCenterPage.tsx apps/web/src/features/tracking/routes/TrackingCenterPage.test.tsx
git commit -m "feat: add tracking category filters"
```

## Task 4: Add category assignment controls to product cards and the product detail page

**Files:**
- Create: `apps/web/src/features/tracking/components/ProductCategorySelect.tsx`
- Modify: `apps/web/src/features/tracking/components/ProductCard.tsx:8-107`
- Modify: `apps/web/src/features/tracking/components/ProductCard.test.tsx:9-122`
- Modify: `apps/web/src/features/tracking/routes/TrackingCenterPage.tsx:22-167`
- Modify: `apps/web/src/features/product/components/ProductSummary.tsx:11-97`
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.tsx:16-80`
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.test.tsx:10-185`

- [ ] **Step 1: Write the failing tests for card-level and detail-level category assignment**

```tsx
it("emits the selected category change from the product card", async () => {
  const user = userEvent.setup();
  const onCategoryChange = vi.fn();

  renderWithProviders(
    <ProductCard
      ownerKey="berke"
      item={{
        ...baseItem,
        thumbnailImage: "https://cdn.example.com/hoodie-1.jpg",
        userCategory: { id: "cat_1", name: "Bileklik" },
      }}
      categories={[
        { id: "cat_1", name: "Bileklik" },
        { id: "cat_2", name: "Bardak" },
      ]}
      onCategoryChange={onCategoryChange}
    />,
  );

  await user.selectOptions(screen.getByLabelText(/takip kategorisi/i), "cat_2");
  expect(onCategoryChange).toHaveBeenCalledWith(expect.objectContaining({ id: "prod_1" }), "cat_2");
});
```

```tsx
it("updates the owner-scoped product category from the detail page", async () => {
  installMockLocalStorage();
  const user = userEvent.setup();
  const productDetailPayload = {
    product: {
      id: "prod_1",
      ownerKey: "berke",
      trendyolUrl: "https://www.trendyol.com/example",
      sourceProductId: "123",
      title: "Oversize Hoodie",
      brand: "North Apparel",
      category: "Sweatshirt",
      userCategory: null,
      descriptionRaw: "Yumusak dokulu oversize hoodie.",
      attributes: [{ key: "Renk", value: "Siyah" }],
      images: ["https://cdn.example.com/hoodie-1.jpg"],
      status: "ACTIVE",
      parseStatus: "OK",
      lastCheckedAt: Date.parse("2026-03-20T10:00:00.000Z"),
    },
    currentState: {
      currentPrice: 44990,
      minPrice: 34990,
      maxPrice: 44990,
      inStockVariantCount: 2,
      totalVariantCount: 3,
      lastChangeAt: Date.parse("2026-03-20T09:30:00.000Z"),
      lastCheckedAt: Date.parse("2026-03-20T10:00:00.000Z"),
    },
    variants: [],
    priceHistory: [],
    stockHistory: [],
    changeTimeline: [],
    notifications: [],
  };
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);

    if (url.endsWith("/owners/berke/categories") && (!init?.method || init.method === "GET")) {
      return jsonResponse({ items: [{ id: "cat_bardak", name: "Bardak" }] });
    }

    if (url.includes("/owners/berke/products/prod_1/category") && init?.method === "PATCH") {
      return jsonResponse({ productId: "prod_1", userCategory: { id: "cat_bardak", name: "Bardak" } });
    }

    if (url.includes("/owners/berke/products/prod_1")) {
      return jsonResponse(productDetailPayload);
    }

    throw new Error(`Unhandled request: ${url}`);
  });

  renderWithProviders(<ProductDetailPage />, {
    route: "/owners/berke/products/prod_1",
    path: "/owners/:ownerKey/products/:productId",
  });

  await user.selectOptions(await screen.findByLabelText(/takip kategorisi/i), "cat_bardak");
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/owners/berke/products/prod_1/category"),
      expect.objectContaining({ method: "PATCH" }),
    ),
  );
});
```

- [ ] **Step 2: Run the focused tests to confirm the card/detail controls do not exist yet**

Run: `pnpm --filter @trendyol-etsy/web test -- ProductCard.test.tsx ProductDetailPage.test.tsx`
Expected: FAIL with missing `Takip kategorisi` controls or missing `PATCH /category` wiring

- [ ] **Step 3: Create the shared category select and wire it into `ProductCard` plus the tracking page mutation**

```tsx
// apps/web/src/features/tracking/components/ProductCategorySelect.tsx
import type { ProductCategory } from "../../../app/api";

interface ProductCategorySelectProps {
  label: string;
  categories: ProductCategory[];
  value: string | null;
  disabled?: boolean;
  inputId: string;
  onChange: (categoryId: string | null) => void;
}

export function ProductCategorySelect({
  label,
  categories,
  value,
  disabled = false,
  inputId,
  onChange,
}: ProductCategorySelectProps) {
  return (
    <label className="flex min-w-[220px] flex-col gap-1 text-sm text-slate-600" htmlFor={inputId}>
      <span>{label}</span>
      <select
        id={inputId}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value === "" ? null : event.target.value)}
        disabled={disabled}
        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
      >
        <option value="">Kategorisiz</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
    </label>
  );
}
```

```tsx
// apps/web/src/features/tracking/components/ProductCard.tsx
interface ProductCardProps {
  ownerKey: OwnerKey;
  item: TrackingItem;
  categories?: ProductCategory[];
  onToggleFavorite?: (item: TrackingItem) => void;
  onDelete?: (item: TrackingItem) => void;
  onCategoryChange?: (item: TrackingItem, categoryId: string | null) => void;
  favoritePending?: boolean;
  deletePending?: boolean;
  categoryPending?: boolean;
}

const actionsDisabled = favoritePending || deletePending || categoryPending;

<div className="min-w-0">
  <h3 className="text-lg font-semibold text-slate-900">
    <Link to={productHref} className="inline-block hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300">
      {title}
    </Link>
  </h3>
  <p className="mt-1 text-sm text-slate-500">{item.brand ?? "Marka yok"}</p>
  <div className="mt-2 flex flex-wrap items-center gap-2">
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
      {item.userCategory?.name ?? "Kategorisiz"}
    </span>
    {categories?.length ? (
      <ProductCategorySelect
        label="Takip kategorisi"
        inputId={`product-category-${item.id}`}
        categories={categories}
        value={item.userCategory?.id ?? null}
        disabled={actionsDisabled}
        onChange={(categoryId) => onCategoryChange?.(item, categoryId)}
      />
    ) : null}
  </div>
</div>
```

```tsx
// apps/web/src/features/tracking/routes/TrackingCenterPage.tsx
const categoryAssignmentMutation = useMutation({
  mutationFn: ({ productId, categoryId }: { productId: string; categoryId: string | null }) =>
    setTrackedProductCategory(ownerKey as OwnerKey, productId, categoryId),
  onSuccess: async (_result, variables) => {
    await queryClient.invalidateQueries({ queryKey: ["tracking-products", ownerKey] });
    await queryClient.invalidateQueries({ queryKey: ["product-detail", ownerKey, variables.productId] });
  },
});

function handleCategoryChange(item: TrackingItem, categoryId: string | null) {
  categoryAssignmentMutation.mutate({ productId: item.id, categoryId });
}

<ProductCard
  key={item.id}
  ownerKey={ownerKey}
  item={item}
  categories={categoriesQuery.data ?? []}
  onToggleFavorite={handleToggleFavorite}
  onDelete={handleDelete}
  onCategoryChange={handleCategoryChange}
  favoritePending={favoritePending}
  deletePending={deletePending}
  categoryPending={categoryAssignmentMutation.isPending && categoryAssignmentMutation.variables?.productId === item.id}
/>
```

- [ ] **Step 4: Wire the same category select into the product detail page and show source-vs-user category labels**

```tsx
// apps/web/src/features/product/components/ProductSummary.tsx
interface ProductSummaryProps {
  ownerKey: OwnerKey;
  detail: ProductDetailResponse;
  categories: ProductCategory[];
  categoryPending?: boolean;
  onCategoryChange: (categoryId: string | null) => void;
  action?: ReactNode;
}

<div className="rounded-3xl bg-slate-50 p-4">
  <p className="text-sm font-semibold text-slate-900">Kategori Bilgisi</p>
  <dl className="mt-3 space-y-2 text-sm text-slate-600">
    <div className="flex items-center justify-between gap-3">
      <dt>Kaynak kategori</dt>
      <dd>{detail.product.category ?? "Bilinmiyor"}</dd>
    </div>
  </dl>
  <div className="mt-4">
    <ProductCategorySelect
      label="Takip kategorisi"
      inputId="product-detail-category"
      categories={categories}
      value={detail.product.userCategory?.id ?? null}
      disabled={categoryPending}
      onChange={onCategoryChange}
    />
  </div>
</div>
```

```tsx
// apps/web/src/features/product/routes/ProductDetailPage.tsx
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const queryClient = useQueryClient();
const categoriesQuery = useQuery({
  queryKey: ["product-categories", ownerKey],
  enabled: Boolean(ownerKey),
  queryFn: async () => (await fetchProductCategories(ownerKey as OwnerKey)).items,
});

const categoryMutation = useMutation({
  mutationFn: (categoryId: string | null) => setTrackedProductCategory(ownerKey as OwnerKey, productId as string, categoryId),
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: ["product-detail", ownerKey, productId] });
    await queryClient.invalidateQueries({ queryKey: ["tracking-products", ownerKey] });
  },
});

<ProductSummary
  ownerKey={ownerKey}
  detail={detailQuery.data}
  categories={categoriesQuery.data ?? []}
  categoryPending={categoryMutation.isPending}
  onCategoryChange={(categoryId) => categoryMutation.mutate(categoryId)}
  action={
    mode === "overview" ? (
      <button
        type="button"
        className="rounded-2xl bg-[#F1641E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d95518]"
        onClick={openPrepMode}
      >
        Etsy'e Yukle
      </button>
    ) : null
  }
/>
```

- [ ] **Step 5: Re-run the focused assignment tests and full web typecheck**

Run: `pnpm --filter @trendyol-etsy/web test -- ProductCard.test.tsx ProductDetailPage.test.tsx TrackingCenterPage.test.tsx && pnpm --filter @trendyol-etsy/web typecheck`
Expected: PASS, and both card/detail flows call the owner-scoped `PATCH /category` endpoint

- [ ] **Step 6: Commit the assignment UI slice**

```bash
git add apps/web/src/features/tracking/components/ProductCategorySelect.tsx apps/web/src/features/tracking/components/ProductCard.tsx apps/web/src/features/tracking/components/ProductCard.test.tsx apps/web/src/features/tracking/routes/TrackingCenterPage.tsx apps/web/src/features/product/components/ProductSummary.tsx apps/web/src/features/product/routes/ProductDetailPage.tsx apps/web/src/features/product/routes/ProductDetailPage.test.tsx
git commit -m "feat: add product category assignment ui"
```
