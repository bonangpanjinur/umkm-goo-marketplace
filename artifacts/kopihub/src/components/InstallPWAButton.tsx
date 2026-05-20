import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Smartphone } from "lucide-react";
import { toast } from "sonner";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Tombol "Install Aplikasi". Muncul kalau browser support PWA install prompt
 * (Chrome/Edge Android & desktop). Di iOS Safari, tampil instruksi manual
 * karena iOS tidak expose beforeinstallprompt.
 */
export function InstallPWAButton({ className }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setInstalled(standalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      toast.success("Aplikasi berhasil dipasang");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  if (isIOS) {
    return (
      <Button
        variant="outline"
        size="sm"
        className={className}
        onClick={() =>
          toast.info("Pasang di iPhone", {
            description: "Buka di Safari → tombol Bagikan → Tambah ke Layar Utama.",
            duration: 8000,
          })
        }
      >
        <Smartphone className="w-4 h-4 mr-2" />
        Install Aplikasi
      </Button>
    );
  }

  if (!deferred) return null;

  return (
    <Button
      size="sm"
      className={className}
      onClick={async () => {
        await deferred.prompt();
        const choice = await deferred.userChoice;
        if (choice.outcome === "accepted") {
          toast.success("Menginstall…");
        }
        setDeferred(null);
      }}
    >
      <Download className="w-4 h-4 mr-2" />
      Install Aplikasi
    </Button>
  );
}
