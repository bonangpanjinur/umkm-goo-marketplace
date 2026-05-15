import { useEffect, useMemo, useState } from "react";
import { Loader2, ShieldCheck, Search, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

/**
 * Module catalog grouped for owner-friendly permission management.
 * Each `slug` matches the first path segment after `/pos-app/`
 * — this is what `isModuleAllowed()` in use-staff.ts reads.
 *
 * Curated to only include modules that make sense for staff to access.
 * Owner-only items (billing, backup, kyc, domain, custom-css, outlets,
 * settings, appearance, plan-matrix, etc.) are intentionally omitted.
 */
type ModuleItem = { slug: string; label: string; hint?: string };
type ModuleGroup = { id: string; label: string; description: string; items: ModuleItem[] };

const MODULE_GROUPS: ModuleGroup[] = [
  {
    id: "operations",
    label: "Operasional Harian",
    description: "Akses kasir & pesanan – inti pekerjaan harian pegawai",
    items: [
      { slug: "pos", label: "POS Kasir", hint: "Membuat transaksi, terima pembayaran" },
      { slug: "orders", label: "Semua Pesanan", hint: "Lihat & kelola semua pesanan masuk" },
      { slug: "online-orders", label: "Pesanan Online" },
      { slug: "marketplace-orders", label: "Pesanan Marketplace" },
      { slug: "kds", label: "Kitchen Display (KDS)" },
      { slug: "kitchen-load", label: "Beban Dapur" },
      { slug: "antrian", label: "Antrean Digital" },
      { slug: "shifts", label: "Shift Kasir", hint: "Buka/tutup shift, hitung kas" },
      { slug: "attendance", label: "Absensi", hint: "Clock-in & clock-out pribadi" },
    ],
  },
  {
    id: "catalog",
    label: "Katalog & Stok",
    description: "Kelola menu/produk, varian, stok dan inventori",
    items: [
      { slug: "menu", label: "Menu / Produk" },
      { slug: "variants", label: "Varian Produk" },
      { slug: "categories", label: "Kategori" },
      { slug: "atribut", label: "Atribut Produk" },
      { slug: "stok", label: "Stok Terpadu" },
      { slug: "inventory", label: "Inventori" },
      { slug: "bundles", label: "Bundle / Paket" },
      { slug: "recipes", label: "Resep" },
      { slug: "suppliers", label: "Supplier" },
      { slug: "purchase-orders", label: "Purchase Order" },
    ],
  },
  {
    id: "team",
    label: "Tim & Jadwal",
    description: "Lihat jadwal kerja & informasi tim (tanpa edit pegawai)",
    items: [
      { slug: "schedule", label: "Jadwal Kerja" },
      { slug: "booking", label: "Booking Jadwal" },
    ],
  },
  {
    id: "delivery",
    label: "Pengiriman",
    description: "Operasional kurir & antar pesanan",
    items: [
      { slug: "delivery", label: "Delivery" },
      { slug: "couriers", label: "Kurir" },
      { slug: "courier", label: "Pengantaran" },
      { slug: "shipping-labels", label: "Label Pengiriman" },
      { slug: "rajaongkir", label: "RajaOngkir" },
    ],
  },
  {
    id: "customers",
    label: "Pelanggan & Marketing",
    description: "Pelanggan, promo, voucher, chat & ulasan",
    items: [
      { slug: "customers", label: "Pelanggan" },
      { slug: "inbox", label: "Inbox Chat" },
      { slug: "reviews", label: "Ulasan Pembeli" },
      { slug: "qa", label: "Q&A Produk" },
      { slug: "promos", label: "Promo" },
      { slug: "vouchers", label: "Voucher Toko" },
      { slug: "loyalty", label: "Loyalty" },
      { slug: "membership", label: "Membership" },
      { slug: "broadcast-wa", label: "Broadcast WhatsApp" },
      { slug: "restock-notify", label: "Notif Stok Kembali" },
    ],
  },
  {
    id: "reports",
    label: "Laporan",
    description: "Lihat laporan penjualan & analitik (sensitif)",
    items: [
      { slug: "reports", label: "Laporan Penjualan" },
      { slug: "laporan-harian", label: "Laporan Harian" },
      { slug: "marketplace-analytics", label: "Analitik Marketplace" },
      { slug: "customer-analytics", label: "Analitik Pembeli" },
      { slug: "booking-analytics", label: "Analitik Booking" },
    ],
  },
];

const ALL_SLUGS = MODULE_GROUPS.flatMap((g) => g.items.map((i) => i.slug));

// Defaults per role — used as a sensible starting point.
const ROLE_DEFAULTS: Record<string, string[]> = {
  manager: ALL_SLUGS, // managers get everything in the catalog
  cashier: ["pos", "orders", "online-orders", "shifts", "attendance", "antrian", "customers"],
  barista: ["orders", "online-orders", "kds", "kitchen-load", "attendance"],
};

export type StaffPermissionsTarget = {
  user_id: string;
  shop_id: string;
  name: string;
  role: string;
};

export function StaffPermissionsDialog({
  target,
  onClose,
}: {
  target: StaffPermissionsTarget | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allowed, setAllowed] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!target) return;
    setSearch("");
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("staff_permissions")
        .select("allowed_modules")
        .eq("shop_id", target.shop_id)
        .eq("user_id", target.user_id)
        .maybeSingle();
      const initial =
        data?.allowed_modules ??
        ROLE_DEFAULTS[target.role] ??
        ALL_SLUGS;
      setAllowed(new Set(initial));
      setLoading(false);
    })();
  }, [target]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MODULE_GROUPS;
    return MODULE_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((i) =>
        `${i.label} ${i.hint ?? ""}`.toLowerCase().includes(q),
      ),
    })).filter((g) => g.items.length > 0);
  }, [search]);

  function toggle(slug: string) {
    setAllowed((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function setGroup(group: ModuleGroup, on: boolean) {
    setAllowed((prev) => {
      const next = new Set(prev);
      for (const it of group.items) {
        if (on) next.add(it.slug);
        else next.delete(it.slug);
      }
      return next;
    });
  }

  function applyPreset(role: "manager" | "cashier" | "barista") {
    setAllowed(new Set(ROLE_DEFAULTS[role]));
  }

  async function save() {
    if (!target) return;
    setSaving(true);
    const modules = [...allowed];
    const { error } = await supabase
      .from("staff_permissions")
      .upsert(
        {
          shop_id: target.shop_id,
          user_id: target.user_id,
          role: target.role,
          allowed_modules: modules,
        },
        { onConflict: "shop_id,user_id" },
      );
    setSaving(false);
    if (error) {
      toast.error("Gagal menyimpan hak akses: " + error.message);
      return;
    }
    toast.success(`Hak akses ${target.name} tersimpan`);
    onClose();
  }

  const totalSelected = allowed.size;
  const totalAvailable = ALL_SLUGS.length;

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Hak akses · {target?.name}
          </DialogTitle>
          <DialogDescription>
            Centang menu yang boleh diakses pegawai ini. Modul sensitif (keuangan, KYC,
            backup, pengaturan toko) tetap eksklusif untuk pemilik.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 border-b px-6 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Preset cepat:</span>
            <Button size="sm" variant="outline" onClick={() => applyPreset("manager")}>
              Manager (semua)
            </Button>
            <Button size="sm" variant="outline" onClick={() => applyPreset("cashier")}>
              Kasir
            </Button>
            <Button size="sm" variant="outline" onClick={() => applyPreset("barista")}>
              Barista
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setAllowed(new Set())}
              className="text-muted-foreground"
            >
              <RotateCcw className="mr-1 h-3 w-3" /> Kosongkan
            </Button>
            <Badge variant="secondary" className="ml-auto">
              {totalSelected} / {totalAvailable} modul
            </Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari modul…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-6">
          {loading ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat hak akses…
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Tidak ada modul yang cocok.
            </div>
          ) : (
            <div className="space-y-5 py-4">
              {filteredGroups.map((g) => {
                const groupSlugs = g.items.map((i) => i.slug);
                const selectedInGroup = groupSlugs.filter((s) => allowed.has(s)).length;
                const allOn = selectedInGroup === groupSlugs.length;
                const someOn = selectedInGroup > 0 && !allOn;
                return (
                  <div key={g.id} className="rounded-xl border border-border bg-card/50 p-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={allOn ? true : someOn ? "indeterminate" : false}
                        onCheckedChange={(v) => setGroup(g, !!v && v !== "indeterminate")}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium">{g.label}</div>
                          <span className="text-xs text-muted-foreground">
                            {selectedInGroup}/{groupSlugs.length}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{g.description}</p>
                      </div>
                    </div>
                    <Separator className="my-3" />
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {g.items.map((it) => (
                        <label
                          key={it.slug}
                          className="flex cursor-pointer items-start gap-2 rounded-lg p-2 hover:bg-accent/40"
                        >
                          <Checkbox
                            checked={allowed.has(it.slug)}
                            onCheckedChange={() => toggle(it.slug)}
                            className="mt-0.5"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium leading-tight">{it.label}</div>
                            {it.hint && (
                              <div className="text-[11px] text-muted-foreground">{it.hint}</div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="border-t px-6 py-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button onClick={save} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan hak akses
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
