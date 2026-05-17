import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Stethoscope, X } from "lucide-react";

type Icd = { code: string; label_id: string; category: string | null };

type Props = {
  value: { code: string; label: string } | null;
  onChange: (v: { code: string; label: string } | null) => void;
  placeholder?: string;
};

let CACHE: Icd[] | null = null;

export function Icd10Picker({ value, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Icd[]>(CACHE ?? []);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (CACHE) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("icd10_codes")
        .select("code,label_id,category")
        .order("code");
      CACHE = (data ?? []) as Icd[];
      setList(CACHE);
    })();
  }, []);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return list.slice(0, 80);
    return list
      .filter((i) =>
        i.code.toLowerCase().includes(k) ||
        i.label_id.toLowerCase().includes(k) ||
        (i.category ?? "").toLowerCase().includes(k),
      )
      .slice(0, 80);
  }, [list, q]);

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="flex-1 justify-start gap-2 font-normal">
            <Stethoscope className="h-3.5 w-3.5 text-primary" />
            {value ? (
              <span className="truncate text-sm">
                <span className="font-mono font-semibold">{value.code}</span> · {value.label}
              </span>
            ) : (
              <span className="text-muted-foreground text-sm">{placeholder ?? "Pilih diagnosis ICD-10..."}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(92vw,420px)] p-0" align="start">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Cari kode / nama (mis. J06, demam, diabetes)..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">Tidak ada hasil.</div>
            ) : (
              filtered.map((i) => (
                <button
                  key={i.code}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted/60 border-b last:border-b-0"
                  onClick={() => {
                    onChange({ code: i.code, label: i.label_id });
                    setOpen(false);
                    setQ("");
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-primary shrink-0 w-14">{i.code}</span>
                    <span className="flex-1 truncate">{i.label_id}</span>
                  </div>
                  {i.category && (
                    <span className="ml-16 text-[10px] text-muted-foreground">{i.category}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
      {value && (
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onChange(null)}>
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
