/**
 * moveItem: a copy of `items` with the item at `from` moved to `to` (the same array
 * when `to` is out of range or equal). Used by banner and category reordering.
 *
 *   moveItem(["a", "b", "c"], 2, 0) → ["c", "a", "b"]
 */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || to < 0 || to >= items.length) return items;
  const next = items.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
