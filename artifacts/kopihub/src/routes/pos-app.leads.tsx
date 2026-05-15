import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Inbox, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/leads")({
  head: () => ({ meta: [{ title: "Lead / CRM — Merchant" }] }),
  component: Page,
});

type Lead = {
  id: string; full_name: string; phone: string; email: string | null;
  message: string | null; source: string; status: string; notes: string | null;
  created_at: string;
};
const STATUSES = ["new", "contacted", "qualified", "converted", "lost"] as const;
const LABEL: Record<string, string> = {
  new: "Baru", contacted: "Dihubungi", qualified: "Tertarik", converted: "Closing", lost: "Hilang",
};

function Page() {
  const { shop, loading } = useCurrentShop();
  const [leads, setLeads] = useState<Lead[]>([]);

  async function load() {
    if (!shop) return;
    const { data } = await supabase.from("leads").select("*").eq("shop_id", shop.id).order("created_at", { ascending: false });
    setLeads((data ?? []) as Lead[]);
  }
  useEffect(() => { void load(); }, [shop?.id]);

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("leads").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Status diperbarui");
    void load();
  }

  if (loading || !shop) return <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      <h1 className="text-2xl font-bold mb-1 flex items-center gap-2"><Inbox className="h-6 w-6" />Lead / Inquiry</h1>
      <p className="text-sm text-muted-foreground mb-6">Pendaftaran & inquiry dari storefront — total {leads.length} lead</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {STATUSES.map((s) => {
          const list = leads.filter((l) => l.status === s);
          return (
            <div key={s}>
              <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">{LABEL[s]} ({list.length})</h3>
              <div className="space-y-2">
                {list.map((l) => (
                  <Card key={l.id} className="p-3">
                    <p className="font-semibold text-sm">{l.full_name}</p>
                    <p className="text-xs text-muted-foreground">{l.phone}</p>
                    <Badge variant="outline" className="text-[10px] mt-1">{l.source}</Badge>
                    {l.message && <p className="text-xs mt-2 line-clamp-2">{l.message}</p>}
                    <div className="mt-2 flex gap-1 flex-wrap">
                      <a href={`https://wa.me/${l.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline" className="h-7 px-2"><MessageCircle className="h-3 w-3" /></Button>
                      </a>
                      <select value={l.status} onChange={(e) => setStatus(l.id, e.target.value)} className="text-xs border rounded px-1 h-7 bg-background">
                        {STATUSES.map((st) => <option key={st} value={st}>{LABEL[st]}</option>)}
                      </select>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
