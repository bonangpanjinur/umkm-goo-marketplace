import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GraduationCap, MessageCircle, Search, Star } from "lucide-react";
import { formatIDR } from "@/lib/format";
import type { ThemeHomeProps } from "../types";

export default function EduBrightHome({ shop, cats, filtered, activeCat, setActiveCat, q, setQ, status, onAdd, renderItemLink }: ThemeHomeProps) {
  const wa = shop.whatsapp?.replace(/[^0-9]/g, "");
  return (
    <div className="space-y-6">
      <header className="rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-500 p-6 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-widest text-yellow-200">Belajar di {shop.name}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Buka Potensi, Wujudkan Mimpi</h1>
        {shop.description && <p className="mt-2 max-w-md text-sm text-indigo-100">{shop.description}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-yellow-300 px-4 py-2 text-xs font-bold text-indigo-900"><MessageCircle className="h-3.5 w-3.5" />Daftar Sekarang</a>}
          {status && <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs">{status.label}</span>}
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari kelas / kursus…" className="pl-9 rounded-full" />
      </div>

      <div className="flex gap-2 overflow-x-auto">
        <button onClick={() => setActiveCat("all")} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${activeCat === "all" ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-700"}`}>Semua</button>
        {cats.map((c) => (
          <button key={c.id} onClick={() => setActiveCat(c.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${activeCat === c.id ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-700"}`}>{c.name}</button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((i) => (
          <article key={i.id} className={`group overflow-hidden rounded-2xl border border-indigo-100 bg-card shadow-sm transition hover:shadow-lg ${!i.is_available ? "opacity-50" : ""}`}>
            {renderItemLink(i, (
              <div className="relative aspect-[16/10] bg-indigo-100">
                {i.image_url ? <img src={i.image_url} alt={i.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-indigo-400"><GraduationCap className="h-10 w-10" /></div>}
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-yellow-300 px-2 py-0.5 text-xs font-bold text-indigo-900"><Star className="h-3 w-3 fill-current" />Populer</span>
              </div>
            ))}
            <div className="p-4 space-y-2">
              <h3 className="font-bold leading-snug">{i.name}</h3>
              {i.description && <p className="text-xs text-muted-foreground line-clamp-2">{i.description}</p>}
              <div className="flex items-center justify-between pt-1">
                <span className="text-base font-extrabold text-indigo-700">{formatIDR(Number(i.price))}</span>
                <Button size="sm" disabled={!i.is_available} onClick={() => onAdd(i)} className="bg-indigo-600 hover:bg-indigo-700">Daftar</Button>
              </div>
            </div>
          </article>
        ))}
        {filtered.length === 0 && <p className="col-span-full py-12 text-center text-muted-foreground">Belum ada kursus</p>}
      </div>
    </div>
  );
}
