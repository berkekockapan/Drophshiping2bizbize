import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useParams } from "react-router-dom";

import { AIConnectionsPage } from "../features/connections/routes/AIConnectionsPage";
import { SeoEditorPage } from "../features/drafts/routes/SeoEditorPage";
import { EtsyShopDetailPage } from "../features/etsyShops/routes/EtsyShopDetailPage";
import { EtsyShopsPage } from "../features/etsyShops/routes/EtsyShopsPage";
import { ImageMetadataCleanerPage } from "../features/mediaMetadataCleaner/routes/ImageMetadataCleanerPage";
import { NotificationsPage } from "../features/notifications/routes/NotificationsPage";
import { ProductDetailPage } from "../features/product/routes/ProductDetailPage";
import { SourceProductDetailPage } from "../features/sourceProducts/routes/SourceProductDetailPage";
import { SourceProductTrashPage } from "../features/sourceProducts/routes/SourceProductTrashPage";
import { SourceProductsPage } from "../features/sourceProducts/routes/SourceProductsPage";
import { EtsyCostCalculatorPage } from "../features/etsyCostCalculator/routes/EtsyCostCalculatorPage";
import { SettingsPage } from "../features/settings/routes/SettingsPage";
import { getDefaultOwnerPath, isOwnerKey } from "../features/shared/lib/ownerRouteState";
import { TrackingCenterPage } from "../features/tracking/routes/TrackingCenterPage";
import { TrashPage } from "../features/tracking/routes/TrashPage";
import { createQueryClient } from "./queryClient";
import { AppShell } from "./shell/AppShell";

const queryClient = createQueryClient();

function OwnerRouteGuard() {
  const { ownerKey } = useParams<{ ownerKey: string }>();

  if (!isOwnerKey(ownerKey)) {
    return <Navigate to={getDefaultOwnerPath()} replace />;
  }

  return <Outlet />;
}

export function AppRouter() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Navigate to={getDefaultOwnerPath()} replace />} />
            <Route path="/owners/:ownerKey/*" element={<OwnerRouteGuard />}>
              <Route path="products" element={<TrackingCenterPage />} />
              <Route path="products/:productId" element={<ProductDetailPage />} />
              <Route path="products/:productId/seo" element={<SeoEditorPage />} />
              <Route path="source-products" element={<SourceProductsPage />} />
              <Route path="source-products/trash" element={<SourceProductTrashPage />} />
              <Route path="source-products/:sourceProductId" element={<SourceProductDetailPage />} />
              <Route path="etsy-shops" element={<EtsyShopsPage />} />
              <Route path="etsy-shops/:shopId" element={<EtsyShopDetailPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="trash" element={<TrashPage />} />
            </Route>
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
