import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Banknote, Plus, Trash2, CheckCircle2, Loader2, Building2, AlertCircle, Star,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/rekening-bank")({
  head: () => ({ meta: [{ title: "Rekening Bank" }] }),
  component: BankAccountsPage,
});

const BANK_LIST = [
  "BCA", "BNI", "BRI", "Mandiri", "CIMB Niaga", "Danamon", "Permata", "BTN",
  "Bank Syariah Indonesia (BSI)", "Maybank", "OCBC", "Jenius", "SeaBank", "Blu BCA",
  "GoPay", "OVO", "Dana", "ShopeePay", "LinkAja",
];

type BankAccount = {
  id: string;
  shop_id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  is_primary: boolean;
  created_at: string;
};

const EMPTY_FORM = { bank_name: "", account_number: "", account_holder: "" };

function BankAccountsPage() {
  const { shop } = useCurrentShop();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    if (!shop?.id) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("shop_bank_accounts")
      .select("*")
      .eq("shop_id", shop.id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
}
    } else {
      setAccounts((data as BankAccount[]) ?? []);
    }
    setLoading(false);
  }, [shop?.id]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!shop?.id) return;
    if (!form.bank_name.trim() || !form.account_number.trim() || !form.account_holder.trim()) {
      toast.error("Lengkapi semua field rekening bank.");
      return;
    }
    setSaving(true);
    const isPrimary = accounts.length === 0;
    const { error } = await (supabase as any).from("shop_bank_accounts").insert({
      shop_id:        shop.id,
      bank_name:      form.bank_name.trim(),
      account_number: form.account_number.trim(),
      account_holder: form.account_holder.trim(),
      is_primary:     isPrimary,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Rekening bank berhasil ditambahkan");
    setForm(EMPTY_FORM);
    setAdding(false);
    load();
  };

  const setPrimary = async (id: string) => {
    if (!shop?.id) return;
    await (supabase as any).from("shop_bank_accounts").update({ is_primary: false }).eq("shop_id", shop.id);
    await (supabase as any).from("shop_bank_accounts").update({ is_primary: true }).eq("id", id);
    toast.success("Rekening utama diperbarui");
    load();
  };

  const remove = async (id: string) => {
    setDeleting(id);
    const { error } = await (supabase as any).from("shop_bank_accounts").delete().eq("id", id);
    setDeleting(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Rekening dihapus");
    load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Rekening Bank</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Rekening ini digunakan untuk pencairan saldo marketplace.
          </p>
        </div>
        {!adding && (
          <Button onClick={() => setAdding(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Tambah Rekening
          </Button>
        )}
      </div>

      {adding && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" /> Tambah Rekening Bank
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Bank *</Label>
              <select
                value={form.bank_name}
                onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Pilih bank...</option>
                {BANK_LIST.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Nomor Rekening *</Label>
              <Input
                value={form.account_number}
                onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                placeholder="1234567890"
                className="mt-1"
                type="text"
                inputMode="numeric"
              />
            </div>
            <div>
              <Label>Nama Pemilik Rekening *</Label>
              <Input
                value={form.account_holder}
                onChange={(e) => setForm({ ...form, account_holder: e.target.value })}
                placeholder="Sesuai nama di buku tabungan"
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={save} disabled={saving} className="gap-2">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan…</> : "Simpan Rekening"}
              </Button>
              <Button variant="outline" onClick={() => { setAdding(false); setForm(EMPTY_FORM); }}>
                Batal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {accounts.length === 0 && !adding ? (
        <Card>
          <CardContent className="py-10 flex flex-col items-center text-center text-muted-foreground">
            <Banknote className="h-10 w-10 mb-3 text-muted-foreground/50" />
            <p className="font-medium text-foreground">Belum ada rekening bank</p>
            <p className="text-xs mt-1">Tambahkan rekening untuk menerima pencairan saldo marketplace.</p>
            <Button onClick={() => setAdding(true)} className="mt-4 gap-2" size="sm">
              <Plus className="h-4 w-4" /> Tambah Rekening
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <Card key={acc.id} className={acc.is_primary ? "border-primary/40 bg-primary/3" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{acc.bank_name}</p>
                        {acc.is_primary && (
                          <Badge className="text-[10px] px-1.5 py-0.5 gap-1">
                            <Star className="h-2.5 w-2.5 fill-current" /> Utama
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground font-mono mt-0.5">{acc.account_number}</p>
                      <p className="text-xs text-muted-foreground">{acc.account_holder}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!acc.is_primary && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs gap-1"
                        onClick={() => setPrimary(acc.id)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Jadikan Utama
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      disabled={deleting === acc.id}
                      onClick={() => remove(acc.id)}
                    >
                      {deleting === acc.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        <p className="font-medium flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" /> Penting
        </p>
        <p className="mt-1">Pastikan nama pemilik rekening sama persis dengan nama terdaftar di bank. Rekening yang tidak cocok dapat menyebabkan gagal transfer.</p>
      </div>
    </div>
  );
}
