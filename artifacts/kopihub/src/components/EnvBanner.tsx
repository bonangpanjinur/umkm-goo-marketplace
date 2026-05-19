import { isSupabasePlaceholder } from "@/integrations/supabase/client";

/**
 * Banner peringatan eksplisit ketika env Supabase tidak ter-load.
 * Dirender di __root.tsx supaya developer/preview viewer langsung tahu
 * kenapa storefront stuck/blank, bukan menunggu retry x3 fail.
 */
export function EnvBanner() {
  if (!isSupabasePlaceholder) return null;
  return (
    <div className="sticky top-0 z-[100] w-full bg-destructive text-destructive-foreground px-4 py-2 text-center text-sm shadow-lg">
      <strong>Konfigurasi Backend Hilang</strong> — VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY tidak terbaca.
      Pastikan environment variable project deployment sudah terpasang, lalu rebuild.
    </div>
  );
}
