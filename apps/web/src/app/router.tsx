import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AIConnectionsPage } from "../features/connections/routes/AIConnectionsPage";
import { SeoEditorPage } from "../features/drafts/routes/SeoEditorPage";
import { ImageMetadataCleanerPage } from "../features/mediaMetadataCleaner/routes/ImageMetadataCleanerPage";
import { NotificationsPage } from "../features/notifications/routes/NotificationsPage";
import { ProductDetailPage } from "../features/product/routes/ProductDetailPage";
import { SourceProductDetailPage } from "../features/sourceProducts/routes/SourceProductDetailPage";
import { SourceProductTrashPage } from "../features/sourceProducts/routes/SourceProductTrashPage";
import { SourceProductsPage } from "../features/sourceProducts/routes/SourceProductsPage";
import { EtsyCostCalculatorPage } from "../features/etsyCostCalculator/routes/EtsyCostCalculatorPage";
import { SettingsPage } from "../features/settings/routes/SettingsPage";
import { getDefaultOwnerPath } from "../features/shared/lib/ownerRouteState";
import { SourceProductDetailPage } from "../features/sourceProducts/routes/SourceProductDetailPage";
import { SourceProductsPage } from "../features/sourceProducts/routes/SourceProductsPage";
import { TrackingCenterPage } from "../features/tracking/routes/TrackingCenterPage";
import { TrashPage } from "../features/tracking/routes/TrashPage";
import { createQueryClient } from "./queryClient";
import { AppShell } from "./shell/AppShell";

const queryClient = createQueryClient();

export function AppRouter() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Navigate to={getDefaultOwnerPath()} replace />} />
            <Route path="/owners/:ownerKey/products" element={<TrackingCenterPage />} />
            <Route path="/owners/:ownerKey/products/:productId" element={<ProductDetailPage />} />
            <Route path="/owners/:ownerKey/products/:productId/seo" element={<SeoEditorPage />} />
            <Route path="/owners/:ownerKey/source-products" element={<SourceProductsPage />} />
            <Route path="/owners/:ownerKey/source-products/:sourceProductId" element={<SourceProductDetailPage />} />
            <Route path="/owners/:ownerKey/notifications" element={<NotificationsPage />} />
            <Route path="/owners/:ownerKey/trash" element={<TrashPage />} />
            <Route path="/owners/:ownerKey/source-products" element={<SourceProductsPage />} />
            <Route path="/owners/:ownerKey/source-products/trash" element={<SourceProductTrashPage />} />
            <Route path="/owners/:ownerKey/source-products/:sourceProductId" element={<SourceProductDetailPage />} />
            <Route path="/etsy-cost-calculator" element={<EtsyCostCalculatorPage />} />
            <Route path="/connections" element={<AIConnectionsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/image-metadata-cleaner" element={<ImageMetadataCleanerPage />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
