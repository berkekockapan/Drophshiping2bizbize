# Image Metadata Cleaner Format Sniffing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Yanlis uzantili ama gecerli JPEG/PNG/WebP dosyalarini gercek binary imzasina gore temizlemek, cikti uzantisini duzeltmek ve favicon 404 gurultusunu kaldirmak.

**Architecture:** `metadataCleaner` icine uzantidan bagimsiz bir signature algilama katmani eklenecek. Hook tarafi worker cevabindaki gercek formata gore MIME type ve ZIP hedef yolunu duzeltecek; web girisi de acik favicon linki ile varsayilan icon 404 istegini durduracak.

**Tech Stack:** React, TypeScript, Vitest, Vite

---

### Task 1: Gercek format algilama ve temizleyici sonucunu genislet

**Files:**
- Modify: `apps/web/src/features/mediaMetadataCleaner/lib/metadataCleaner.ts`
- Test: `apps/web/src/features/mediaMetadataCleaner/lib/metadataCleaner.test.ts`

- [ ] **Step 1: Uzanti/icerik uyusmazligi icin failing test yaz**

```ts
const jpegBytes = makeMinimalJpeg();
const result = cleanImageMetadata({ fileName: "mismatch.png", bytes: jpegBytes });
expect(result.status).toBe("success");
expect(result.format).toBe("jpeg");
```

- [ ] **Step 2: Testi calistir ve fail oldugunu dogrula**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/mediaMetadataCleaner/lib/metadataCleaner.test.ts`
Expected: FAIL with PNG baslik hatasi veya format beklentisi uyusmazligi

- [ ] **Step 3: Signature algilama ve sonuc metadata'sini ekle**

```ts
const sniffedFormat = detectFormatFromBytes(input.bytes);
const effectiveFormat = sniffedFormat ?? extensionFormat;
```

- [ ] **Step 4: Testi tekrar calistir ve gectigini dogrula**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/mediaMetadataCleaner/lib/metadataCleaner.test.ts`
Expected: PASS

### Task 2: Hook tarafinda cikti MIME type ve ZIP hedef yolunu duzelt

**Files:**
- Modify: `apps/web/src/features/mediaMetadataCleaner/hooks/useImageMetadataCleaner.ts`
- Modify: `apps/web/src/features/mediaMetadataCleaner/lib/pathUtils.ts`
- Modify: `apps/web/src/features/mediaMetadataCleaner/hooks/useImageMetadataCleaner.test.tsx`

- [ ] **Step 1: ZIP hedef yolunu dogrulayan failing hook testi yaz**

```ts
expect(zipItems[0]).toEqual(
  expect.objectContaining({ sourcePath: "gallery/success.jpg" }),
);
```

- [ ] **Step 2: Testi calistir ve fail oldugunu dogrula**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/mediaMetadataCleaner/hooks/useImageMetadataCleaner.test.tsx`
Expected: FAIL because current code keeps the original relative path

- [ ] **Step 3: Gercek format bazli MIME/path duzeltmesini uygula**

```ts
const outputPath = replaceRelativePathExtension(item.relativePath, response.format);
const outputBlob = new Blob([response.cleanedBytes], { type: getMimeTypeFromFormat(response.format) });
```

- [ ] **Step 4: Hook testini tekrar calistir ve gectigini dogrula**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/mediaMetadataCleaner/hooks/useImageMetadataCleaner.test.tsx`
Expected: PASS

### Task 3: Favicon 404 gurultusunu kaldir

**Files:**
- Modify: `apps/web/index.html`
- Create: `apps/web/public/favicon.svg`

- [ ] **Step 1: Acik favicon linki ekle**

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

- [ ] **Step 2: Basit favicon asset'ini ekle**

```svg
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">...</svg>
```

- [ ] **Step 3: Web build/test ile giris dosyasini dogrula**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/mediaMetadataCleaner/routes/ImageMetadataCleanerPage.test.tsx`
Expected: PASS

### Task 4: Regresyon testi

**Files:**
- Test: `apps/web/src/features/mediaMetadataCleaner/lib/metadataCleaner.test.ts`
- Test: `apps/web/src/features/mediaMetadataCleaner/hooks/useImageMetadataCleaner.test.tsx`
- Test: `apps/web/src/features/mediaMetadataCleaner/routes/ImageMetadataCleanerPage.test.tsx`

- [ ] **Step 1: Hedef test paketini calistir**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/mediaMetadataCleaner/lib/metadataCleaner.test.ts src/features/mediaMetadataCleaner/hooks/useImageMetadataCleaner.test.tsx src/features/mediaMetadataCleaner/routes/ImageMetadataCleanerPage.test.tsx`
Expected: PASS

- [ ] **Step 2: Degisiklikleri gozden gecir**

Run: `git diff -- apps/web/src/features/mediaMetadataCleaner apps/web/index.html apps/web/public/favicon.svg`
Expected: Yalnizca hedeflenen dosya farklari gorunur
