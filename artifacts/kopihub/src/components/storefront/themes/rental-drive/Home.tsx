import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Car, MessageCircle, Search } from "lucide-react";
import { formatIDR } from "@/lib/format";
import type { ThemeHomeProps } from "../types";

export default function RentalDriveHome({ shop, cats, filtered, activeCat, setActiveCat, q, setQ, status, onAdd, renderItemLink }: ThemeHomeProps) {
  const wa = shop.whatsapp?.replace(/[^0-9]/g, "");
  return (
    <div className="space-y-6 bg-zinc-950 text-zinc-100 -mx-4 -my-6 px-4 py-6 min-h-screen">
      <header className="rounded-2xl border border-yellow-400/30 bg-gradient-to-br from-zinc-900 to-black p-6">
        <p className="text-xs font-bold uppercase tracking-[0.4em] text-yellow-400">Rental Premium</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">{shop.name}</h1>
        {shop.description && <p className="mt-2 text-sm text-zinc-400">{shop.description}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-yellow-400 px-4 py-2 text-xs font-bold uppercase text-black"><MessageCircle className="h-3.5 w-3.5" />Booking via WhatsApp</a>}
          {status && <span className={`inline-flex items-center gap-1 rounded-md border px-3 py-2 text-xs ${status.open ? "border-emerald-400 text-emerald-400" : "border-red-500 text-red-400"}`}>{status.label}</span>}
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari unit / mobil / motor…" className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500" />
      </div>

      <div className="flex gap-2 overflow-x-auto">
        <button onClick={() => setActiveCat("all")} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold uppercase ${activeCat === "all" ? "bg-yellow-400 text-black" : "bg-zinc-900 text-zinc-300"}`}>Semua</button>
        {cats.map((c) => (
          <button key={c.id} onClick={() => setActiveCat(c.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold uppercase ${activeCat === c.id ? "bg-yellow-400 text-black" : "bg-zinc-900 text-zinc-300"}`}>{c.name}</button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((i) => (
          <article key={i.id} className={`overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 ${!i.is_available ? "opacity-50" : ""}`}>
            {renderItemLink(i, (
              <div className="relative aspect-video bg-zinc-800">
                {i.image_url ? <img src={i.image_url} alt={i.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-zinc-700"><Car className="h-12 w-12" /></div>}
                <span className="absolute right-2 top-2 rounded-md bg-yellow-400 px-2 py-0.5 text-xs font-bold text-black">/ HARI</span>
              </div>
            ))}
            <div className="p-4 space-y-2">
              <h3 className="font-bold text-zinc-100">{i.name}</h3>
              {i.description && <p className="text-xs text-zinc-400 line-clamp-1">{i.description}</p>}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xl font-black text-yellow-400">{formatIDR(Number(i.price))}</span>
                <Button size="sm" disabled={!i.is_available} onClick={() => onAdd(i)} className="bg-yellow-400 text-black hover:bg-yellow-300"><Calendar className="h-3.5 w-3.5 mr-1" />Sewa</Button>
              </div>
            </div>
          </article>
        ))}
        {filtered.length === 0 && <p className="col-span-full py-12 text-center text-zinc-500">Belum ada unit</p>}
      </div>
    </div>
  );
}
