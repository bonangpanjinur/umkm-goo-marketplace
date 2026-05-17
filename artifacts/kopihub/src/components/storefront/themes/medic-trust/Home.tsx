import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarCheck, MessageCircle, Phone, Search, ShieldCheck, Stethoscope } from "lucide-react";
import { formatIDR } from "@/lib/format";
import type { ThemeHomeProps } from "../types";

export default function MedicTrustHome({ shop, cats, filtered, activeCat, setActiveCat, q, setQ, status, onAdd, renderItemLink }: ThemeHomeProps) {
  const wa = shop.whatsapp?.replace(/[^0-9]/g, "");
  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-6 shadow-sm">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-600 px-3 py-1 text-xs font-semibold text-white"><ShieldCheck className="h-3 w-3" />Klinik Terverifikasi</div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-teal-900">{shop.name}</h1>
        {shop.description && <p className="mt-2 max-w-xl text-sm text-teal-800/80">{shop.description}</p>}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-3 text-sm shadow-sm"><Stethoscope className="h-4 w-4 text-teal-600 mb-1" /><p className="font-semibold">Dokter Berpengalaman</p></div>
          <div className="rounded-xl bg-white p-3 text-sm shadow-sm"><CalendarCheck className="h-4 w-4 text-teal-600 mb-1" /><p className="font-semibold">Jadwal Online</p></div>
          <div className="rounded-xl bg-white p-3 text-sm shadow-sm"><ShieldCheck className="h-4 w-4 text-teal-600 mb-1" /><p className="font-semibold">Aman & Steril</p></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700"><MessageCircle className="h-3.5 w-3.5" />Buat Janji</a>}
          {shop.phone && <a href={`tel:${shop.phone}`} className="inline-flex items-center gap-1.5 rounded-md border border-teal-300 px-4 py-2 text-xs font-semibold text-teal-700"><Phone className="h-3.5 w-3.5" />{shop.phone}</a>}
          {status && <span className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-xs ${status.open ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{status.label}</span>}
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari layanan medis…" className="pl-9" />
      </div>

      <div className="flex gap-2 overflow-x-auto">
        <button onClick={() => setActiveCat("all")} className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium ${activeCat === "all" ? "border-teal-600 bg-teal-600 text-white" : "border-border"}`}>Semua</button>
        {cats.map((c) => (
          <button key={c.id} onClick={() => setActiveCat(c.id)} className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium ${activeCat === c.id ? "border-teal-600 bg-teal-600 text-white" : "border-border"}`}>{c.name}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((i) => (
          <article key={i.id} className={`rounded-xl border border-border bg-card p-4 transition hover:border-teal-500 ${!i.is_available ? "opacity-50" : ""}`}>
            <div className="flex items-start gap-3">
              {i.image_url && <img src={i.image_url} alt={i.name} className="h-16 w-16 shrink-0 rounded-lg object-cover" />}
              <div className="min-w-0 flex-1">
                {renderItemLink(i, <h3 className="font-semibold text-teal-900">{i.name}</h3>)}
                {i.description && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{i.description}</p>}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-teal-700">{formatIDR(Number(i.price))}</span>
                  <Button size="sm" disabled={!i.is_available} onClick={() => onAdd(i)} className="bg-teal-600 hover:bg-teal-700">Jadwalkan</Button>
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
