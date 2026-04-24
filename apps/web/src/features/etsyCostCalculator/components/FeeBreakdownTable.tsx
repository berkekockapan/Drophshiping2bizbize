import { useId, useState, type ReactNode } from "react";

import type { BreakdownGroup } from "../lib/types";
import { HelpTooltip } from "./HelpTooltip";

type LegacyRow = {
  key: string;
  label: string;
  formattedUsd: string;
  formattedTry: string;
  badgeLabel: string;
  note?: string;
};

const HELP_COPY: Record<string, string> = {
  total_collected: "Musteriden toplanan toplam tutar.",
  product_revenue: "Urun satisindan gelen gelir.",
  us_duty_fee: "Girilen veya analizden gelen orana gore hesaplanan tahmini ABD ithalat vergisi.",
  summary_net_profit: "Tum giderlerden sonra elinde kalan net kazanc.",
  overhead_cost: "Siparis basina dagitilan genel gider payi.",
};

interface CollapsibleBreakdownCardProps {
  children: ReactNode;
  summary: string;
}

function CollapsibleBreakdownCard({ children, summary }: CollapsibleBreakdownCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const detailsId = useId();

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Ucret dokumu</p>
          <p className="mt-1 text-sm text-slate-500">{summary}</p>
        </div>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={detailsId}
          onClick={() => setIsOpen((value) => !value)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#F1641E] hover:text-[#F1641E]"
        >
          {isOpen ? "Detaylari gizle" : "Detaylari goster"}
          <span aria-hidden="true" className={`text-base transition-transform ${isOpen ? "rotate-180" : ""}`}>
            ↓
          </span>
        </button>
      </div>

      {isOpen ? (
        <div id={detailsId} className="mt-4">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function getGroupedSummary(groups: BreakdownGroup[]) {
  const rowCount = groups.reduce((total, group) => total + group.rows.length, 0);
  return `${groups.length} grup, ${rowCount} kalem. Istersen detaylari acip gelir, ucret ve maliyetleri inceleyebilirsin.`;
}

function renderLegacyTable(rows: LegacyRow[]) {
  return (
    <CollapsibleBreakdownCard summary={`${rows.length} kalem. Istersen detaylari acip tum ucret dokumunu inceleyebilirsin.`}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-700">
          <thead className="text-xs uppercase tracking-[0.2em] text-slate-400">
            <tr>
              <th className="pb-3">Kalem</th>
              <th className="pb-3">USD</th>
              <th className="pb-3">TRY</th>
              <th className="pb-3">Kaynak</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-slate-100 align-top">
                <td className="py-3">
                  <div className="font-medium text-slate-900">{row.label}</div>
                  {row.note ? <div className="mt-1 text-xs text-slate-500">{row.note}</div> : null}
                </td>
                <td className="py-3">{row.formattedUsd}</td>
                <td className="py-3">{row.formattedTry}</td>
                <td className="py-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{row.badgeLabel}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CollapsibleBreakdownCard>
  );
}

function renderGroupedBreakdown(groups: BreakdownGroup[]) {
  return (
    <CollapsibleBreakdownCard summary={getGroupedSummary(groups)}>
      <div className="space-y-4">
        {groups.map((group) => (
          <section key={group.key} className="rounded-2xl border border-slate-100 p-4">
            <h3 className="text-sm font-semibold text-slate-900">{group.label}</h3>
            <div className="mt-3 space-y-3">
              {group.rows.length > 0 ? (
                group.rows.map((row) => {
                  const helpText = HELP_COPY[row.key];

                  return (
                    <div key={row.key} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_120px_120px_auto] md:items-start">
                      <div>
                        <div className="inline-flex items-center gap-2 font-medium text-slate-900">
                          <span>{row.label}</span>
                          {helpText ? <HelpTooltip label={row.label} description={helpText} /> : null}
                        </div>
                        {row.note ? <div className="mt-1 text-xs text-slate-500">{row.note}</div> : null}
                      </div>
                      <div className="text-sm text-slate-700">{row.formattedUsd}</div>
                      <div className="text-sm text-slate-700">{row.formattedTry}</div>
                      <div>
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          {row.badgeLabel}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500">Kalem yok</p>
              )}
            </div>
          </section>
        ))}
      </div>
    </CollapsibleBreakdownCard>
  );
}

export function FeeBreakdownTable(props: { rows: LegacyRow[] } | { groups: BreakdownGroup[] }) {
  return "rows" in props ? renderLegacyTable(props.rows) : renderGroupedBreakdown(props.groups);
}
