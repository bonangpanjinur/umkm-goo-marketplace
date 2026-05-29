import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "./login";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset Kata Sandi — UMKMgo" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  // When the user arrives via reset link, Supabase parses the recovery token
  // from the URL hash and emits a PASSWORD_RECOVERY event. We then allow
  // updating the password.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    // Fallback: if a session already exists (link just clicked), allow form
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Kata sandi minimal 6 karakter");
      return;
    }
    if (password !== confirm) {
      toast.error("Konfirmasi kata sandi tidak cocok");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Kata sandi berhasil diperbarui.");
    navigate({ to: "/pos-app" });
  };

  return (
    <AuthShell title="Atur kata sandi baru" subtitle="Buat kata sandi yang kuat untuk mengamankan akun Anda.">
      {!ready ? (
        <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
          Memvalidasi link reset… Jika halaman ini tidak berubah, pastikan Anda membuka link
          terbaru dari email.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label htmlFor="password">Kata sandi baru</Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="confirm">Konfirmasi kata sandi</Label>
            <PasswordInput
              id="confirm"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <Button type="submit" className="h-10 w-full" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan kata sandi"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
