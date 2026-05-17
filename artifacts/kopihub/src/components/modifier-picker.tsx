import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatIDR } from "@/lib/format";
import type { SelectedOption } from "@/lib/cart";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export type OptionGroup = {
  id: string;
  name: string;
  is_required: boolean;
  max_select: number;
  sort_order: number;
  options: OptionChoice[];
};

export type OptionChoice = {
  id: string;
  name: string;
  price_adjustment: number;
  is_available: boolean;
  sort_order: number;
};

type VariantRow = {
  id: string;
  name: string;
  price: number;
  stock: number | null;
  is_available: boolean;
  attributes: Record<string, string> | null;
  sort_order: number | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  menuItemId: string;
  menuItemName: string;
  /** Base price of parent menu item (used to compute variant price_adjustment) */
  menuItemPrice?: number;
  shopId: string;
  onConfirm: (selected: SelectedOption[]) => void;
};

export function ModifierPicker({ open, onClose, menuItemId, menuItemName, menuItemPrice = 0, shopId, onConfirm }: Props) {
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [variantId, setVariantId] = useState<string>("");
  const [groups, setGroups] = useState<OptionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  // Only mount the actual Dialog once we've confirmed there are option groups.
  // Otherwise the picker flashes open and immediately closes (auto-confirm path),
  // which looks like a disappearing modal to the user.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open || !menuItemId) {
      setReady(false);
      return;
    }
    setLoading(true);
    setReady(false);
    (async () => {
      const [{ data: grps }, { data: vRows }] = await Promise.all([
        supabase
          .from("menu_item_option_groups")
          .select("id, name, is_required, max_select, sort_order")
          .eq("menu_item_id", menuItemId)
          .eq("shop_id", shopId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("menu_item_variants")
          .select("id, name, price, stock, is_available, attributes, sort_order")
          .eq("menu_item_id", menuItemId)
          .eq("shop_id", shopId)
          .order("sort_order", { ascending: true }),
      ]);

      const variantList = (vRows ?? []) as VariantRow[];
      setVariants(variantList);
      // Pilih varian default pertama yang tersedia (stok > 0 atau stok null)
      const firstOk = variantList.find(
        (v) => v.is_available && (v.stock === null || (v.stock ?? 0) > 0),
      );
      setVariantId(firstOk?.id ?? "");

      if ((!grps || grps.length === 0) && variantList.length === 0) {
        setGroups([]);
        setLoading(false);
        // Tidak ada opsi & tidak ada varian — masuk ke cart langsung
        onConfirm([]);
        onClose();
        return;
      }

      const groupIds = (grps ?? []).map((g) => g.id);
      const { data: opts } = groupIds.length
        ? await supabase
            .from("menu_item_options")
            .select("id, group_id, name, price_adjustment, is_available, sort_order")
            .in("group_id", groupIds)
            .eq("is_available", true)
            .order("sort_order", { ascending: true })
        : { data: [] as OptionChoice[] & { group_id: string }[] };

      const optMap = new Map<string, OptionChoice[]>();
      for (const o of (opts as any[]) ?? []) {
        const list = optMap.get(o.group_id) ?? [];
        list.push(o as OptionChoice);
        optMap.set(o.group_id, list);
      }

      const fullGroups: OptionGroup[] = (grps ?? []).map((g) => ({
        ...g,
        options: optMap.get(g.id) ?? [],
      }));

      setGroups(fullGroups);
      // Initialize defaults
      const init: Record<string, string[]> = {};
      fullGroups.forEach((g) => {
        init[g.id] = [];
      });
      setSelections(init);
      setLoading(false);
      setReady(true);
    })();
  }, [open, menuItemId, shopId]);

  function toggleOption(groupId: string, optionId: string, maxSelect: number) {
    setSelections((prev) => {
      const curr = prev[groupId] ?? [];
      if (curr.includes(optionId)) {
        return { ...prev, [groupId]: curr.filter((id) => id !== optionId) };
      }
      if (maxSelect === 1) {
        return { ...prev, [groupId]: [optionId] };
      }
      if (curr.length >= maxSelect) return prev;
      return { ...prev, [groupId]: [...curr, optionId] };
    });
  }

  function handleConfirm() {
    // Validate required groups
    for (const g of groups) {
      if (g.is_required && (selections[g.id] ?? []).length === 0) {
        return; // could show error, but button is disabled
      }
    }
    const selected: SelectedOption[] = [];
    for (const g of groups) {
      for (const optId of selections[g.id] ?? []) {
        const opt = g.options.find((o) => o.id === optId);
        if (opt) {
          selected.push({
            group_id: g.id,
            group_name: g.name,
            option_id: opt.id,
            option_name: opt.name,
            price_adjustment: Number(opt.price_adjustment),
          });
        }
      }
    }
    onConfirm(selected);
    onClose();
  }

  const allValid = groups.every(
    (g) => !g.is_required || (selections[g.id] ?? []).length > 0,
  );

  return (
    <Dialog open={open && ready} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Pilih Opsi — {menuItemName}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map((g) => (
              <div key={g.id}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold">{g.name}</span>
                  {g.is_required && (
                    <span className="text-[10px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">Wajib</span>
                  )}
                  {g.max_select > 1 && (
                    <span className="text-[10px] text-muted-foreground">Maks. {g.max_select}</span>
                  )}
                </div>
                {g.max_select === 1 ? (
                  <RadioGroup
                    value={selections[g.id]?.[0] ?? ""}
                    onValueChange={(v) => setSelections((prev) => ({ ...prev, [g.id]: [v] }))}
                  >
                    {g.options.map((opt) => (
                      <div key={opt.id} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value={opt.id} id={`opt-${opt.id}`} />
                          <Label htmlFor={`opt-${opt.id}`} className="text-sm cursor-pointer">
                            {opt.name}
                          </Label>
                        </div>
                        {opt.price_adjustment !== 0 && (
                          <span className="text-xs text-muted-foreground">
                            {opt.price_adjustment > 0 ? "+" : ""}{formatIDR(opt.price_adjustment)}
                          </span>
                        )}
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <div className="space-y-1">
                    {g.options.map((opt) => {
                      const checked = (selections[g.id] ?? []).includes(opt.id);
                      return (
                        <div key={opt.id} className="flex items-center justify-between py-1.5">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`opt-${opt.id}`}
                              checked={checked}
                              onCheckedChange={() => toggleOption(g.id, opt.id, g.max_select)}
                            />
                            <Label htmlFor={`opt-${opt.id}`} className="text-sm cursor-pointer">
                              {opt.name}
                            </Label>
                          </div>
                          {opt.price_adjustment !== 0 && (
                            <span className="text-xs text-muted-foreground">
                              {opt.price_adjustment > 0 ? "+" : ""}{formatIDR(opt.price_adjustment)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={handleConfirm} disabled={!allValid || loading}>Konfirmasi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Check if a menu item has option groups (lightweight count check) */
export async function hasModifiers(menuItemId: string, shopId: string): Promise<boolean> {
  const { count } = await supabase
    .from("menu_item_option_groups")
    .select("id", { count: "exact", head: true })
    .eq("menu_item_id", menuItemId)
    .eq("shop_id", shopId);
  return (count ?? 0) > 0;
}
