import { ShieldCheck, Star, MessageSquare, CheckCircle2, XCircle, Lock } from "lucide-react";

// ── Criteria constants (single source of truth) ────────────────────────────────
export const TRUST_CRITERIA = {
  MIN_RATING:     4.5,
  MIN_REVIEWS:    50,
  MIN_REPLY_RATE: 0.80, // 80 %
};

export type CertResult = {
  earned:   boolean;
  criteria: { label: string; icon: React.ElementType; met: boolean; value: string; target: string; pct: number }[];
};

export function computeTrustCert(
  avgRating:   number,
  reviewCount: number,
  replyRate:   number,
): CertResult {
  const criteria = [
    {
      label:  "Rating rata-rata",
      icon:   Star,
      met:    avgRating >= TRUST_CRITERIA.MIN_RATING,
      value:  avgRating > 0 ? `${avgRating.toFixed(1)}★` : "—",
      target: `≥ ${TRUST_CRITERIA.MIN_RATING}★`,
      pct:    Math.min(100, Math.round((avgRating / TRUST_CRITERIA.MIN_RATING) * 100)),
    },
    {
      label:  "Jumlah ulasan",
      icon:   CheckCircle2,
      met:    reviewCount >= TRUST_CRITERIA.MIN_REVIEWS,
      value:  String(reviewCount),
      target: `≥ ${TRUST_CRITERIA.MIN_REVIEWS} ulasan`,
      pct:    Math.min(100, Math.round((reviewCount / TRUST_CRITERIA.MIN_REVIEWS) * 100)),
    },
    {
      label:  "Tingkat balas ulasan",
      icon:   MessageSquare,
      met:    replyRate > TRUST_CRITERIA.MIN_REPLY_RATE,
      value:  `${Math.round(replyRate * 100)}%`,
      target: `> ${Math.round(TRUST_CRITERIA.MIN_REPLY_RATE * 100)}%`,
      pct:    Math.min(100, Math.round((replyRate / TRUST_CRITERIA.MIN_REPLY_RATE) * 100)),
    },
  ];
  return {
    earned: criteria.every(c => c.met),
    criteria,
  };
}

// ── Badge variants ─────────────────────────────────────────────────────────────

/** Tiny pill badge — for nav chips, leaderboard cards, product page */
export function TrustCertBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  const base =
    "inline-flex items-center gap-1 font-bold text-white " +
    "bg-gradient-to-r from-teal-500 to-emerald-500 shadow-sm shadow-emerald-200 rounded-full";
  const sizeMap = {
    sm: `${base} px-2 py-0.5 text-[10px]`,
    md: `${base} px-3 py-1 text-xs`,
  };
  return (
    <span className={sizeMap[size]}>
      <ShieldCheck className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      Toko Terpercaya
    </span>
  );
}

/**
 * Large featured badge — for shop profile hero section.
 * Shows certificate illustration + 3 criteria with ticks.
 */
export function TrustCertCard({ result }: { result: CertResult }) {
  if (result.earned) {
    return (
      <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-teal-50 via-emerald-50 to-green-50 p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 shadow-md shadow-emerald-200 shrink-0">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-800 leading-tight">Sertifikat Toko Terpercaya</p>
            <p className="text-xs text-emerald-600 mt-0.5">Semua syarat kualitas terpenuhi ✓</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {result.criteria.map(c => (
            <div key={c.label} className="rounded-lg bg-white/70 border border-emerald-100 px-2 py-1.5 text-center">
              <p className="text-[11px] text-emerald-700 font-medium">{c.label.split(" ")[0]}</p>
              <p className="text-sm font-bold text-emerald-800">{c.value}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Not yet earned — show progress
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 shrink-0">
          <Lock className="h-5 w-5 text-slate-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700 leading-tight">Sertifikat Toko Terpercaya</p>
          <p className="text-xs text-slate-500 mt-0.5">Penuhi semua syarat berikut untuk mendapat sertifikat</p>
        </div>
      </div>
      <div className="space-y-2">
        {result.criteria.map(c => (
          <div key={c.label}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="flex items-center gap-1.5 text-xs text-slate-600">
                {c.met
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  : <XCircle className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                }
                {c.label}
              </span>
              <span className={`text-xs font-semibold ${c.met ? "text-emerald-600" : "text-slate-500"}`}>
                {c.value} / {c.target}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${c.met ? "bg-emerald-500" : "bg-slate-400"}`}
                style={{ width: `${c.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Compact progress panel — for owner dashboard (pos-app.reviews).
 * Shows inline progress toward cert without taking too much space.
 */
export function TrustCertProgress({ result }: { result: CertResult }) {
  if (result.earned) {
    return (
      <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-r from-teal-50 to-emerald-50 px-4 py-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 shadow shadow-emerald-200 shrink-0">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-emerald-800">Sertifikat Toko Terpercaya diraih! 🎉</p>
          <p className="text-xs text-emerald-600">Badge ini tampil di halaman tokomu dan leaderboard platform.</p>
        </div>
        <TrustCertBadge size="md" />
      </div>
    );
  }
  const metCount = result.criteria.filter(c => c.met).length;
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 shrink-0">
            <Lock className="h-4 w-4 text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-tight">Menuju Sertifikat Toko Terpercaya</p>
            <p className="text-xs text-muted-foreground">{metCount}/3 syarat terpenuhi</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {result.criteria.map(c => (
            <div
              key={c.label}
              title={`${c.label}: ${c.value} (syarat: ${c.target})`}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${c.met ? "bg-emerald-500" : "bg-slate-300"}`}
            />
          ))}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {result.criteria.map(c => (
          <div key={c.label} className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                {c.met
                  ? <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  : <XCircle className="h-3 w-3 text-slate-400" />
                }
                {c.label}
              </span>
              <span className={`text-[11px] font-semibold ${c.met ? "text-emerald-600" : "text-muted-foreground"}`}>
                {c.value}
              </span>
            </div>
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${c.met ? "bg-emerald-500" : "bg-slate-400"}`}
                style={{ width: `${c.pct}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-right">target {c.target}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
