import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AIConnectionsPage } from "../features/connections/routes/AIConnectionsPage";
import { SeoEditorPage } from "../features/drafts/routes/SeoEditorPage";
import { NotificationsPage } from "../features/notifications/routes/NotificationsPage";
import { ProductDetailPage } from "../features/product/routes/ProductDetailPage";
import { SettingsPage } from "../features/settings/routes/SettingsPage";
import { TrackingCenterPage } from "../features/tracking/routes/TrackingCenterPage";
import { createQueryClient } from "./queryClient";
import { AppShell } from "./shell/AppShell";

const queryClient = createQueryClient();

export function AppRouter() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<TrackingCenterPage />} />
            <Route path="/owners/:owner/products" element={<TrackingCenterPage />} />
            <Route path="/products/:productId" element={<ProductDetailPage />} />
            <Route path="/products/:productId/seo" element={<SeoEditorPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/connections" element={<AIConnectionsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
