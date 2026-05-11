import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/akun/alamat")({
  component: AddressPage,
});

function AddressPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ default_address: "", default_city: "", default_postal_code: "" });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("customer_profiles")
        .select("default_address, default_city, default_postal_code")
        .eq("user_id", user.id)
        .maybeSingle();
      setForm({
        default_address: data?.default_address || "",
        default_city: data?.default_city || "",
        default_postal_code: data?.default_postal_code || "",
      });
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("customer_profiles")
      .upsert({
        user_id: user.id,
        default_address: form.default_address.trim().slice(0, 500) || null,
        default_city: form.default_city.trim().slice(0, 100) || null,
        default_postal_code: form.default_postal_code.trim().slice(0, 10) || null,
      }, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Alamat tersimpan");
  };

  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader><CardTitle>Alamat Default</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">Alamat ini akan otomatis terisi saat checkout.</p>
        <div><Label>Alamat lengkap</Label><Textarea value={form.default_address} onChange={(e) => setForm({ ...form, default_address: e.target.value })} maxLength={500} rows={3} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Kota</Label><Input value={form.default_city} onChange={(e) => setForm({ ...form, default_city: e.target.value })} maxLength={100} /></div>
          <div><Label>Kode Pos</Label><Input value={form.default_postal_code} onChange={(e) => setForm({ ...form, default_postal_code: e.target.value })} maxLength={10} /></div>
        </div>
        <Button onClick={save} disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</Button>
      </CardContent>
    </Card>
  );
}
