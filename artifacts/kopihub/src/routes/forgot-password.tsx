import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "./login";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Lupa Kata Sandi — UMKMgo" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("Link reset password telah dikirim ke email Anda.");
  };

  return (
    <AuthShell title="Lupa kata sandi" subtitle="Masukkan email akun Anda untuk menerima link reset.">
      {sent ? (
        <div className="rounded-lg border bg-muted/40 p-4 text-sm">
          <p className="font-medium">Email terkirim ke <span className="text-primary">{email}</span></p>
          <p className="mt-1 text-muted-foreground">
            Cek inbox (atau folder spam) dan klik link untuk membuat kata sandi baru.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <Button type="submit" className="h-10 w-full" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kirim link reset"}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Ingat kata sandi?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Masuk
        </Link>
      </p>
    </AuthShell>
  );
}
