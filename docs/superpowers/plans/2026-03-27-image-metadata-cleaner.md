# Image Metadata Cleaner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ayarlar altinda acilan, tarayici icinde calisan, toplu gorsel metadata temizleme aracini parser-first lossless stratejiyle tamamlamak ve sonucu tek ZIP olarak indirtmek.

**Architecture:** Route ve Settings entry-point katmani sadece yonlendirme/gorunurluk saglayacak; asil is mantigi `mediaMetadataCleaner` feature modulunde kalacak. Dosya toplama -> worker havuzu ile format bazli temizleme -> normalize sonuc -> ZIP paketleme boru hatti tek bir hook tarafindan orkestre edilecek. Format parserlari (JPEG/PNG/WebP + kontrollu HEIC/AVIF) saf binary utility dosyalarinda tutulacak, UI ise sadece durum modelini render edecek.

**Tech Stack:** TypeScript, React, React Router, Web Workers, JSZip, Vitest, Testing Library, Tailwind CSS

---

## Implementation Notes

- Kaynak spec: `docs/superpowers/specs/2026-03-27-image-metadata-cleaner-design.md`
- Bu plan tek alt sistemdir (`apps/web`); ayri plana bolmeyi gerektiren bagimsiz backend/API parcasi yoktur.
- Uygulama davranisi parser-first lossless modelde kalacak; decode + re-encode fallback kesinlikle eklenmeyecek.
- HEIC/AVIF tarafinda "guvenli sekilde ayiklanabilen" dosyalarda basari, riskli yapilarda kontrollu hata modeli korunacak.

## File Structure

### Routing + settings entry
- Modify: `apps/web/src/app/router.tsx` - `/settings/image-metadata-cleaner` route kaydi
- Modify: `apps/web/src/features/settings/routes/SettingsPage.tsx` - araca gecis karti/linki
- Modify: `apps/web/src/features/settings/components/SettingsForm.tsx` - footer slotu ile arac karti yerlesimi
- Create: `apps/web/src/features/mediaMetadataCleaner/routes/ImageMetadataCleanerPage.tsx` - sayfa basligi + workspace mount
- Create: `apps/web/src/features/mediaMetadataCleaner/routes/ImageMetadataCleanerPage.test.tsx` - settings->tool gecis smoke/regression testleri

### File intake and shared format/path utilities
- Create: `apps/web/src/features/mediaMetadataCleaner/lib/pathUtils.ts` - goreli yol normalize + deterministic zip path
- Create: `apps/web/src/features/mediaMetadataCleaner/lib/pathUtils.test.ts` - normalize/cakisma testleri
- Create: `apps/web/src/features/mediaMetadataCleaner/lib/supportedImageFormats.ts` - uzanti/format sınıflandirma
- Create: `apps/web/src/features/mediaMetadataCleaner/lib/fileCollection.ts` - drag-drop ve folder/input file manifest toplama
- Create: `apps/web/src/features/mediaMetadataCleaner/lib/fileCollection.test.ts` - webkit entry recursion ve input fallback testleri

### Binary metadata cleaning core + worker bridge
- Create: `apps/web/src/features/mediaMetadataCleaner/lib/metadataCleaner.ts` - JPEG/PNG/WebP/HEIC/AVIF parser-first metadata temizleme
- Create: `apps/web/src/features/mediaMetadataCleaner/lib/metadataCleaner.test.ts` - format bazli fixture-benzeri binary unit testler
- Create: `apps/web/src/features/mediaMetadataCleaner/workers/metadataCleaner.worker.ts` - worker request/response adaptor

### Queue orchestration + ZIP packaging
- Create: `apps/web/src/features/mediaMetadataCleaner/hooks/useImageMetadataCleaner.ts` - worker pool, durum gecisleri, iptal, zip indirme
- Create: `apps/web/src/features/mediaMetadataCleaner/lib/zipBuilder.ts` - basarili + `hatali/` ZIP paketleme + rapor
- Create: `apps/web/src/features/mediaMetadataCleaner/lib/zipBuilder.test.ts` - zip girisleri, rapor ve deterministic isim testleri

### UI workspace + flow regression
- Create: `apps/web/src/features/mediaMetadataCleaner/components/ImageMetadataCleanerWorkspace.tsx` - bilgilendirme, dropzone, tablo, aksiyonlar, ozet kartlari
- Create: `apps/web/src/features/mediaMetadataCleaner/components/ImageMetadataCleanerWorkspace.test.tsx` - buton durumlari/ozet metinleri
- Create: `apps/web/src/features/mediaMetadataCleaner/routes/ImageMetadataCleanerFlow.test.tsx` - 50+ dosya, kismi basari/hata, ZIP akisi entegrasyon testi
- Create: `docs/superpowers/runbooks/2026-03-27-image-metadata-cleaner-qa.md` - manuel QA checklist

### Task 1: Route and Settings entry-point

**Files:**
- Modify: `apps/web/src/app/router.tsx`
- Modify: `apps/web/src/features/settings/routes/SettingsPage.tsx`
- Modify: `apps/web/src/features/settings/components/SettingsForm.tsx`
- Create: `apps/web/src/features/mediaMetadataCleaner/routes/ImageMetadataCleanerPage.tsx`
- Create: `apps/web/src/features/mediaMetadataCleaner/routes/ImageMetadataCleanerPage.test.tsx`

- [ ] **Step 1: Settings karti ve route smoke testi icin failing testleri yaz**

```tsx
it("settings kartindan araca gecer", async () => {
  renderWithProviders(<TestRouter />, { route: "/settings" });

  await user.click(await screen.findByRole("link", { name: /araci ac/i }));

  expect(await screen.findByRole("heading", { name: /gorsel metadata temizleme/i })).toBeInTheDocument();
  expect(screen.getByText(/tarayici icinde, cihazda calisir/i)).toBeInTheDocument();
});

it("router image cleaner route'unu dogrudan acar", () => {
  renderWithProviders(<AppRouter />, { route: "/settings/image-metadata-cleaner" });
  expect(screen.getByRole("heading", { name: /gorsel metadata temizleme/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Testleri calistir ve kirmiziya dusur**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/mediaMetadataCleaner/routes/ImageMetadataCleanerPage.test.tsx`
Expected: FAIL because route, settings karti veya yeni page dosyasi henuz yok.

- [ ] **Step 3: Route + settings entry + page shell implement et**

```tsx
// apps/web/src/app/router.tsx
<Route path="/settings" element={<SettingsPage />} />
<Route path="/settings/image-metadata-cleaner" element={<ImageMetadataCleanerPage />} />
```

```tsx
// apps/web/src/features/settings/routes/SettingsPage.tsx (SettingsForm footer)
<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
  <p className="text-sm font-semibold text-slate-900">Gorsel metadata temizleme</p>
  <p className="mt-1 text-sm text-slate-600">Dosyalari tarayicida isle, klasor yapisini koru ve tek ZIP indir.</p>
  <Link to="/settings/image-metadata-cleaner" className="mt-3 inline-flex rounded-xl bg-[#F1641E] px-4 py-2 text-sm font-semibold text-white">
    Araci ac
  </Link>
</div>
```

```tsx
// apps/web/src/features/mediaMetadataCleaner/routes/ImageMetadataCleanerPage.tsx
export function ImageMetadataCleanerPage() {
  const cleaner = useImageMetadataCleaner();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Ayarlar / Araclar</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Gorsel metadata temizleme</h1>
        </div>
        <Link to="/settings" className="text-sm font-medium text-[#F1641E] hover:underline">Ayarlara don</Link>
      </div>

      <ImageMetadataCleanerWorkspace cleaner={cleaner} />
    </div>
  );
}
```

- [ ] **Step 4: Route ve settings testlerini tekrar calistir**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/mediaMetadataCleaner/routes/ImageMetadataCleanerPage.test.tsx`
Expected: PASS with settings kartindan gecis ve dogrudan route acilisi.

- [ ] **Step 5: Bu task commit'ini at**

```bash
git add apps/web/src/app/router.tsx apps/web/src/features/settings/routes/SettingsPage.tsx apps/web/src/features/settings/components/SettingsForm.tsx apps/web/src/features/mediaMetadataCleaner/routes/ImageMetadataCleanerPage.tsx apps/web/src/features/mediaMetadataCleaner/routes/ImageMetadataCleanerPage.test.tsx
git commit -m "feat: add image metadata cleaner route entry"
```

### Task 2: File intake, path safety, and format classification

**Files:**
- Create: `apps/web/src/features/mediaMetadataCleaner/lib/pathUtils.ts`
- Create: `apps/web/src/features/mediaMetadataCleaner/lib/pathUtils.test.ts`
- Create: `apps/web/src/features/mediaMetadataCleaner/lib/supportedImageFormats.ts`
- Create: `apps/web/src/features/mediaMetadataCleaner/lib/fileCollection.ts`
- Create: `apps/web/src/features/mediaMetadataCleaner/lib/fileCollection.test.ts`

- [ ] **Step 1: Path normalize + folder drop recursion icin failing unit testleri yaz**

```ts
expect(normalizeRelativePath("  /album//sub/../cover\\photo.jpg  ")).toBe("album/cover/photo.jpg");
expect(resolveDeterministicZipPath("hatali/photo.jpg", usedPaths)).toBe("hatali/photo.jpg");
expect(resolveDeterministicZipPath("hatali/photo.jpg", usedPaths)).toBe("hatali/photo (2).jpg");
```

```ts
const files = await collectFilesFromDropItems([{ webkitGetAsEntry: () => directory } as never]);
expect(files.map((item) => item.relativePath)).toEqual([
  "kitaplik/arsiv/2026/nested.webp",
  "kitaplik/root.jpg",
]);
expect(files.map((item) => item.extension)).toEqual(["webp", "jpg"]);
```

- [ ] **Step 2: Unit testleri calistir ve fail durumunu gor**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/mediaMetadataCleaner/lib/pathUtils.test.ts src/features/mediaMetadataCleaner/lib/fileCollection.test.ts`
Expected: FAIL because utility ve collection dosyalari henuz yok.

- [ ] **Step 3: Utility ve collection kodunu yaz**

```ts
// pathUtils.ts
export function normalizeRelativePath(input: string): string {
  const trimmed = input.replace(/\0/g, "").trim();
  if (!trimmed) return "";

  const normalized = trimmed.replaceAll("\\", "/").replace(/^\/+/, "");
  const segments = normalized.split("/");
  const result: string[] = [];

  for (const segment of segments) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      if (result.length > 0) result.pop();
      continue;
    }
    result.push(segment);
  }

  return result.join("/");
}
```

```ts
// supportedImageFormats.ts
export const SUPPORTED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "avif"] as const;
export type SupportedImageFormat = "jpeg" | "png" | "webp" | "heic" | "avif";

export function getSupportedImageFormatFromFileName(fileName: string): SupportedImageFormat | null {
  const ext = getImageExtensionFromFileName(fileName);
  if (ext === "jpg" || ext === "jpeg") return "jpeg";
  if (ext === "png") return "png";
  if (ext === "webp") return "webp";
  if (ext === "heic") return "heic";
  if (ext === "avif") return "avif";
  return null;
}
```

```ts
// fileCollection.ts
export async function collectFilesFromDropItems(items: ArrayLike<DropDataTransferItemLike>): Promise<CollectedMediaFile[]> {
  const collected: CollectedMediaFile[] = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const entry = item.webkitGetAsEntry?.() ?? null;

    if (entry) {
      await collectFromEntry(entry, collected);
      continue;
    }

    const file = item.getAsFile?.() ?? null;
    if (!file) continue;

    const relativePath = normalizeRelativePath(file.name) || file.name || `dosya-${index + 1}`;
    collected.push({
      file,
      relativePath,
      source: "drop",
      extension: getExtensionFromPath(relativePath),
    });
  }

  return collected.sort(compareCollectedMediaFiles);
}
```

- [ ] **Step 4: Utility test setini yeniden calistir**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/mediaMetadataCleaner/lib/pathUtils.test.ts src/features/mediaMetadataCleaner/lib/fileCollection.test.ts`
Expected: PASS with normalized relative path ve klasor agaci korunumu.

- [ ] **Step 5: Bu task commit'ini at**

```bash
git add apps/web/src/features/mediaMetadataCleaner/lib/pathUtils.ts apps/web/src/features/mediaMetadataCleaner/lib/pathUtils.test.ts apps/web/src/features/mediaMetadataCleaner/lib/supportedImageFormats.ts apps/web/src/features/mediaMetadataCleaner/lib/fileCollection.ts apps/web/src/features/mediaMetadataCleaner/lib/fileCollection.test.ts
git commit -m "feat: add media file intake and path utilities"
```

### Task 3: Parser-first metadata cleaning engine and worker bridge

**Files:**
- Create: `apps/web/src/features/mediaMetadataCleaner/lib/metadataCleaner.ts`
- Create: `apps/web/src/features/mediaMetadataCleaner/lib/metadataCleaner.test.ts`
- Create: `apps/web/src/features/mediaMetadataCleaner/workers/metadataCleaner.worker.ts`

- [ ] **Step 1: JPEG/PNG/WebP + kontrollu HEIC/AVIF senaryolari icin failing testleri yaz**

```ts
const jpegResult = cleanImageMetadata({ fileName: "foto.jpg", bytes: jpegWithExifAndComment });
expect(jpegResult).toMatchObject({ status: "success", format: "jpeg", changed: true });
expect(jpegResult.status === "success" ? jpegResult.removedMetadataBlocks : []).toEqual(
  expect.arrayContaining(["APP1", "APP2", "APP13", "COM"]),
);

const heicResult = cleanImageMetadata({ fileName: "ornek.heic", bytes: heicSampleWithUnsafeMeta });
expect(heicResult).toMatchObject({ status: "error", code: "UNSAFE_FORMAT", format: "heic" });
```

```ts
const workerResult = handleMetadataCleanerWorkerRequest({
  id: "job-1",
  fileName: "bos.jpg",
  bytes: jpegBytes.buffer.slice(jpegBytes.byteOffset, jpegBytes.byteOffset + jpegBytes.byteLength),
});
expect(workerResult.id).toBe("job-1");
expect(workerResult.status).toBe("success");
```

- [ ] **Step 2: Binary cleaner testlerini calistir ve fail gor**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/mediaMetadataCleaner/lib/metadataCleaner.test.ts`
Expected: FAIL because cleaner ve worker kodu henuz tanimli degil.

- [ ] **Step 3: Format parserlarini ve worker adaptorunu implement et**

```ts
// metadataCleaner.ts
export function cleanImageMetadata(input: MetadataCleanerInput): MetadataCleanerResult {
  const format = getSupportedImageFormatFromFileName(input.fileName);

  if (!format) {
    return createErrorResult("UNSUPPORTED_FORMAT", "Bu dosya uzantisi desteklenmiyor.", null);
  }

  if (input.bytes.length === 0) {
    return createErrorResult("INVALID_IMAGE_DATA", "Dosya icerigi bos.", format);
  }

  switch (format) {
    case "jpeg":
      return cleanJpegMetadata(input.bytes);
    case "png":
      return cleanPngMetadata(input.bytes);
    case "webp":
      return cleanWebPMetadata(input.bytes);
    case "heic":
    case "avif":
      return createErrorResult(
        "UNSAFE_FORMAT",
        "HEIC/AVIF icin kayipsiz ve guvenli metadata temizligi yalnizca guvenli parse durumlarinda desteklenir.",
        format,
      );
    default:
      return createErrorResult("UNSAFE_FORMAT", "Bu format icin guvenli temizleme stratejisi tanimli degil.", format);
  }
}
```

```ts
// workers/metadataCleaner.worker.ts
export function handleMetadataCleanerWorkerRequest(request: MetadataCleanerWorkerRequest): MetadataCleanerWorkerResponse {
  const result = cleanImageMetadata({
    fileName: request.fileName,
    bytes: new Uint8Array(request.bytes),
  });

  if (result.status === "success") {
    return {
      id: request.id,
      status: "success",
      fileName: request.fileName,
      format: result.format,
      cleanedBytes: new Uint8Array(result.cleanedBytes).buffer,
      removedMetadataBlocks: result.removedMetadataBlocks,
      changed: result.changed,
    };
  }

  return {
    id: request.id,
    status: "error",
    fileName: request.fileName,
    format: result.format,
    code: result.code,
    message: result.message,
  };
}
```

- [ ] **Step 4: Cleaner + worker testlerini tekrar calistir**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/mediaMetadataCleaner/lib/metadataCleaner.test.ts`
Expected: PASS with segment/chunk temizligi ve worker response dogrulamasi.

- [ ] **Step 5: Bu task commit'ini at**

```bash
git add apps/web/src/features/mediaMetadataCleaner/lib/metadataCleaner.ts apps/web/src/features/mediaMetadataCleaner/lib/metadataCleaner.test.ts apps/web/src/features/mediaMetadataCleaner/workers/metadataCleaner.worker.ts
git commit -m "feat: add parser-first metadata cleaner worker"
```

### Task 4: Worker pool orchestration and ZIP packaging pipeline

**Files:**
- Create: `apps/web/src/features/mediaMetadataCleaner/hooks/useImageMetadataCleaner.ts`
- Create: `apps/web/src/features/mediaMetadataCleaner/lib/zipBuilder.ts`
- Create: `apps/web/src/features/mediaMetadataCleaner/lib/zipBuilder.test.ts`
- Create: `apps/web/src/features/mediaMetadataCleaner/hooks/useImageMetadataCleaner.test.tsx`

- [ ] **Step 1: Kuyruk durum gecisleri, iptal ve `hatali/` ZIP davranisi icin failing testleri yaz**

```ts
expect(result.current.summary.totalCount).toBe(4);
expect(result.current.summary.queuedCount).toBe(2);

await act(async () => {
  await result.current.startCleaning();
});

expect(result.current.summary.successCount).toBe(1);
expect(result.current.summary.errorCount + result.current.summary.unsupportedCount).toBe(3);
expect(result.current.canDownloadZip).toBe(true);
```

```ts
const zipResult = await buildMediaMetadataZip([
  { sourcePath: "gallery/photo.jpg", status: "success", blob: new Blob(["ok"]) },
  {
    sourcePath: "gallery/photo.jpg",
    status: "error",
    blob: new Blob(["orig"]),
    errorCode: "PARSE_FAILED",
    errorMessage: "Cozumlenemedi",
  },
]);

expect(entryNames).toEqual(expect.arrayContaining([
  "gallery/photo.jpg",
  "hatali/gallery/photo.jpg",
  "islem-raporu.json",
]));
```

- [ ] **Step 2: Hook + ZIP testlerini calistir ve fail gor**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/mediaMetadataCleaner/hooks/useImageMetadataCleaner.test.tsx src/features/mediaMetadataCleaner/lib/zipBuilder.test.ts`
Expected: FAIL because queue orchestration ve zip builder pipeline henuz yok.

- [ ] **Step 3: Hook worker havuzu + ZIP builder implement et**

```ts
// useImageMetadataCleaner.ts (ozet)
const workerTarget = Math.max(1, Math.min(4, globalThis.navigator?.hardwareConcurrency ?? 4));
const workerCount = Math.min(workerTarget, Math.max(queuedIds.length, 1));

const workers = Array.from({ length: workerCount }, () => createMetadataWorker());
await Promise.all(workers.map(async (worker) => {
  while (!cancelRequestedRef.current) {
    const id = queuedIds[queueIndex];
    queueIndex += 1;
    if (!id) return;
    // queued -> processing -> success/error gecisleri
  }
}));
```

```ts
// zipBuilder.ts
for (const item of items) {
  const sourcePath = normalizeRelativePath(item.sourcePath) || `dosya-${index + 1}`;
  const targetBasePath = item.status === "success" ? sourcePath : `hatali/${sourcePath}`;
  const zipPath = resolveDeterministicZipPath(targetBasePath, usedPaths);
  // blob -> bytes, rapor kaydi, zip.file(...)
}

zip.file("islem-raporu.json", `${JSON.stringify(report, null, 2)}\n`, { compression: "STORE" });
```

- [ ] **Step 4: Hook/ZIP testlerini ve typecheck'i tekrar calistir**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/mediaMetadataCleaner/hooks/useImageMetadataCleaner.test.tsx src/features/mediaMetadataCleaner/lib/zipBuilder.test.ts && pnpm --filter @trendyol-etsy/web typecheck`
Expected: PASS with worker pool, partial success ZIP, deterministic naming.

- [ ] **Step 5: Bu task commit'ini at**

```bash
git add apps/web/src/features/mediaMetadataCleaner/hooks/useImageMetadataCleaner.ts apps/web/src/features/mediaMetadataCleaner/hooks/useImageMetadataCleaner.test.tsx apps/web/src/features/mediaMetadataCleaner/lib/zipBuilder.ts apps/web/src/features/mediaMetadataCleaner/lib/zipBuilder.test.ts
git commit -m "feat: add cleaner queue orchestration and zip packaging"
```

### Task 5: Workspace UI, controls, and status summary rendering

**Files:**
- Create: `apps/web/src/features/mediaMetadataCleaner/components/ImageMetadataCleanerWorkspace.tsx`
- Create: `apps/web/src/features/mediaMetadataCleaner/components/ImageMetadataCleanerWorkspace.test.tsx`
- Modify: `apps/web/src/features/mediaMetadataCleaner/routes/ImageMetadataCleanerPage.tsx`
- Modify: `apps/web/src/features/mediaMetadataCleaner/routes/ImageMetadataCleanerPage.test.tsx`

- [ ] **Step 1: Workspace icin failing UI testlerini yaz**

```tsx
render(<ImageMetadataCleanerWorkspace cleaner={cleanerStub} />);

expect(screen.getByText(/tarayici icinde, cihazda calisir/i)).toBeInTheDocument();
expect(screen.getByRole("button", { name: /temizlemeyi baslat/i })).toBeDisabled();
expect(screen.getByRole("button", { name: /zip indir/i })).toBeDisabled();
expect(screen.getByText(/toplu kullanim/i)).toBeInTheDocument();
expect(screen.getByText(/icc profili silindigi icin/i)).toBeInTheDocument();
```

```tsx
expect(screen.getByText(/toplam/i)).toBeInTheDocument();
expect(screen.getByText(/basarili/i)).toBeInTheDocument();
expect(screen.getByText(/hatali/i)).toBeInTheDocument();
expect(screen.getByText(/siradaki/i)).toBeInTheDocument();
```

- [ ] **Step 2: Workspace testlerini calistir ve fail gor**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/mediaMetadataCleaner/components/ImageMetadataCleanerWorkspace.test.tsx src/features/mediaMetadataCleaner/routes/ImageMetadataCleanerPage.test.tsx`
Expected: FAIL because workspace componentu ve yeni UI bloklari henuz yok.

- [ ] **Step 3: Workspace arayuzunu spec'e gore implement et**

```tsx
// ImageMetadataCleanerWorkspace.tsx (aksiyon cubugu)
<button type="button" onClick={() => void cleaner.startCleaning()} disabled={!cleaner.canStart}>Temizlemeyi Baslat</button>
<button type="button" onClick={cleaner.cancelCleaning} disabled={!cleaner.canCancel}>Iptal Et</button>
<button type="button" onClick={cleaner.downloadZip} disabled={!cleaner.canDownloadZip}>ZIP Indir</button>
<button type="button" onClick={cleaner.clearItems} disabled={cleaner.isProcessing || cleaner.items.length === 0}>Listeyi Temizle</button>
```

```tsx
// ImageMetadataCleanerWorkspace.tsx (durum tablosu)
<tbody>
  {cleaner.items.map((item) => (
    <tr key={item.id}>
      <td>{item.name}</td>
      <td>{item.relativePath}</td>
      <td>{formatFileSize(item.size)}</td>
      <td>{statusLabel(item.status)}</td>
      <td>{item.errorMessage ?? "-"}</td>
    </tr>
  ))}
</tbody>
```

```tsx
// ImageMetadataCleanerWorkspace.tsx (ozet kartlari)
<p className="text-xs uppercase tracking-[0.28em] text-slate-400">Toplam</p>
<p className="mt-2 text-3xl font-semibold text-slate-900">{cleaner.summary.totalCount}</p>
```

- [ ] **Step 4: Workspace + page regression testlerini tekrar calistir**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/mediaMetadataCleaner/components/ImageMetadataCleanerWorkspace.test.tsx src/features/mediaMetadataCleaner/routes/ImageMetadataCleanerPage.test.tsx`
Expected: PASS with bilgilendirme, queue tablosu, buton state'leri ve ozet kartlari.

- [ ] **Step 5: Bu task commit'ini at**

```bash
git add apps/web/src/features/mediaMetadataCleaner/components/ImageMetadataCleanerWorkspace.tsx apps/web/src/features/mediaMetadataCleaner/components/ImageMetadataCleanerWorkspace.test.tsx apps/web/src/features/mediaMetadataCleaner/routes/ImageMetadataCleanerPage.tsx apps/web/src/features/mediaMetadataCleaner/routes/ImageMetadataCleanerPage.test.tsx
git commit -m "feat: add image metadata cleaner workspace ui"
```

### Task 6: Mixed-batch integration, 50+ file coverage, and QA runbook

**Files:**
- Create: `apps/web/src/features/mediaMetadataCleaner/routes/ImageMetadataCleanerFlow.test.tsx`
- Create: `docs/superpowers/runbooks/2026-03-27-image-metadata-cleaner-qa.md`
- Modify: `apps/web/src/features/mediaMetadataCleaner/hooks/useImageMetadataCleaner.ts` (gerekirse performans/iptal iyilestirmeleri)

- [ ] **Step 1: 50+ dosya kismi basari senaryosu icin failing entegrasyon testi yaz**

```tsx
it("60 dosyalik karisik batch'i UI donmadan isler ve tek ZIP uretir", async () => {
  renderWithProviders(<ImageMetadataCleanerPage />, { route: "/settings/image-metadata-cleaner", path: "/settings/image-metadata-cleaner" });

  await uploadFixtureBatch(60); // 46 success, 14 error/unsupported
  await user.click(screen.getByRole("button", { name: /temizlemeyi baslat/i }));

  expect(await screen.findByText(/60/)).toBeInTheDocument();
  expect(await screen.findByText(/46/)).toBeInTheDocument();
  expect(await screen.findByText(/14/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /zip indir/i })).toBeEnabled();
});
```

- [ ] **Step 2: Entegrasyon testini calistir ve fail gor**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/mediaMetadataCleaner/routes/ImageMetadataCleanerFlow.test.tsx`
Expected: FAIL because yuksek hacimli flow test altyapisi henuz ekli degil veya queue durumlari beklenen sekilde raporlanmiyor.

- [ ] **Step 3: Testi yesile cekmek icin gerekli performans/flow duzeltmelerini uygula ve QA runbook yaz**

```ts
// useImageMetadataCleaner.ts (iptal ve queue finalize)
if (cancelRequestedRef.current) {
  finalItems = finalItems.map((item) => {
    if (item.status === "queued" || item.status === "processing") {
      return {
        ...item,
        status: "cancelled",
        errorCode: "CANCELLED",
        errorMessage: "Islem kullanici tarafindan iptal edildi.",
      };
    }
    return item;
  });
}
```

```md
# Image metadata cleaner QA checklist

1. `/settings` ekraninda "Gorsel metadata temizleme" karti gorunuyor.
2. `/settings/image-metadata-cleaner` sayfasi aciliyor.
3. Klasor drop ile alt klasor yolu korunuyor.
4. Karisik batch'te basarili dosyalar kok klasorde, basarisizlar `hatali/` altinda.
5. `islem-raporu.json` ZIP icinde uretiliyor.
6. Iptal edilen kuyruk girdileri `cancelled` olarak isaretleniyor.
7. 50-60 dosyada UI etkileşimi (scroll, buton tiklama) donmadan devam ediyor.
```

- [ ] **Step 4: Final regresyon matrisini calistir**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/mediaMetadataCleaner/** && pnpm --filter @trendyol-etsy/web typecheck && pnpm --filter @trendyol-etsy/web build`
Expected: PASS with route, parser, worker, queue, zip, UI ve 50+ dosya senaryolari.

- [ ] **Step 5: Son task commit'ini at**

```bash
git add apps/web/src/features/mediaMetadataCleaner/routes/ImageMetadataCleanerFlow.test.tsx apps/web/src/features/mediaMetadataCleaner/hooks/useImageMetadataCleaner.ts docs/superpowers/runbooks/2026-03-27-image-metadata-cleaner-qa.md
git commit -m "test: add high-volume cleaner flow coverage"
```

## Self-Review

- **Spec coverage check:**
  - Route + Ayarlar entry (Spec 5.1, 13, 14) -> Task 1
  - Dosya/klasor toplama + relative path koruma (Spec 6.1, 8, 14) -> Task 2
  - Parser-first format temizleme (Spec 4A, 7.x, 14) -> Task 3
  - Worker pool, kismi basari, iptal, tek ZIP (Spec 6.2, 6.3, 8, 9, 10, 14) -> Task 4
  - UI bolumleri + aksiyon cubugu + ozet (Spec 5.3, 5.4, 9, 14) -> Task 5
  - 50-60 dosya ve entegrasyon/QA (Spec 10, 11, 14) -> Task 6
- **Placeholder scan:** "TBD/TODO/sonra" gibi bos adim yok; her taskte test komutu, kod ornegi ve commit var.
- **Type consistency:** `CleanerStatus`, worker response ve zip status adlari tum tasklerde ayni tutuldu (`queued|processing|success|error|unsupported|cancelled`).

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-03-27-image-metadata-cleaner.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
