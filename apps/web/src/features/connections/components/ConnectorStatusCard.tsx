import type { ConnectorHealthResponse, ConnectorProfile } from "../../../app/api";

interface ConnectorStatusCardProps {
  health: ConnectorHealthResponse | null;
  profiles: ConnectorProfile[];
  activatingProfileId: string | null;
  onActivate: (profileId: string) => void;
}

export function ConnectorStatusCard({
  health,
  profiles,
  activatingProfileId,
  onActivate,
}: ConnectorStatusCardProps) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Local Connector</p>
      <h1 className="mt-3 text-2xl font-semibold text-slate-900">AI Bağlantıları</h1>

      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
        <p className="text-sm text-slate-600">Durum: {health?.status ?? "offline"}</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">
          {health?.activeProfile ? `${health.activeProfile.label} bağlı` : "Aktif profil yok"}
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {profiles.map((profile) => {
          const isActive = health?.activeProfile?.id === profile.id;

          return (
            <article key={profile.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{profile.label}</p>
                  <p className="text-xs text-slate-500">{profile.emailMasked ?? "-"}</p>
                </div>

                {isActive ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Bağlı
                  </span>
                ) : (
                  <button
                    type="button"
                    className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                    disabled={activatingProfileId === profile.id}
                    onClick={() => onActivate(profile.id)}
                  >
                    {activatingProfileId === profile.id ? "Aktifleştiriliyor..." : "Aktif Yap"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}