import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Hammer, MessageCircle, Search } from "lucide-react";
import { formatIDR } from "@/lib/format";
import type { ThemeHomeProps } from "../types";

export default function CraftPaperHome({ shop, cats, filtered, activeCat, setActiveCat, q, setQ, status, onAdd, renderItemLink }: ThemeHomeProps) {
  const wa = shop.whatsapp?.replace(/[^0-9]/g, "");
  return (
    <div className="space-y-6 font-serif" style={{ background: "linear-gradient(180deg, #f5efe4 0%, #f5efe4 100%)", backgroundImage: "radial-gradient(circle at 1px 1px, rgba(139,69,19,0.1) 1px, transparent 0)", backgroundSize: "16px 16px", margin: "-1.5rem -1rem", padding: "1.5rem 1rem", minHeight: "100vh" }}>
      <header className="border-b-2 border-dashed border-amber-800/40 pb-4">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-700">— Handcrafted with care —</p>
        <h1 className="mt-1 text-4xl font-bold tracking-tight text-amber-950">{shop.name}</h1>
        {shop.description && <p className="mt-2 max-w-md italic text-amber-900/80">{shop.description}</p>}
      </header>

      <div className="rounded-lg border-2 border-amber-800/40 border-dashed bg-white/60 p-4 text-sm text-amber-900">
        <div className="flex items-center gap-2 font-semibold"><Hammer className="h-4 w-4" />Custom Order Tersedia</div>
        <p className="mt-1 text-xs">Konsultasikan kebutuhan custom Anda — kami akan beri penawaran personal.</p>
        {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-amber-800 px-3 py-1.5 text-xs font-semibold text-white"><MessageCircle className="h-3 w-3" />Mulai Konsultasi</a>}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-700" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari produk…" className="pl-9 border-amber-800/40 bg-white/70" />
      </div>

      <div className="flex gap-2 overflow-x-auto">
        <button onClick={() => setActiveCat("all")} className={`shrink-0 rounded-md border-2 px-3 py-1 text-xs font-semibold ${activeCat === "all" ? "border-amber-900 bg-amber-900 text-amber-50" : "border-amber-800/40 text-amber-900"}`}>Semua</button>
        {cats.map((c) => (
          <button key={c.id} onClick={() => setActiveCat(c.id)} className={`shrink-0 rounded-md border-2 px-3 py-1 text-xs font-semibold ${activeCat === c.id ? "border-amber-900 bg-amber-900 text-amber-50" : "border-amber-800/40 text-amber-900"}`}>{c.name}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {filtered.map((i) => (
          <article key={i.id} className={`rounded-lg border-2 border-amber-800/40 bg-white/80 p-2 ${!i.is_available ? "opacity-50" : ""}`}>
            {renderItemLink(i, (
              <div className="aspect-square overflow-hidden rounded bg-amber-100">
                {i.image_url ? <img src={i.image_url} alt={i.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-amber-600"><Hammer className="h-8 w-8" /></div>}
              </div>
            ))}
            <div className="mt-2 space-y-1">
              <h3 className="text-sm font-semibold text-amber-950 line-clamp-2">{i.name}</h3>
              <p className="font-mono text-sm text-amber-800">{formatIDR(Number(i.price))}</p>
              <Button size="sm" disabled={!i.is_available} onClick={() => onAdd(i)} className="w-full bg-amber-900 hover:bg-amber-950 text-xs">Pesan</Button>
            </div>
          </article>
        ))}
        {filtered.length === 0 && <p className="col-span-full py-8 text-center text-sm italic text-amber-700">Tidak ada produk</p>}
      </div>

      {status && <p className="text-center text-xs italic text-amber-700">{status.label}</p>}
    </div>
  );
}
