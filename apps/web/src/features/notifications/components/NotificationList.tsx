import type { NotificationItem } from "../../../app/api";

interface NotificationListProps {
  items: NotificationItem[];
}

const severityMeta = {
  warning: {
    title: "Uyarılar",
    itemClass: "border-amber-200 bg-amber-50",
    badgeClass: "bg-amber-100 text-amber-700",
  },
  info: {
    title: "Bilgilendirmeler",
    itemClass: "border-sky-200 bg-sky-50",
    badgeClass: "bg-sky-100 text-sky-700",
  },
} as const;

export function NotificationList({ items }: NotificationListProps) {
  const groups = {
    warning: items.filter((item) => item.severity === "warning"),
    info: items.filter((item) => item.severity !== "warning"),
  };

  return (
    <div className="space-y-6">
      {(Object.keys(groups) as Array<keyof typeof groups>).map((severity) => {
        const groupItems = groups[severity];
        const meta = severityMeta[severity];

        if (groupItems.length === 0) {
          return null;
        }

        return (
          <section key={severity} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">{meta.title}</h2>
            <div className="mt-5 space-y-3">
              {groupItems.map((item) => (
                <article key={item.id} className={`rounded-2xl border p-4 ${meta.itemClass}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${meta.badgeClass}`}>
                      {item.type}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{item.body}</p>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
