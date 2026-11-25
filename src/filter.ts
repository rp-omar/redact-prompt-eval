import type { Item } from './api'

/** Case-insensitive substring match over the columns shown in the list. */
export function filterItems(items: readonly Item[], query: string): readonly Item[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return items
  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(needle) ||
      item.email.includes(needle) ||
      item.company.toLowerCase().includes(needle) ||
      item.role.toLowerCase().includes(needle) ||
      item.country.toLowerCase().includes(needle) ||
      item.status.includes(needle),
  )
}
