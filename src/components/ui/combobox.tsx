"use client";
import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ComboOption = { value: string; label: string; hint?: string };

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Selecteer...",
  emptyText = "Geen resultaten.",
  className,
  clearable,
  recentValues,
}: {
  options: ComboOption[];
  value: string | null;
  onChange: (v: string | null) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  clearable?: boolean;
  recentValues?: string[];
}) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value);

  const sortedOptions = React.useMemo(() => {
    if (!recentValues || recentValues.length === 0) return options;
    const recentSet = new Set(recentValues);
    const recent = recentValues
      .map((rv) => options.find((o) => o.value === rv))
      .filter((o): o is ComboOption => Boolean(o));
    const rest = options.filter((o) => !recentSet.has(o.value));
    return [...recent, ...rest];
  }, [options, recentValues]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.label : placeholder}
          </span>
          <span className="ml-2 flex items-center gap-1">
            {clearable && selected ? (
              <X
                className="h-4 w-4 opacity-60 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
              />
            ) : null}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <CommandPrimitive className="overflow-hidden rounded-md">
          <div className="border-b px-3">
            <CommandPrimitive.Input
              placeholder="Zoeken..."
              className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <CommandPrimitive.List className="max-h-72 overflow-auto p-1">
            <CommandPrimitive.Empty className="py-4 text-center text-sm text-muted-foreground">
              {emptyText}
            </CommandPrimitive.Empty>
            {recentValues && recentValues.length > 0 ? (
              <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                Recent gebruikt
              </div>
            ) : null}
            {sortedOptions.map((o, idx) => {
              const isRecent =
                recentValues && idx < recentValues.length && recentValues.includes(o.value);
              const showDivider =
                recentValues &&
                recentValues.length > 0 &&
                idx === recentValues.length &&
                !isRecent;
              return (
                <React.Fragment key={o.value}>
                  {showDivider ? <div className="my-1 h-px bg-border" /> : null}
                  <CommandPrimitive.Item
                    value={`${o.label} ${o.hint ?? ""}`}
                    onSelect={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm aria-selected:bg-accent"
                  >
                    <Check
                      className={cn("h-4 w-4", value === o.value ? "opacity-100" : "opacity-0")}
                    />
                    <div className="flex flex-1 flex-col">
                      <span>{o.label}</span>
                      {o.hint ? <span className="text-xs text-muted-foreground">{o.hint}</span> : null}
                    </div>
                  </CommandPrimitive.Item>
                </React.Fragment>
              );
            })}
          </CommandPrimitive.List>
        </CommandPrimitive>
      </PopoverContent>
    </Popover>
  );
}
