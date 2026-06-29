"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/library/utils/formatting";
import { useLibraryOpsStore } from "@/stores";
import {
  BookOpenIcon,
  FileTextIcon,
  HardDriveIcon,
  type LucideIcon,
} from "lucide-react";

interface StatsDashboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SummaryCardData {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: string;
}

const PALETTE = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
  "#14b8a6", "#6366f1",
];

export function StatsDashboard({ open, onOpenChange }: StatsDashboardProps) {
  const t = useTranslations("stats");
  const fetchStats = useLibraryOpsStore((s) => s.fetchStats);
  const stats = useLibraryOpsStore((s) => s.stats);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetchStats()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, fetchStats]);

  const cards: SummaryCardData[] = stats
    ? [
        { label: t("totalDocuments"), value: stats.total_documents.toLocaleString(), icon: BookOpenIcon, accent: "text-blue-500" },
        { label: t("totalPages"), value: stats.total_pages.toLocaleString(), icon: FileTextIcon, accent: "text-emerald-500" },
        { label: t("totalSize"), value: formatFileSize(stats.total_size_bytes), icon: HardDriveIcon, accent: "text-violet-500" },
      ]
    : [];

  const distributions = stats
    ? [
        { title: t("byDoctype"), data: stats.by_doctype, type: "dist" as const },
        { title: t("byFormat"), data: stats.by_format, type: "dist" as const },
        { title: t("byLanguage"), data: stats.by_language, type: "dist" as const },
        { title: t("byYear"), data: stats.by_year, type: "year-bar" as const },
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription className="sr-only">{t("title")}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading && !stats ? (
            <StatsSkeleton />
          ) : !stats ? (
            <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
              {t("noData")}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-3 gap-3">
                {cards.map((card) => (
                  <SummaryCard key={card.label} card={card} />
                ))}
              </div>

              {distributions.map((dist, idx) => {
                const entries = Object.entries(dist.data)
                  .filter(([, c]) => c > 0)
                  .sort((a, b) => b[1] - a[1]);
                if (entries.length === 0) return null;

                return (
                  <DistributionSection
                    key={idx}
                    title={dist.title}
                    entries={entries}
                    type={dist.type}
                    noDataLabel={t("noData")}
                  />
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({ card }: { card: SummaryCardData }) {
  const Icon = card.icon;
  return (
    <div className="bg-card flex flex-col gap-1.5 rounded-lg border p-3">
      <Icon className={cn("size-4 shrink-0", card.accent)} />
      <span className="text-lg font-semibold tabular-nums leading-tight">
        {card.value}
      </span>
      <span className="text-muted-foreground truncate text-[11px] leading-tight">
        {card.label}
      </span>
    </div>
  );
}

function DistributionSection({
  title,
  entries,
  type,
  noDataLabel,
}: {
  title: string;
  entries: [string, number][];
  type: "dist" | "year-bar";
  noDataLabel: string;
}) {
  if (entries.length === 0) {
    return (
      <section className="flex flex-col gap-1.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
        <p className="text-muted-foreground text-xs">{noDataLabel}</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {type === "year-bar" ? (
        <YearBarChart entries={entries} />
      ) : (
        <DistChart entries={entries} />
      )}
    </section>
  );
}

/**
 * Unified distribution chart: donut + colored horizontal bars with legend.
 * Used for doctype, format, and language distributions.
 */
function DistChart({ entries }: { entries: [string, number][] }) {
  const total = entries.reduce((sum, [, c]) => sum + c, 0);
  const shown = entries.slice(0, 10);
  const restCount = entries.slice(10).reduce((s, [, c]) => s + c, 0);
  const items: [string, number][] =
    restCount > 0 ? [...shown, ["other", restCount] as [string, number]] : shown;

  // Donut gradient stops
  let cumulative = 0;
  const stops: string[] = [];
  for (const [i, [, count]] of items.entries()) {
    const start = (cumulative / total) * 360;
    cumulative += count;
    const end = (cumulative / total) * 360;
    const color = PALETTE[i % PALETTE.length];
    stops.push(`${color} ${start}deg ${end}deg`);
  }

  return (
    <div className="flex items-start gap-4">
      {/* Donut */}
      <div
        className="relative size-20 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${stops.join(", ")})` }}
      >
        <div className="absolute inset-[7px] rounded-full bg-card" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold tabular-nums">{total}</span>
        </div>
      </div>

      {/* Colored bars + legend */}
      <ul className="flex flex-1 flex-col gap-1">
        {items.map(([label, count], i) => {
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <li key={`${label}-${i}`} className="flex items-center gap-1.5 text-xs">
              <span className="w-9 shrink-0 text-right tabular-nums text-[10px] text-muted-foreground">
                {pct.toFixed(0)}%
              </span>
              <div className="relative h-4 flex-1 overflow-hidden rounded-sm bg-muted/40">
                <div
                  className="absolute inset-y-0 left-0 rounded-sm"
                  style={{
                    width: `${Math.max(pct, 2)}%`,
                    backgroundColor: PALETTE[i % PALETTE.length],
                  }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-foreground">
                  {label || "—"}
                </span>
              </div>
              <span className="w-7 shrink-0 text-right tabular-nums text-[10px]">
                {count}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Colorful vertical bar chart for year distribution.
 * Only labels years divisible by 5 on the x-axis.
 */
function YearBarChart({ entries }: { entries: [string, number][] }) {
  const sorted = entries
    .map(([y, c]) => [Number(y) || 0, c] as [number, number])
    .filter(([y]) => y > 0)
    .sort((a, b) => b[0] - a[0]);

  if (sorted.length === 0) return null;

  const max = Math.max(...sorted.map(([, c]) => c));
  const barW = 8;
  const barGap = 2;
  const chartH = 90;
  const labelH = 14;
  const totalW = sorted.length * (barW + barGap);
  const svgH = chartH + labelH;

  return (
    <div className="overflow-x-auto">
      <svg width={Math.max(totalW, 120)} height={svgH} className="block">
        {/* Y-axis line */}
        <line x1={0} y1={0} x2={0} y2={chartH} className="stroke-border" strokeWidth={1} />

        {/* Bars */}
        {sorted.map(([year, count], i) => {
          const x = i * (barW + barGap);
          const h = max > 0 ? (count / max) * chartH : 0;
          const y = chartH - h;
          const color = PALETTE[year % PALETTE.length];
          const showLabel = year % 5 === 0;
          return (
            <g key={year}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, count > 0 ? 2 : 0)}
                rx={1}
                fill={color}
                className="transition-opacity hover:opacity-80"
              >
                <title>{`${year}: ${count}`}</title>
              </rect>
              {showLabel && (
                <text
                  x={x + barW / 2}
                  y={chartH + labelH - 2}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[8px]"
                >
                  {year}
                </text>
              )}
            </g>
          );
        })}

        {/* Baseline */}
        <line x1={0} y1={chartH} x2={totalW} y2={chartH} className="stroke-border" strokeWidth={1} />
      </svg>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[68px] rounded-lg" />
        ))}
      </div>
      <div className="flex flex-col gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
