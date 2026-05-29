import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  KeyRound, Plus, Trash2, RefreshCw, Loader2, Copy, Eye, EyeOff, ShieldCheck,
  CheckCircle, Clock,
} from "lucide-react";

export const Route = createFileRoute("/admin/api-keys")({
  head: () => ({ meta: [{ title: "API Keys Platform — Admin" }] }),
  component: PlatformApiKeysPage,
});

type ApiKey = {
  id: string;
  shop_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  shop_name?: string;
};

type NewKeyResult = { key_id: string; full_key: string; prefix: string };

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function PlatformApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newKeyResult, setNewKeyResult] = useState<NewKeyResult | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const [form, setForm] = useState({ shop_id: "", name: "", scopes: "read" });
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("api_keys")
      .select("id, shop_id, name, key_prefix, scopes, last_used_at, expires_at, is_active, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) { toast.error(error.message); setLoading(false); return; }
    setKeys((data ?? []) as ApiKey[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createKey = async () => {
    if (!form.shop_id.trim() || !form.name.trim()) {
      toast.error("Shop ID dan nama API key wajib diisi");
      return;
    }
    setCreating(true);
    const { data, error } = await (supabase as any).rpc("fn_generate_api_key", {
      _shop_id:  form.shop_id.trim(),
      _name:     form.name.trim(),
      _scopes:   form.scopes.split(",").map((s: string) => s.trim()),
    });
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    setNewKeyResult(data as NewKeyResult);
    load();
  };

  const revokeKey = async (id: string) => {
    if (!confirm("Nonaktifkan API key ini? Integrasi yang menggunakannya akan berhenti bekerja.")) return;
    setRevoking(id);
    const { error } = await (supabase as any)
      .from("api_keys").update({ is_active: false }).eq("id", id);
    setRevoking(null);
    if (error) toast.error(error.message);
    else { toast.success("API key dinonaktifkan"); load(); }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key).then(() => toast.success("API key tersalin"));
  };

  const filtered = keys.filter(k =>
    !search.trim() ||
    k.name.toLowerCase().includes(search.toLowerCase()) ||
    k.shop_id.toLowerCase().includes(search.toLowerCase())
  );
  const active = keys.filter(k => k.is_active).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" /> Platform API Keys
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola API key untuk integrasi merchant dengan platform UMKMgo
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-1.5" />Refresh
          </Button>
          <Button size="sm" onClick={() => { setAddOpen(true); setNewKeyResult(null); setShowNewKey(false); setForm({ shop_id: "", name: "", scopes: "read" }); }}>
            <Plus className="h-4 w-4 mr-1.5" />Generate API Key
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{keys.length}</p>
          <p className="text-xs text-muted-foreground">Total Keys</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{active}</p>
          <p className="text-xs text-muted-foreground">Aktif</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{keys.length - active}</p>
          <p className="text-xs text-muted-foreground">Dinonaktifkan</p>
        </Card>
      </div>

      {/* Search */}
      <Input
        placeholder="Cari nama key atau shop ID..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* List */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <KeyRound className="mx-auto h-8 w-8 opacity-30 mb-2" />
          <p className="text-sm">Belum ada API key dibuat.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(k => (
            <Card key={k.id} className={`p-4 ${!k.is_active ? "opacity-60" : ""}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm">{k.name}</span>
                    {k.is_active
                      ? <Badge className="bg-green-100 text-green-700 text-xs"><CheckCircle className="h-3 w-3 mr-1 inline" />Aktif</Badge>
                      : <Badge className="bg-muted text-muted-foreground text-xs">Nonaktif</Badge>
                    }
                    {k.scopes.map(s => (
                      <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">
                    {k.key_prefix}••••••••••••••••••••••
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Dibuat: {fmtDate(k.created_at)}
                    {k.last_used_at && <span> · Terakhir digunakan: {fmtDate(k.last_used_at)}</span>}
                    {k.expires_at && <span> · Kedaluwarsa: {fmtDate(k.expires_at)}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">Shop: {k.shop_id}</p>
                </div>
                {k.is_active && (
                  <Button size="sm" variant="destructive" onClick={() => revokeKey(k.id)} disabled={revoking === k.id}>
                    {revoking === k.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
                    Nonaktifkan
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> Generate API Key Baru
            </DialogTitle>
          </DialogHeader>

          {newKeyResult ? (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>API key berhasil dibuat. <strong>Salin sekarang</strong> — tidak akan ditampilkan lagi.</span>
              </div>
              <div>
                <Label>API Key (tampilkan sekali)</Label>
                <div className="flex gap-2 mt-1.5">
                  <div className="relative flex-1">
                    <Input
                      type={showNewKey ? "text" : "password"}
                      readOnly
                      value={newKeyResult.full_key}
                      className="font-mono text-xs pr-10"
                    />
                    <button
                      onClick={() => setShowNewKey(v => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => copyKey(newKeyResult.full_key)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button className="w-full" onClick={() => { setAddOpen(false); setNewKeyResult(null); }}>
                Selesai
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div>
                <Label>Shop ID</Label>
                <Input
                  className="mt-1.5"
                  placeholder="UUID toko target"
                  value={form.shop_id}
                  onChange={e => setForm({ ...form, shop_id: e.target.value })}
                />
              </div>
              <div>
                <Label>Nama Key</Label>
                <Input
                  className="mt-1.5"
                  placeholder="contoh: Integrasi Tokopedia"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Scopes (pisah koma)</Label>
                <Input
                  className="mt-1.5"
                  placeholder="read, write, orders"
                  value={form.scopes}
                  onChange={e => setForm({ ...form, scopes: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">Tersedia: read, write, orders, products</p>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700">Key tidak kedaluwarsa secara default. Nonaktifkan secara manual jika diperlukan.</p>
              </div>
            </div>
          )}

          {!newKeyResult && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Batal</Button>
              <Button onClick={createKey} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <KeyRound className="h-4 w-4 mr-1.5" />}
                Generate
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
