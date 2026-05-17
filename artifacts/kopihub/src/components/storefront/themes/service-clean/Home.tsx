import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, MessageCircle, Phone, Search, Shield } from "lucide-react";
import { formatIDR } from "@/lib/format";
import type { ThemeHomeProps } from "../types";

export default function ServiceCleanHome({ shop, cats, filtered, activeCat, setActiveCat, q, setQ, status, onAdd, renderItemLink }: ThemeHomeProps) {
  const wa = shop.whatsapp?.replace(/[^0-9]/g, "");
  return (
    <div className="space-y-6">
      <header className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold sm:text-3xl">{shop.name}</h1>
        {shop.description && <p className="mt-1.5 text-sm text-slate-200">{shop.description}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-4 py-2 text-xs font-semibold hover:bg-emerald-600"><MessageCircle className="h-3.5 w-3.5" />Pesan via WhatsApp</a>}
          {shop.phone && <a href={`tel:${shop.phone}`} className="inline-flex items-center gap-1.5 rounded-md border border-white/20 px-4 py-2 text-xs font-semibold hover:bg-white/10"><Phone className="h-3.5 w-3.5" />{shop.phone}</a>}
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-200">
          <span className="inline-flex items-center gap-1"><Shield className="h-3.5 w-3.5" />Terpercaya</span>
          <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Profesional</span>
          {status && <span className={`rounded-full px-2 py-0.5 ${status.open ? "bg-emerald-500/30" : "bg-red-500/30"}`}>{status.label}</span>}
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari layanan…" className="pl-9" />
      </div>

      <div className="flex gap-2 overflow-x-auto">
        <button onClick={() => setActiveCat("all")} className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium ${activeCat === "all" ? "border-slate-900 bg-slate-900 text-white" : "border-border"}`}>Semua</button>
        {cats.map((c) => (
          <button key={c.id} onClick={() => setActiveCat(c.id)} className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium ${activeCat === c.id ? "border-slate-900 bg-slate-900 text-white" : "border-border"}`}>{c.name}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((i) => (
          <article key={i.id} className={`rounded-xl border border-border bg-card p-4 transition hover:border-slate-900 ${!i.is_available ? "opacity-50" : ""}`}>
            <div className="flex items-start gap-4">
              {i.image_url && <img src={i.image_url} alt={i.name} className="h-20 w-20 shrink-0 rounded-lg object-cover" />}
              <div className="min-w-0 flex-1">
                {renderItemLink(i, <h3 className="font-semibold">{i.name}</h3>)}
                {i.description && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{i.description}</p>}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">{formatIDR(Number(i.price))}</span>
                  <Button size="sm" disabled={!i.is_available} onClick={() => onAdd(i)} className="bg-slate-900 hover:bg-slate-800">Pesan</Button>
                </div>
              </div>
            </div>
          </article>
        ))}
        {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Belum ada layanan</p>}
      </div>
    </div>
  );
}
