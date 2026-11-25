// Virtualised table body for the VIRTUAL=1 build variant (FINDINGS.md V-2). Same rows and
// markup as the default list; only the rows near the viewport are mounted, with spacer rows
// standing in for the rest so the window scrollbar keeps its full height.
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { type ReactNode, useLayoutEffect, useRef, useState } from 'react'

// Fixed row height: name line + e-mail line + padding + border, as rendered by the list styles.
export const ROW_HEIGHT = 50
const COLUMNS = 7

export function VirtualRows<T>({ items, renderRow }: { items: T[]; renderRow: (item: T) => ReactNode }) {
  // React Compiler 1.0.0 memoises `virtualizer.getVirtualItems()` on the stable virtualizer
  // instance, so without this opt-out the window never moves on scroll (FINDINGS.md V-2).
  'use no memo'
  const body = useRef<HTMLTableSectionElement>(null)
  const [scrollMargin, setScrollMargin] = useState(0)
  useLayoutEffect(() => {
    setScrollMargin(body.current!.getBoundingClientRect().top + window.scrollY)
  }, [])
  const virtualizer = useWindowVirtualizer({
    count: items.length,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
    scrollMargin,
  })
  const rows = virtualizer.getVirtualItems()
  const before = rows.length ? rows[0]!.start - scrollMargin : 0
  const after = rows.length ? virtualizer.getTotalSize() - (rows.at(-1)!.end - scrollMargin) : 0

  return (
    <tbody ref={body} data-testid="virtual-body" data-total={items.length}>
      {before > 0 && (
        <tr aria-hidden="true" style={{ height: before }}>
          <td colSpan={COLUMNS} />
        </tr>
      )}
      {rows.map((row) => renderRow(items[row.index]!))}
      {after > 0 && (
        <tr aria-hidden="true" style={{ height: after }}>
          <td colSpan={COLUMNS} />
        </tr>
      )}
    </tbody>
  )
}
