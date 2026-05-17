import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, MessageCircle, Search, Sparkles } from "lucide-react";
import { formatIDR } from "@/lib/format";
import type { ThemeHomeProps } from "../types";

export default function BeautySoftHome({ shop, cats, filtered, activeCat, setActiveCat, q, setQ, status, onAdd, renderItemLink }: ThemeHomeProps) {
  const wa = shop.whatsapp?.replace(/[^0-9]/g, "");
  return (
    <div className="space-y-6 [font-feature-settings:'ss01']">
      <header className="rounded-3xl bg-gradient-to-br from-pink-100 via-rose-50 to-pink-200 p-6 text-rose-900 shadow-sm">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-medium"><Sparkles className="h-3 w-3" />Beauty Studio</div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{shop.name}</h1>
        {shop.description && <p className="mt-2 max-w-md text-sm text-rose-700">{shop.description}</p>}
        {status && <span className={`mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs ${status.open ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{status.label}</span>}
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rose-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari treatment…" className="pl-9 rounded-full border-rose-200 bg-rose-50/50" />
      </div>

      <div className="flex gap-2 overflow-x-auto">
        <button onClick={() => setActiveCat("all")} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${activeCat === "all" ? "bg-rose-500 text-white" : "bg-white text-rose-700 border border-rose-200"}`}>Semua</button>
        {cats.map((c) => (
          <button key={c.id} onClick={() => setActiveCat(c.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${activeCat === c.id ? "bg-rose-500 text-white" : "bg-white text-rose-700 border border-rose-200"}`}>{c.name}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {filtered.map((i) => (
          <article key={i.id} className={`group overflow-hidden rounded-2xl border border-rose-100 bg-card shadow-sm ${!i.is_available ? "opacity-50" : ""}`}>
            {renderItemLink(i, (
              <div className="relative aspect-square overflow-hidden bg-rose-100">
                {i.image_url ? <img src={i.image_url} alt={i.name} className="h-full w-full object-cover transition group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-rose-400"><Heart className="h-8 w-8" /></div>}
              </div>
            ))}
            <div className="p-3 space-y-1">
              <h3 className="text-sm font-semibold leading-tight line-clamp-2">{i.name}</h3>
              <p className="text-sm font-bold text-rose-600">{formatIDR(Number(i.price))}</p>
              <Button size="sm" disabled={!i.is_available} onClick={() => onAdd(i)} className="w-full rounded-full bg-rose-500 hover:bg-rose-600 text-xs">Booking</Button>
            </div>
          </article>
        ))}
        {filtered.length === 0 && <p className="col-span-full py-12 text-center text-muted-foreground">Belum ada treatment</p>}
      </div>

      {wa && (
        <div className="sticky bottom-4 z-10 flex justify-center">
          <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-rose-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-500/40">
            <MessageCircle className="h-4 w-4" />Booking via WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
