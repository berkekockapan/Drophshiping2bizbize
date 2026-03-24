import type { CliProxyAuthFile } from "../lib/cliProxyApi";

interface ConnectorStatusCardProps {
  targetLabel: string;
  targetBaseUrl: string | null;
  authFiles: CliProxyAuthFile[];
  activeFileName: string | null;
  attemptMessage: string | null;
  isStartingConnection: boolean;
  activatingFileName: string | null;
  deletingFileName: string | null;
  startDisabled?: boolean;
  onStartConnection: () => void;
  onActivate: (fileName: string) => void;
  onDelete: (fileName: string) => void;
}

export function ConnectorStatusCard({
  targetLabel,
  targetBaseUrl,
  authFiles,
  activeFileName,
  attemptMessage,
  isStartingConnection,
  activatingFileName,
  deletingFileName,
  startDisabled = false,
  onStartConnection,
  onActivate,
  onDelete,
}: ConnectorStatusCardProps) {
  const activeFile = authFiles.find((item) => item.name === activeFileName) ?? null;

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{targetLabel}</p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">AI Bağlantıları</h1>
          <p className="mt-2 text-sm text-slate-600">
            {activeFile ? `${activeFile.label} aktif hesap olarak hazır.` : "Henüz bağlı Codex hesabı yok."}
          </p>
        </div>

        <button
          type="button"
          className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={isStartingConnection || startDisabled}
          onClick={onStartConnection}
        >
          {isStartingConnection ? "Bağlantı Başlatılıyor..." : "OpenAI ile Bağlan"}
        </button>
      </div>

      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
        <p className="text-sm text-slate-600">Hedef: {targetBaseUrl ?? "Henüz yapılandırılmadı"}</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">
          {activeFile ? `${activeFile.label} bağlı` : "Aktif hesap yok"}
        </p>
      </div>

      {attemptMessage ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {attemptMessage}
          <p className="mt-2">Windows oturumunda giriş tamamlayın (ör. RDP).</p>
        </div>
      ) : null}

      {authFiles.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
          Henüz bağlı hesap yok. Yukarıdaki aksiyon ile tarayıcıda giriş başlatın.
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {authFiles.map((file) => {
          const isActive = file.name === activeFileName;

          return (
            <article key={file.name} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{file.label}</p>
                  <p className="text-xs text-slate-500">{file.name}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isActive ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Aktif Hesap
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                      disabled={activatingFileName === file.name}
                      onClick={() => onActivate(file.name)}
                    >
                      {activatingFileName === file.name ? "Aktifleştiriliyor..." : "Aktif Yap"}
                    </button>
                  )}

                  <button
                    type="button"
                    className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:border-rose-100 disabled:text-rose-300"
                    disabled={deletingFileName === file.name}
                    onClick={() => onDelete(file.name)}
                  >
                    {deletingFileName === file.name ? "Kaldırılıyor..." : "Bağlantıyı Kaldır"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
