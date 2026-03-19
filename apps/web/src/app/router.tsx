import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { TrackingCenterPage } from "../features/tracking/routes/TrackingCenterPage";
import { createQueryClient } from "./queryClient";
import { AppShell } from "./shell/AppShell";

const queryClient = createQueryClient();

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500 shadow-sm">
      {title} sayfası sonraki task’ta tamamlanacak.
    </div>
  );
}

export function AppRouter() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<TrackingCenterPage />} />
            <Route path="/notifications" element={<PlaceholderPage title="Bildirimler" />} />
            <Route path="/connections" element={<PlaceholderPage title="AI Bağlantıları" />} />
            <Route path="/settings" element={<PlaceholderPage title="Ayarlar" />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
