import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, MessageCircle, Search } from "lucide-react";
import { formatIDR } from "@/lib/format";
import type { ThemeHomeProps } from "../types";

export default function StudioMonoHome({ shop, cats, filtered, activeCat, setActiveCat, q, setQ, status, onAdd, renderItemLink }: ThemeHomeProps) {
  const wa = shop.whatsapp?.replace(/[^0-9]/g, "");
  return (
    <div className="space-y-8 bg-neutral-50 -mx-4 -my-6 px-4 py-8 min-h-screen">
      <header className="space-y-2">
        <p className="text-[10px] font-mono uppercase tracking-[0.5em] text-neutral-500">— Studio Photography</p>
        <h1 className="text-4xl font-light tracking-tight text-neutral-900 sm:text-5xl">{shop.name}</h1>
        {shop.description && <p className="max-w-md text-sm text-neutral-600">{shop.description}</p>}
        {status && <p className="text-xs uppercase tracking-widest text-neutral-500">{status.label}</p>}
      </header>

      <div className="relative max-w-sm">
        <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search packages" className="pl-6 border-0 border-b border-neutral-300 rounded-none bg-transparent focus-visible:ring-0" />
      </div>

      <div className="flex gap-4 overflow-x-auto text-xs uppercase tracking-widest">
        <button onClick={() => setActiveCat("all")} className={activeCat === "all" ? "text-neutral-900 underline underline-offset-8" : "text-neutral-400"}>All</button>
        {cats.map((c) => (
          <button key={c.id} onClick={() => setActiveCat(c.id)} className={activeCat === c.id ? "text-neutral-900 underline underline-offset-8" : "text-neutral-400"}>{c.name}</button>
        ))}
      </div>

      <div className="columns-2 gap-4 sm:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid">
        {filtered.map((i, idx) => (
          <article key={i.id} className={`group ${!i.is_available ? "opacity-40" : ""}`}>
            {renderItemLink(i, (
              <div className={`relative overflow-hidden bg-neutral-200 ${idx % 3 === 0 ? "aspect-[3/4]" : idx % 3 === 1 ? "aspect-square" : "aspect-[4/5]"}`}>
                {i.image_url ? <img src={i.image_url} alt={i.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center"><Camera className="h-10 w-10 text-neutral-400" /></div>}
              </div>
            ))}
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-sm text-neutral-900">{i.name}</h3>
                <p className="font-mono text-xs text-neutral-500">{formatIDR(Number(i.price))}</p>
              </div>
              <Button size="sm" variant="ghost" disabled={!i.is_available} onClick={() => onAdd(i)} className="text-xs uppercase tracking-widest text-neutral-900 hover:bg-neutral-900 hover:text-white">Book</Button>
            </div>
          </article>
        ))}
        {filtered.length === 0 && <p className="col-span-full text-center text-sm text-neutral-500">No packages</p>}
      </div>

      {wa && (
        <div className="border-t border-neutral-300 pt-6">
          <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm uppercase tracking-widest text-neutral-900 underline underline-offset-4 hover:text-neutral-600">
            <MessageCircle className="h-4 w-4" />Hubungi Studio
          </a>
        </div>
      )}
    </div>
  );
}
