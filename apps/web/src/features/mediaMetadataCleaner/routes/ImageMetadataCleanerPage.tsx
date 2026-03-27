import { Link } from "react-router-dom";

import { ImageMetadataCleanerWorkspace } from "../components/ImageMetadataCleanerWorkspace";
import { useImageMetadataCleaner } from "../hooks/useImageMetadataCleaner";

export function ImageMetadataCleanerPage() {
  const cleaner = useImageMetadataCleaner();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Ayarlar / Araclar</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Gorsel metadata temizleme</h1>
        </div>

        <Link to="/settings" className="text-sm font-medium text-[#F1641E] hover:underline">
          Ayarlara don
        </Link>
      </div>

      <ImageMetadataCleanerWorkspace cleaner={cleaner} />
    </div>
  );
}
