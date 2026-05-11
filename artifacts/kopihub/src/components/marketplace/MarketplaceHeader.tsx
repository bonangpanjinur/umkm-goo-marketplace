import { Link, useNavigate } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ShoppingBag, Store, User } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

export function MarketplaceHeader() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/search", search: { q: q.trim() } as any });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Store className="h-4 w-4" />
          </div>
          <span className="hidden text-sm font-semibold tracking-tight sm:inline">
            Marketplace
          </span>
        </Link>
        <form onSubmit={submit} className="relative flex-1 max-w-2xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari produk, toko, atau kategori…"
            className="pl-9 h-9"
          />
        </form>
        <Link to="/kategori" className="hidden text-sm text-muted-foreground hover:text-foreground md:inline">
          Kategori
        </Link>
        {user ? (
          <Link to="/pos-app">
            <Button size="sm" variant="outline" className="gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5" /> Toko Saya
            </Button>
          </Link>
        ) : (
          <>
            <Link to="/login">
              <Button size="sm" variant="ghost" className="gap-1.5">
                <User className="h-3.5 w-3.5" /> Masuk
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Daftar</Button>
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

export function MarketplaceFooter() {
  return (
    <footer className="mt-16 border-t border-border py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-xs text-muted-foreground sm:flex-row">
        <span>© 2026 Marketplace · Buka toko gratis</span>
        <div className="flex gap-4">
          <Link to="/signup" className="hover:text-foreground">Mulai berjualan</Link>
          <Link to="/pos-app" className="hover:text-foreground">Dashboard toko</Link>
        </div>
      </div>
    </footer>
  );
}
