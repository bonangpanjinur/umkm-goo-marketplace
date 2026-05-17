import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { useShopCapabilities } from "@/lib/use-shop-capabilities";
import {
  FEATURE_KEYS,
  FEATURE_LABEL,
  FLOW_TYPE_LABEL,
  type FeatureKey,
} from "@/lib/feature-keys";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Save, RotateCcw, Info, CheckCircle2, XCircle, Circle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/capabilities")({
  component: CapabilitiesPage,
});

type Override = { enable: FeatureKey[]; disable: FeatureKey[] };
type Tri = "default" | "on" | "off";

/** Logical grouping for the UI. */
const GROUPS: { label: string; keys: FeatureKey[] }[] = [
  { label: "POS, Menu & Retail", keys: ["POS", "MENU", "KDS", "TABLES", "INVENTORY", "VARIANTS", "RECIPES", "COMBO_BUILDER", "SUPPLIERS", "SHIFTS", "BUNDLES", "SIZE_GUIDE", "LOOKBOOK", "LIMITED_EDITIONS", "RESERVASI"] },
  { label: "Booking Sesi (T3)", keys: ["BOOKING", "STAFF_PICKER", "SERVICE_BUNDLES", "FOLLOWUP_REMINDERS", "ANTRIAN", "WAITLIST"] },
  { label: "Rental (T4)", keys: ["RENTAL", "RENTAL_AVAILABILITY", "RENTAL_DEPOSIT", "RENTAL_FINES", "RENTAL_CHECKLIST", "RENTAL_TNC", "RENTAL_EXTEND", "RENTAL_UNIT_READY"] },
  { label: "Digital & Kursus (T2)", keys: ["DIGITAL", "DIGITAL_LICENSES", "DIGITAL_VERSION", "KURSUS"] },
  { label: "Klinik", keys: ["ANAMNESIS", "MEDICAL_INVOICE", "PATIENT_RECORDS"] },
  { label: "Studio Foto", keys: ["PORTFOLIO", "STUDIO_PACKAGES", "STUDIO_DELIVERY", "STUDIO_BRIEF", "STUDIO_ADDONS"] },
  { label: "Travel / Sales-pro", keys: ["UMROH_PACKAGES", "UMROH_FACILITIES", "UMROH_FAQ", "FLYERS", "TESTIMONIALS", "LEADS", "ABOUT_PAGE"] },
  { label: "Custom Order & Jasa (T5)", keys: ["CUSTOM_ORDER", "CUSTOM_ORDER_QUOTES", "MILESTONES", "CONTRACTS", "JOB_DELIVERABLES", "PRE_ORDERS"] },
];

function labelOf(k: FeatureKey) {
  return FEATURE_LABEL[k] ?? k;
}

function parseOverride(raw: unknown): Override {
  const obj = (raw ?? {}) as { enable?: unknown; disable?: unknown };
  const en = Array.isArray(obj.enable) ? (obj.enable as FeatureKey[]) : [];
  const di = Array.isArray(obj.disable) ? (obj.disable as FeatureKey[]) : [];
  return { enable: en, disable: di };
}

function CapabilitiesPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const caps = useShopCapabilities(shop?.id);

  const [categoryDefaults, setCategoryDefaults] = useState<Set<FeatureKey>>(new Set());
  const [override, setOverride] = useState<Override>({ enable: [], disable: [] });
  const [initial, setInitial] = useState<Override>({ enable: [], disable: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!shop?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: srow } = await supabase
        .from("shops")
        .select("feature_overrides, business_category_id")
        .eq("id", shop.id)
        .maybeSingle();
      let defaults = new Set<FeatureKey>();
      if (srow?.business_category_id) {
        const { data: bc } = await supabase
          .from("business_categories")
          .select("enabled_features")
          .eq("id", srow.business_category_id)
          .maybeSingle();
        defaults = new Set<FeatureKey>((bc?.enabled_features ?? []) as FeatureKey[]);
      }
      if (cancelled) return;
      const ov = parseOverride(srow?.feature_overrides);
      setCategoryDefaults(defaults);
      setOverride(ov);
      setInitial(ov);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [shop?.id]);

  const effective = useMemo(() => {
    const s = new Set<FeatureKey>(categoryDefaults);
    for (const k of override.enable) s.add(k);
    for (const k of override.disable) s.delete(k);
    return s;
  }, [categoryDefaults, override]);

  const dirty = useMemo(() => {
    const a = JSON.stringify([...override.enable].sort()) + "|" + JSON.stringify([...override.disable].sort());
    const b = JSON.stringify([...initial.enable].sort()) + "|" + JSON.stringify([...initial.disable].sort());
    return a !== b;
  }, [override, initial]);

  const stateOf = (k: FeatureKey): Tri => {
    if (override.enable.includes(k)) return "on";
    if (override.disable.includes(k)) return "off";
    return "default";
  };

  const setTri = (k: FeatureKey, next: Tri) => {
    setOverride((prev) => {
      const enable = prev.enable.filter((x) => x !== k);
      const disable = prev.disable.filter((x) => x !== k);
      const isDefaultOn = categoryDefaults.has(k);
      if (next === "on" && !isDefaultOn) enable.push(k);
      if (next === "off" && isDefaultOn) disable.push(k);
      return { enable, disable };
    });
  };

  const reset = () => setOverride({ enable: [], disable: [] });

  const save = async () => {
    if (!shop?.id) return;
    setSaving(true);
    const payload = {
      enable: Array.from(new Set(override.enable)),
      disable: Array.from(new Set(override.disable)),
    };
    const { error } = await supabase
      .from("shops")
      .update({ feature_overrides: payload })
      .eq("id", shop.id);
    setSaving(false);
    if (error) {
      toast.error("Gagal menyimpan: " + error.message);
      return;
    }
    setInitial(payload);
    toast.success("Kapabilitas tersimpan. Navigasi & onboarding akan ikut menyesuaikan.");
  };

  if (shopLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!shop) {
    return <div className="p-6 text-muted-foreground">Toko tidak ditemukan.</div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kapabilitas Toko</h1>
          <p className="text-sm text-muted-foreground">
            Atur fitur mana yang aktif untuk toko Anda. Default mengikuti kategori bisnis.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reset} disabled={!dirty || saving}>
            <RotateCcw className="mr-2 h-4 w-4" /> Reset perubahan
          </Button>
          <Button onClick={save} disabled={!dirty || saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Kategori: {caps.data?.categoryName ?? "—"}
          </CardTitle>
          <CardDescription>
            Slug: <code className="font-mono">{caps.data?.categorySlug ?? "—"}</code>
            {caps.data?.subtype ? <> · Subtipe: <code className="font-mono">{caps.data.subtype}</code></> : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {caps.data?.flowTypes.length ? (
              caps.data.flowTypes.map((f) => (
                <Badge key={f} variant="secondary">
                  {f} — {FLOW_TYPE_LABEL[f]}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">Belum ada flow type.</span>
            )}
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <b>Default</b> = mengikuti kategori. <b>Aktifkan</b> = paksa nyala meski tidak default kategori.
              <b> Nonaktifkan</b> = paksa mati meski default kategori. Perubahan langsung terlihat di sidebar POS & preview onboarding.
            </p>
          </div>
        </CardContent>
      </Card>

      {GROUPS.map((g) => {
        const visible = g.keys.filter((k) => FEATURE_KEYS.includes(k));
        if (visible.length === 0) return null;
        return (
          <Card key={g.label}>
            <CardHeader>
              <CardTitle className="text-base">{g.label}</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {visible.map((k) => {
                const def = categoryDefaults.has(k);
                const state = stateOf(k);
                const isOn = effective.has(k);
                return (
                  <div key={k} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{labelOf(k)}</span>
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{k}</code>
                        {def ? (
                          <Badge variant="outline" className="text-[10px]">default kategori</Badge>
                        ) : null}
                        {isOn ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px]">aktif</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">mati</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <TriBtn
                        active={state === "default"}
                        onClick={() => setTri(k, "default")}
                        icon={<Circle className="h-3.5 w-3.5" />}
                        label="Default"
                      />
                      <TriBtn
                        active={state === "on"}
                        onClick={() => setTri(k, "on")}
                        icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                        label="Aktifkan"
                        disabled={def && state !== "on"}
                        hint={def ? "Sudah aktif sebagai default kategori" : undefined}
                      />
                      <TriBtn
                        active={state === "off"}
                        onClick={() => setTri(k, "off")}
                        icon={<XCircle className="h-3.5 w-3.5" />}
                        label="Nonaktifkan"
                        disabled={!def && state !== "off"}
                        hint={!def ? "Sudah mati secara default" : undefined}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      <div className="text-xs text-muted-foreground">
        Lihat dampaknya di{" "}
        <Link to="/pos-app" className="underline">sidebar POS</Link>{" "}
        atau{" "}
        <Link to="/onboarding" className="underline">preview onboarding</Link>.
      </div>
    </div>
  );
}

function TriBtn({
  active,
  onClick,
  icon,
  label,
  disabled,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      onClick={onClick}
      disabled={disabled}
      title={hint}
      className="h-8"
    >
      {icon}
      <span className="ml-1.5 text-xs">{label}</span>
    </Button>
  );
}
