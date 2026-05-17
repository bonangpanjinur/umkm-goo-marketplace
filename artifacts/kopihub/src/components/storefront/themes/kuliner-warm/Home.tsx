import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, MessageCircle, Flame } from "lucide-react";
import { formatIDR } from "@/lib/format";
import type { ThemeHomeProps } from "../types";

export default function KulinerWarmHome({ shop, cats, filtered, activeCat, setActiveCat, q, setQ, status, onAdd, renderItemLink }: ThemeHomeProps) {
  const wa = shop.whatsapp?.replace(/[^0-9]/g, "");
  return (
    <div className="space-y-6 [--accent:#b45309]">
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-900 via-amber-700 to-orange-600 p-6 text-white shadow-lg">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "20px 20px" }} />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-100/80">Selamat datang di</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{shop.name}</h1>
          {shop.description && <p className="mt-2 max-w-md text-sm text-amber-50/90">{shop.description}</p>}
          {status && (
            <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${status.open ? "bg-emerald-500/90" : "bg-red-500/90"} text-white`}>
              <span className="h-1.5 w-1.5 rounded-full bg-white" />{status.label}
            </span>
          )}
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-700/60" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari menu favorit…" className="pl-9 rounded-full border-amber-200 bg-amber-50/50" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button onClick={() => setActiveCat("all")} className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${activeCat === "all" ? "bg-amber-900 text-white" : "bg-amber-100 text-amber-900"}`}>Semua</button>
        {cats.map((c) => (
          <button key={c.id} onClick={() => setActiveCat(c.id)} className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${activeCat === c.id ? "bg-amber-900 text-white" : "bg-amber-100 text-amber-900"}`}>{c.name}</button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((i) => (
          <article key={i.id} className={`group overflow-hidden rounded-2xl border border-amber-200/60 bg-card shadow-sm transition hover:shadow-md ${!i.is_available ? "opacity-50" : ""}`}>
            {renderItemLink(i, (
              <div className="relative aspect-[4/3] overflow-hidden bg-amber-100">
                {i.image_url ? <img src={i.image_url} alt={i.name} className="h-full w-full object-cover transition group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-amber-700/50"><Flame className="h-10 w-10" /></div>}
              </div>
            ))}
            <div className="p-4 space-y-1.5">
              <h3 className="font-semibold leading-snug">{i.name}</h3>
              {i.description && <p className="text-xs text-muted-foreground line-clamp-2">{i.description}</p>}
              <div className="flex items-center justify-between pt-2">
                <span className="text-lg font-bold text-amber-900">{formatIDR(Number(i.price))}</span>
                <Button size="sm" disabled={!i.is_available || (status ? !status.open : false)} onClick={() => onAdd(i)} className="bg-amber-700 hover:bg-amber-800">Pesan</Button>
              </div>
            </div>
          </article>
        ))}
        {filtered.length === 0 && <p className="col-span-full py-12 text-center text-muted-foreground">Menu tidak ditemukan</p>}
      </div>

      <footer className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-sm text-amber-900">
        {shop.address && <p className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 shrink-0" />{shop.address}</p>}
        {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white"><MessageCircle className="h-3.5 w-3.5" />Chat WhatsApp</a>}
      </footer>
    </div>
  );
}
