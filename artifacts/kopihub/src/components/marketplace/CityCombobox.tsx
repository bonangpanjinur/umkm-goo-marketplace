import { useState } from "react";
import { Check, ChevronsUpDown, Loader2, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useIndonesiaCities } from "@/lib/cities";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
  className?: string;
  size?: "sm" | "md";
};

export function CityCombobox({
  value,
  onChange,
  placeholder = "Pilih kota",
  className,
  size = "md",
}: Props) {
  const [open, setOpen] = useState(false);
  const { cities, loading, usingFallback } = useIndonesiaCities();

  const heightCls = size === "sm" ? "h-9" : "h-10";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            heightCls,
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="inline-flex items-center gap-2 truncate">
            <MapPin className="h-4 w-4 shrink-0 opacity-60" />
            <span className="truncate">{value || placeholder}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            {value && (
              <span
                role="button"
                aria-label="Hapus pilihan kota"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange("");
                }}
                className="rounded p-0.5 hover:bg-muted"
              >
                <X className="h-3.5 w-3.5 opacity-60" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Cari kota / kabupaten…" />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Memuat daftar kota…
              </div>
            ) : (
              <>
                {usingFallback && (
                  <div className="border-b px-3 py-2 text-[11px] text-amber-700 bg-amber-50">
                    Daftar kota lengkap tidak bisa dimuat. Menampilkan {cities.length} kota utama.
                  </div>
                )}
                <CommandEmpty>Kota tidak ditemukan.</CommandEmpty>
                <CommandGroup className="max-h-72 overflow-auto">
                  {cities.map((c) => (
                    <CommandItem
                      key={c}
                      value={c}
                      onSelect={() => {
                        onChange(c === value ? "" : c);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === c ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {c}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
