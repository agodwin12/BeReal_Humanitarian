"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";

// Up / down reorder buttons (no drag-and-drop dependency needed).
export function SortControls({
  index,
  count,
  onMove,
  disabled,
}: {
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <Button variant="ghost" size="icon-sm" aria-label="Move up" disabled={disabled || index === 0} onClick={() => onMove(index, index - 1)}>
        <ChevronUp className="size-4" />
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label="Move down" disabled={disabled || index >= count - 1} onClick={() => onMove(index, index + 1)}>
        <ChevronDown className="size-4" />
      </Button>
    </div>
  );
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
