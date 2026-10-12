"use client";
/**
 * useSelection: row selection for bulk actions, scoped to the rows on screen.
 *
 *   const sel = useSelection(list.items, (p) => p.id);
 *   <DataTable selectedIds={sel.selected} onSelectionChange={sel.setSelected} … />
 *   <Button onClick={() => bulk(sel.selected)}>Delete {sel.selected.length}</Button>
 *
 * Ids that are no longer in `items` (after a page change or reload) drop out automatically.
 */
import { useMemo, useState } from "react";

export function useSelection<T, Id extends string | number>(items: T[], getId: (row: T) => Id) {
  const [stored, setSelected] = useState<Id[]>([]);
  const selected = useMemo(() => {
    const visible = new Set(items.map(getId));
    return stored.filter((id) => visible.has(id));
    // getId is expected to be a stable accessor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, stored]);

  return {
    selected,
    setSelected,
    clear: () => setSelected([]),
    isSelected: (id: Id) => selected.includes(id),
  };
}
