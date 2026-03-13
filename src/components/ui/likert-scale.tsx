"use client";

import { cn } from "@/lib/utils";

interface LikertOption {
  value: number;
  label: string;
}

interface LikertScaleProps {
  options: LikertOption[];
  value: number;
  onValueChange: (value: number) => void;
}

export function LikertScale({ options, value, onValueChange }: LikertScaleProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onValueChange(option.value)}
          className={cn(
            "rounded-md border px-3 py-2 text-xs font-medium transition-colors cursor-pointer",
            "hover:bg-primary/10 hover:border-primary/50",
            value === option.value
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-border"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
