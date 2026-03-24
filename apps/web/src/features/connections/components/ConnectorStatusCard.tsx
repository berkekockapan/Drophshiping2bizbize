import {
  formatDateTime,
  type ConnectionAttemptResponse,
  type ConnectorHealthResponse,
  type ConnectorProfile,
} from "../../../app/api";

interface ConnectorStatusCardProps {
  health: ConnectorHealthResponse | null;
  profiles: ConnectorProfile[];
  attempt: ConnectionAttemptResponse | null;
  isStartingConnection: boolean;
  activatingProfileId: string | null;
  reconnectingProfileId: string | null;
  deletingProfileId: string | null;
  onStartConnection: () => void;
  onActivate: (profileId: string) => void;
  onReconnect: (profileId: string) => void;
  onDelete: (profileId: string) => void;
}

function getProfileStatusLabel(status: ConnectorProfile["status"]) {
  switch (status) {
    case "connected":
      return "Bağlı";
    case "needs_reauth":
      return "Yeniden bağlanmalı";
    case "disconnected":
      return "Bağlantı kaldırıldı";
    case "error":
      return "Hata";
  }
}

function getAttemptMessage(attempt: ConnectionAttemptResponse | null) {
  if (!attempt) {
    return null;
  }

  switch (attempt.status) {
    case "waiting_for_login":
      return "Tarayıcıda giriş bekleniyor.";
    case "verifying_session":
      return "Oturum doğrulanıyor.";
    case "failed":
      return attempt.error ?? "Bağlantı denemesi başarısız oldu.";
    case "cancelled":
      return "Bağlantı denemesi iptal edildi.";
    default:
      return null;
  }
}

export function ConnectorStatusCard({
  health,
  profiles,
  attempt,
  isStartingConnection,
  activatingProfileId,
  reconnectingProfileId,
  deletingProfileId,
  onStartConnection,
  onActivate,
  onReconnect,
  onDelete,
}: ConnectorStatusCardProps) {
  const activeProfileId = health?.activeProfile?.id ?? null;
  const attemptMessage = getAttemptMessage(attempt);

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Local Connector</p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">AI Bağlantıları</h1>
          <p className="mt-2 text-sm text-slate-600">
            {health?.activeProfile
              ? `${health.activeProfile.label} aktif hesap olarak hazır.`
              : "Henüz bağlı bir ChatGPT hesabı yok."}
          </p>
        </div>

        <button
          type="button"
          className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={isStartingConnection}
          onClick={onStartConnection}
        >
          {isStartingConnection ? "Bağlantı Başlatılıyor..." : "OpenAI ile Bağlan"}
        </button>
      </div>

      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
        <p className="text-sm text-slate-600">Durum: {health?.status ?? "offline"}</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">
          {health?.activeProfile ? `${health.activeProfile.label} bağlı` : "Aktif profil yok"}
        </p>
      </div>

      {attemptMessage ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {attemptMessage}
        </div>
      ) : null}

      {profiles.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
          Henüz bağlı hesap yok. Yukarıdaki aksiyon ile tarayıcıda giriş başlatın.
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {profiles.map((profile) => {
          const isActive = activeProfileId === profile.id;

          return (
            <article key={profile.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{profile.label}</p>
                  <p className="text-xs text-slate-500">{profile.emailMasked ?? "-"}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Son doğrulama: {formatDateTime(profile.lastValidatedAt)}
                  </p>
                  {profile.lastError ? <p className="mt-2 text-xs text-rose-600">{profile.lastError}</p> : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {getProfileStatusLabel(profile.status)}
                  </span>
                  {isActive ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Aktif Hesap
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                      disabled={activatingProfileId === profile.id}
                      onClick={() => onActivate(profile.id)}
                    >
                      {activatingProfileId === profile.id ? "Aktifleştiriliyor..." : "Aktif Yap"}
                    </button>
                  )}

                  {isActive ? (
                    <>
                      <button
                        type="button"
                        className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                        disabled={reconnectingProfileId === profile.id}
                        onClick={() => onReconnect(profile.id)}
                      >
                        {reconnectingProfileId === profile.id ? "Yeniden Bağlanılıyor..." : "Yeniden Bağlan"}
                      </button>
                      <button
                        type="button"
                        className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:border-rose-100 disabled:text-rose-300"
                        disabled={deletingProfileId === profile.id}
                        onClick={() => onDelete(profile.id)}
                      >
                        {deletingProfileId === profile.id ? "Kaldırılıyor..." : "Bağlantıyı Kaldır"}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
