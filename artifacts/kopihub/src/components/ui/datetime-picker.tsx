import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DateTimePickerProps {
  /** Value as `yyyy-MM-ddTHH:mm` (the same format as <input type="datetime-local">) or empty string. */
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  clearable?: boolean;
  /** Show the time row. Defaults to true. */
  withTime?: boolean;
}

function parseValue(value: string): Date | undefined {
  if (!value) return undefined;
  // Accept both "yyyy-MM-ddTHH:mm" and "yyyy-MM-dd"
  const fmt = value.length > 10 ? "yyyy-MM-dd'T'HH:mm" : "yyyy-MM-dd";
  const d = parse(value, fmt, new Date());
  return isValid(d) ? d : undefined;
}

function toInputValue(date: Date, withTime: boolean): string {
  return format(date, withTime ? "yyyy-MM-dd'T'HH:mm" : "yyyy-MM-dd");
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pilih tanggal",
  className,
  disabled,
  clearable = true,
  withTime = true,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const date = parseValue(value);
  const time = date ? format(date, "HH:mm") : "";

  const handleSelectDate = (next: Date | undefined) => {
    if (!next) return;
    const merged = new Date(next);
    if (date) {
      merged.setHours(date.getHours(), date.getMinutes(), 0, 0);
    } else if (withTime) {
      merged.setHours(0, 0, 0, 0);
    }
    onChange(toInputValue(merged, withTime));
    if (!withTime) setOpen(false);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = e.target.value; // HH:mm
    const base = date ?? new Date();
    const [h, m] = t.split(":").map(Number);
    const merged = new Date(base);
    merged.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
    onChange(toInputValue(merged, true));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">
            {date
              ? format(date, withTime ? "d MMM yyyy, HH:mm" : "d MMM yyyy", { locale: localeId })
              : placeholder}
          </span>
          {clearable && date && !disabled && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Hapus tanggal"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange("");
                }
              }}
              className="ml-2 rounded-sm p-0.5 opacity-60 hover:opacity-100 hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelectDate}
          initialFocus
          locale={localeId}
          className={cn("p-3 pointer-events-auto")}
        />
        {withTime && (
          <div className="flex items-center justify-between gap-2 border-t p-3">
            <span className="text-xs text-muted-foreground">Waktu</span>
            <Input
              type="time"
              value={time}
              onChange={handleTimeChange}
              className="w-[130px]"
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
