import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  ShieldCheck,
  Search,
  RotateCcw,
  CheckCheck,
  ChefHat,
  Truck,
  Users,
  BarChart3,
  Package,
  CalendarDays,
  Sparkles,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type ModuleItem = { slug: string; label: string; hint?: string };
type ModuleGroup = {
  id: string;
  label: string;
  short: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  items: ModuleItem[];
};

const MODULE_GROUPS: ModuleGroup[] = [
  {
    id: "operations",
    label: "Operasional Harian",
    short: "Operasi",
    description: "Akses kasir & pesanan – inti pekerjaan harian pegawai",
    icon: ChefHat,
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
    short: "Katalog",
    description: "Kelola menu/produk, varian, stok dan inventori",
    icon: Package,
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
    short: "Jadwal",
    description: "Lihat jadwal kerja & informasi tim (tanpa edit pegawai)",
    icon: CalendarDays,
    items: [
      { slug: "schedule", label: "Jadwal Kerja" },
      { slug: "booking", label: "Booking Jadwal" },
    ],
  },
  {
    id: "delivery",
    label: "Pengiriman",
    short: "Kirim",
    description: "Operasional kurir & antar pesanan",
    icon: Truck,
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
    short: "Pelanggan",
    description: "Pelanggan, promo, voucher, chat & ulasan",
    icon: Users,
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
    short: "Laporan",
    description: "Lihat laporan penjualan & analitik (sensitif)",
    icon: BarChart3,
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

const ROLE_DEFAULTS: Record<string, string[]> = {
  manager: ALL_SLUGS,
  cashier: ["pos", "orders", "online-orders", "shifts", "attendance", "antrian", "customers"],
  barista: ["orders", "online-orders", "kds", "kitchen-load", "attendance"],
};

const PRESETS: { id: keyof typeof ROLE_DEFAULTS; label: string; desc: string }[] = [
  { id: "manager", label: "Manager", desc: "Akses penuh" },
  { id: "cashier", label: "Kasir", desc: "POS & shift" },
  { id: "barista", label: "Barista", desc: "Dapur & order" },
];

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
  const [tab, setTab] = useState<string>(MODULE_GROUPS[0].id);

  useEffect(() => {
    if (!target) return;
    setSearch("");
    setTab(MODULE_GROUPS[0].id);
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("staff_permissions")
        .select("allowed_modules")
        .eq("shop_id", target.shop_id)
        .eq("user_id", target.user_id)
        .maybeSingle();
      const initial = data?.allowed_modules ?? ROLE_DEFAULTS[target.role] ?? ALL_SLUGS;
      setAllowed(new Set(initial));
      setLoading(false);
    })();
  }, [target]);

  const q = search.trim().toLowerCase();
  const isSearching = q.length > 0;

  const filteredGroups = useMemo(() => {
    if (!isSearching) return MODULE_GROUPS;
    return MODULE_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((i) =>
        `${i.label} ${i.hint ?? ""}`.toLowerCase().includes(q),
      ),
    })).filter((g) => g.items.length > 0);
  }, [q, isSearching]);

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

  function applyPreset(role: keyof typeof ROLE_DEFAULTS) {
    setAllowed(new Set(ROLE_DEFAULTS[role]));
    toast.success(`Preset "${role}" diterapkan`);
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

  // Detect which preset matches current selection
  const activePreset = useMemo(() => {
    for (const p of PRESETS) {
      const def = ROLE_DEFAULTS[p.id];
      if (def.length === allowed.size && def.every((s) => allowed.has(s))) return p.id;
    }
    return null;
  }, [allowed]);

  const totalSelected = allowed.size;
  const totalAvailable = ALL_SLUGS.length;
  const pct = Math.round((totalSelected / totalAvailable) * 100);

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="flex max-h-[92vh] w-[calc(100vw-1rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="space-y-1 border-b bg-muted/30 px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="grid h-8 w-8 place-content-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="truncate">Hak akses · {target?.name}</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Pilih menu yang boleh diakses. Pengaturan toko, billing, dan KYC tetap
            eksklusif untuk pemilik.
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar: presets + search */}
        <div className="space-y-3 border-b px-5 py-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="mr-1 text-xs text-muted-foreground">Preset:</span>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  activePreset === p.id
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background hover:bg-accent",
                )}
                title={p.desc}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAllowed(new Set())}
              className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent"
            >
              <RotateCcw className="h-3 w-3" />
              Kosongkan
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari modul…"
              className="h-9 pl-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat hak akses…
          </div>
        ) : isSearching ? (
          <ScrollArea className="flex-1">
            <div className="space-y-4 px-5 py-4">
              {filteredGroups.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Tidak ada modul yang cocok dengan "{search}".
                </div>
              ) : (
                filteredGroups.map((g) => (
                  <GroupSection
                    key={g.id}
                    group={g}
                    allowed={allowed}
                    onToggle={toggle}
                    onSetAll={setGroup}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
            <ScrollArea className="border-b">
              <TabsList className="h-auto w-full justify-start gap-1 rounded-none bg-transparent px-3 py-2">
                {MODULE_GROUPS.map((g) => {
                  const sel = g.items.filter((i) => allowed.has(i.slug)).length;
                  const Icon = g.icon;
                  return (
                    <TabsTrigger
                      key={g.id}
                      value={g.id}
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5 rounded-full px-3 py-1.5 text-xs"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{g.short}</span>
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0 text-[10px] font-semibold",
                          sel === 0
                            ? "bg-muted text-muted-foreground"
                            : sel === g.items.length
                              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                              : "bg-amber-500/20 text-amber-700 dark:text-amber-300",
                        )}
                      >
                        {sel}/{g.items.length}
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </ScrollArea>

            {MODULE_GROUPS.map((g) => (
              <TabsContent
                key={g.id}
                value={g.id}
                className="m-0 min-h-0 flex-1 data-[state=inactive]:hidden"
              >
                <ScrollArea className="h-full">
                  <div className="px-5 py-4">
                    <GroupSection
                      group={g}
                      allowed={allowed}
                      onToggle={toggle}
                      onSetAll={setGroup}
                      flat
                    />
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        )}

        {/* Footer */}
        <div className="border-t bg-muted/30">
          <div className="flex items-center gap-3 px-5 pt-3 text-xs text-muted-foreground">
            <span>
              <strong className="text-foreground">{totalSelected}</strong> dari{" "}
              {totalAvailable} modul aktif
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="tabular-nums">{pct}%</span>
          </div>
          <DialogFooter className="px-5 py-3">
            <Button variant="outline" onClick={onClose} disabled={saving} size="sm">
              Batal
            </Button>
            <Button onClick={save} disabled={saving || loading} size="sm">
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="mr-2 h-4 w-4" />
              )}
              Simpan
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GroupSection({
  group,
  allowed,
  onToggle,
  onSetAll,
  flat = false,
}: {
  group: ModuleGroup;
  allowed: Set<string>;
  onToggle: (slug: string) => void;
  onSetAll: (g: ModuleGroup, on: boolean) => void;
  flat?: boolean;
}) {
  const sel = group.items.filter((i) => allowed.has(i.slug)).length;
  const allOn = sel === group.items.length;
  const Icon = group.icon;

  return (
    <div
      className={cn(
        !flat && "rounded-xl border border-border bg-card/40 p-3",
      )}
    >
      <div className="mb-3 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-content-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold">{group.label}</div>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {sel}/{group.items.length}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{group.description}</p>
        </div>
        <button
          type="button"
          onClick={() => onSetAll(group, !allOn)}
          className="shrink-0 rounded-md border border-border px-2 py-1 text-[11px] font-medium hover:bg-accent"
        >
          {allOn ? "Matikan semua" : "Pilih semua"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {group.items.map((it) => {
          const on = allowed.has(it.slug);
          return (
            <label
              key={it.slug}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors",
                on
                  ? "border-primary/40 bg-primary/5"
                  : "border-border hover:bg-accent/40",
              )}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{it.label}</div>
                {it.hint && (
                  <div className="truncate text-[11px] text-muted-foreground">
                    {it.hint}
                  </div>
                )}
              </div>
              <Switch
                checked={on}
                onCheckedChange={() => onToggle(it.slug)}
                aria-label={it.label}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}
