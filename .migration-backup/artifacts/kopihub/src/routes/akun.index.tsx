import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/akun/")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ display_name: "", phone: "", email: "" });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("customer_profiles")
        .select("display_name, phone, email")
        .eq("user_id", user.id)
        .maybeSingle();
      setForm({
        display_name: data?.display_name || user.user_metadata?.full_name || "",
        phone: data?.phone || "",
        email: data?.email || user.email || "",
      });
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    if (!form.display_name.trim()) { toast.error("Nama wajib diisi"); return; }
    setSaving(true);
    const { error } = await supabase
      .from("customer_profiles")
      .upsert({
        user_id: user.id,
        display_name: form.display_name.trim().slice(0, 100),
        phone: form.phone.trim().slice(0, 20) || null,
        email: form.email.trim().slice(0, 255) || null,
      }, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profil tersimpan");
  };

  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader><CardTitle>Profil</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div><Label>Nama</Label><Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} maxLength={100} /></div>
        <div><Label>No. WhatsApp</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={20} placeholder="08xxxxxxxxx" /></div>
        <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} /></div>
        <Button onClick={save} disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</Button>
      </CardContent>
    </Card>
  );
}
