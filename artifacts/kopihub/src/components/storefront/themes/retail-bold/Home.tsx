import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ShoppingBag } from "lucide-react";
import { formatIDR } from "@/lib/format";
import type { ThemeHomeProps } from "../types";

export default function RetailBoldHome({ shop, cats, filtered, activeCat, setActiveCat, q, setQ, status, onAdd, renderItemLink }: ThemeHomeProps) {
  return (
    <div className="space-y-6">
      <header className="border-b-4 border-red-600 pb-5">
        <p className="text-xs font-black uppercase tracking-[0.4em] text-red-600">Koleksi Resmi</p>
        <h1 className="mt-1 text-4xl font-black uppercase tracking-tight">{shop.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
          {shop.description && <span className="text-muted-foreground">{shop.description}</span>}
          {status && <span className={`rounded-sm px-2 py-0.5 font-mono uppercase ${status.open ? "bg-foreground text-background" : "bg-red-600 text-white"}`}>{status.label}</span>}
        </div>
      </header>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="CARI PRODUK" className="pl-9 rounded-none border-2 border-foreground uppercase tracking-wide font-mono text-sm" />
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-foreground/20">
        <button onClick={() => setActiveCat("all")} className={`shrink-0 px-3 py-2 text-xs font-bold uppercase tracking-wider border-b-2 ${activeCat === "all" ? "border-red-600 text-red-600" : "border-transparent text-muted-foreground"}`}>Semua</button>
        {cats.map((c) => (
          <button key={c.id} onClick={() => setActiveCat(c.id)} className={`shrink-0 px-3 py-2 text-xs font-bold uppercase tracking-wider border-b-2 ${activeCat === c.id ? "border-red-600 text-red-600" : "border-transparent text-muted-foreground"}`}>{c.name}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {filtered.map((i) => (
          <article key={i.id} className={`group ${!i.is_available ? "opacity-50" : ""}`}>
            {renderItemLink(i, (
              <div className="relative aspect-square overflow-hidden bg-muted">
                {i.image_url ? <img src={i.image_url} alt={i.name} className="h-full w-full object-cover transition group-hover:scale-105" /> : <div className="flex h-full items-center justify-center"><ShoppingBag className="h-8 w-8 text-muted-foreground" /></div>}
                {!i.is_available && <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-xs font-black uppercase tracking-widest">Habis</div>}
              </div>
            ))}
            <div className="mt-2 space-y-1">
              <h3 className="text-sm font-bold uppercase leading-tight line-clamp-2">{i.name}</h3>
              <p className="text-sm font-mono text-red-600">{formatIDR(Number(i.price))}</p>
              <Button size="sm" variant="outline" disabled={!i.is_available} onClick={() => onAdd(i)} className="w-full rounded-none border-foreground text-xs font-bold uppercase tracking-wider hover:bg-foreground hover:text-background">+ Tambah</Button>
            </div>
          </article>
        ))}
        {filtered.length === 0 && <p className="col-span-full py-12 text-center text-sm font-mono uppercase text-muted-foreground">Produk tidak ditemukan</p>}
      </div>
    </div>
  );
}
