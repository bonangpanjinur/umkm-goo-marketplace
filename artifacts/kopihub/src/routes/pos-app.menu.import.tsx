import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Upload, Download, CheckCircle2, XCircle,
  FileSpreadsheet, AlertTriangle, Loader2, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/menu/import")({
  component: MenuImportPage,
});

type ParsedRow = {
  name: string;
  description: string;
  price: number;
  category: string;
  is_available: boolean;
  valid: boolean;
  errors: string[];
};

const TEMPLATE_HEADERS = ["name", "description", "price", "category", "is_available"];
const TEMPLATE_ROWS = [
  ["Kopi Susu", "Kopi susu enak", "25000", "Coffee", "true"],
  ["Matcha Latte", "Matcha premium", "30000", "Tea", "true"],
  ["Croissant", "Roti croissant butter", "18000", "Food", "true"],
];

function downloadTemplate() {
  const csv = [TEMPLATE_HEADERS, ...TEMPLATE_ROWS]
    .map(r => r.map(v => `"${v}"`).join(","))
    .join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "template_import_menu.csv";
  a.click();
}

function parseCSV(text: string): string[][] {
  return text.trim().split("\n").map(line => {
    const cells: string[] = [];
    let inside = false, cur = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inside = !inside; }
      else if (ch === "," && !inside) { cells.push(cur); cur = ""; }
      else { cur += ch; }
    }
    cells.push(cur);
    return cells.map(c => c.trim());
  });
}

function MenuImportPage() {
  const { shop }   = useCurrentShop();
  const navigate   = useNavigate();
  const fileRef    = useRef<HTMLInputElement>(null);
  const [rows,     setRows]     = useState<ParsedRow[]>([]);
  const [headers,  setHeaders]  = useState<string[]>([]);
  const [busy,     setBusy]     = useState(false);
  const [done,     setDone]     = useState<{ ok: number; fail: number } | null>(null);
  const [fileName, setFileName] = useState("");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length < 2) { toast.error("File kosong atau tidak valid"); return; }
      const hdrs = parsed[0].map(h => h.toLowerCase().trim());
      setHeaders(hdrs);
      const nameIdx  = hdrs.indexOf("name");
      const priceIdx = hdrs.indexOf("price");
      const descIdx  = hdrs.indexOf("description");
      const catIdx   = hdrs.indexOf("category");
      const availIdx = hdrs.indexOf("is_available");

      const result: ParsedRow[] = parsed.slice(1).filter(r => r.some(c => c.trim())).map(r => {
        const errors: string[] = [];
        const name  = nameIdx  >= 0 ? r[nameIdx]?.trim()  ?? "" : "";
        const price = priceIdx >= 0 ? Number(r[priceIdx]?.replace(/[^0-9.-]/g, "")) : NaN;
        if (!name)       errors.push("Nama wajib diisi");
        if (isNaN(price) || price < 0) errors.push("Harga tidak valid");
        return {
          name,
          description: descIdx  >= 0 ? r[descIdx]?.trim()  ?? "" : "",
          price:       isNaN(price) ? 0 : price,
          category:    catIdx   >= 0 ? r[catIdx]?.trim()   ?? "" : "",
          is_available: availIdx >= 0 ? r[availIdx]?.toLowerCase() !== "false" : true,
          valid: errors.length === 0,
          errors,
        };
      });
      setRows(result);
      setDone(null);
    };
    reader.readAsText(file);
  };

  const validRows = rows.filter(r => r.valid);
  const invalidRows = rows.filter(r => !r.valid);

  const runImport = async () => {
    if (!shop?.id || validRows.length === 0) return;
    setBusy(true);
    let ok = 0; let fail = 0;

    // Load categories once
    const { data: cats } = await supabase.from("categories").select("id, name").eq("shop_id", shop.id);
    const catMap = new Map<string, string>((cats ?? []).map((c: any) => [c.name.toLowerCase(), c.id]));

    const BATCH = 50;
    for (let i = 0; i < validRows.length; i += BATCH) {
      const batch = validRows.slice(i, i + BATCH);
      const records = batch.map(r => {
        const catId = r.category ? catMap.get(r.category.toLowerCase()) ?? null : null;
        return {
          shop_id:     shop.id,
          name:        r.name,
          description: r.description || null,
          price:       r.price,
          category_id: catId,
          is_available: r.is_available,
          track_stock:  false,
          recipe_yield: 1,
        };
      });
      const { error } = await supabase.from("menu_items").insert(records);
      if (error) { fail += batch.length; }
      else       { ok  += batch.length; }
    }
    setBusy(false);
    setDone({ ok, fail });
    toast.success(`Import selesai: ${ok} berhasil${fail > 0 ? `, ${fail} gagal` : ""}`);
  };

  if (done) {
    return (
      <div className="mx-auto max-w-md p-6 flex flex-col items-center gap-4 text-center py-16">
        <CheckCircle2 className="h-16 w-16 text-emerald-500" />
        <h2 className="text-xl font-bold">Import Selesai</h2>
        <div className="flex gap-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-center">
            <p className="text-3xl font-bold text-emerald-700">{done.ok}</p>
            <p className="text-xs text-emerald-600 mt-1">Berhasil</p>
          </div>
          {done.fail > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-center">
              <p className="text-3xl font-bold text-red-700">{done.fail}</p>
              <p className="text-xs text-red-600 mt-1">Gagal</p>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-2">
          <Button variant="outline" onClick={() => { setRows([]); setDone(null); setFileName(""); if (fileRef.current) fileRef.current.value = ""; }}>
            Import Lagi
          </Button>
          <Button onClick={() => navigate({ to: "/pos-app/menu" })}>← Kembali ke Menu</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <div>
        <Link to="/pos-app/menu" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Menu
        </Link>
        <h1 className="text-xl font-bold tracking-tight">Import Menu dari CSV</h1>
        <p className="text-sm text-muted-foreground">Upload file CSV untuk menambah banyak produk sekaligus.</p>
      </div>

      {/* Instructions */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5"><FileSpreadsheet className="h-4 w-4 text-primary" /> Format CSV</h3>
        <p className="text-xs text-muted-foreground">File harus memiliki header di baris pertama. Kolom yang didukung:</p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {[
            { col: "name", req: true,  desc: "Nama produk/menu" },
            { col: "price", req: true,  desc: "Harga dalam Rupiah (angka)" },
            { col: "description", req: false, desc: "Deskripsi produk" },
            { col: "category", req: false, desc: "Nama kategori (harus sudah ada)" },
            { col: "is_available", req: false, desc: "true/false (default: true)" },
          ].map(c => (
            <div key={c.col} className="flex items-start gap-2 text-xs">
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-primary shrink-0">{c.col}</code>
              {c.req && <Badge variant="destructive" className="text-[10px] h-4 px-1">wajib</Badge>}
              <span className="text-muted-foreground">{c.desc}</span>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Download Template CSV
        </Button>
      </div>

      {/* Upload zone */}
      <div
        className="rounded-xl border-2 border-dashed border-border hover:border-primary/40 bg-muted/20 p-8 text-center cursor-pointer transition-colors"
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">{fileName || "Klik atau drag & drop file CSV di sini"}</p>
        <p className="text-xs text-muted-foreground mt-1">Format: .csv · Encoding: UTF-8</p>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
      </div>

      {/* Preview */}
      {rows.length > 0 && (
        <div className="space-y-3">
          {/* Summary */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="secondary" className="gap-1"><Eye className="h-3 w-3" /> {rows.length} baris ditemukan</Badge>
            <Badge variant="default" className="gap-1 bg-emerald-600 hover:bg-emerald-600"><CheckCircle2 className="h-3 w-3" /> {validRows.length} valid</Badge>
            {invalidRows.length > 0 && <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> {invalidRows.length} error</Badge>}
          </div>

          {/* Error rows */}
          {invalidRows.length > 0 && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 space-y-2">
              <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Baris tidak valid (akan dilewati saat import)
              </p>
              {invalidRows.slice(0, 5).map((r, i) => (
                <div key={i} className="text-xs text-destructive/80">
                  <span className="font-medium">{r.name || "(kosong)"}</span>: {r.errors.join(", ")}
                </div>
              ))}
              {invalidRows.length > 5 && <p className="text-xs text-muted-foreground">…dan {invalidRows.length - 5} baris lainnya</p>}
            </div>
          )}

          {/* Preview table */}
          <div className="rounded-xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-center w-8">#</th>
                  <th className="px-3 py-2 text-left">Nama</th>
                  <th className="px-3 py-2 text-left">Deskripsi</th>
                  <th className="px-3 py-2 text-right">Harga</th>
                  <th className="px-3 py-2 text-left">Kategori</th>
                  <th className="px-3 py-2 text-center">Tersedia</th>
                  <th className="px-3 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={i} className={`border-t border-border ${!r.valid ? "bg-destructive/5" : ""}`}>
                    <td className="px-3 py-2 text-center text-xs text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 font-medium max-w-[160px] truncate">{r.name || <span className="text-muted-foreground/60 italic">kosong</span>}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground max-w-[160px] truncate">{r.description || "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.price > 0 ? formatIDR(r.price) : <span className="text-destructive text-xs">—</span>}</td>
                    <td className="px-3 py-2 text-xs">{r.category || "—"}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-xs font-medium ${r.is_available ? "text-emerald-600" : "text-muted-foreground"}`}>
                        {r.is_available ? "Ya" : "Tidak"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {r.valid
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                        : <XCircle className="h-4 w-4 text-destructive mx-auto" title={r.errors.join(", ")} />
                      }
                    </td>
                  </tr>
                ))}
                {rows.length > 50 && (
                  <tr className="border-t border-border bg-muted/20">
                    <td colSpan={7} className="px-3 py-2 text-center text-xs text-muted-foreground">
                      …dan {rows.length - 50} baris lainnya tidak ditampilkan (semua akan diimport)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Import button */}
          <div className="flex items-center justify-between gap-4 pt-1">
            <p className="text-xs text-muted-foreground">
              {validRows.length} dari {rows.length} baris akan diimport ke toko <strong>{shop?.name}</strong>.
            </p>
            <Button
              onClick={runImport}
              disabled={busy || validRows.length === 0}
              className="min-w-[140px]"
            >
              {busy ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Mengimport…</> : `Import ${validRows.length} Produk`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
