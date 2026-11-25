import * as stylex from '@stylexjs/stylex'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useDeferredValue, useState } from 'react'
import { type Item, itemsQueryOptions } from '../api'
import { filterItems } from '../filter'

type Search = { deferred?: boolean }

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): Search =>
    search.deferred === true || search.deferred === 'true' || search.deferred === 1 ? { deferred: true } : {},
  // Cached list data is acceptable when coming back from a detail page.
  loader: ({ context }) => context.queryClient.query({ ...itemsQueryOptions, staleTime: 'static' }),
  component: Directory,
})

function Directory() {
  const { data: items } = useSuspenseQuery(itemsQueryOptions)
  const { deferred } = Route.useSearch()
  const [query, setQuery] = useState('')
  // ?deferred=1 switches the list to useDeferredValue so both strategies can be measured.
  const deferredQuery = useDeferredValue(query)
  const applied = deferred ? deferredQuery : query
  const visible = filterItems(items, applied)

  return (
    <section>
      <div {...stylex.props(styles.toolbar)}>
        <h1 {...stylex.props(styles.title)}>Directory</h1>
        <label {...stylex.props(styles.filter)}>
          <span>Filter</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, company, role, country…"
            data-testid="filter"
            {...stylex.props(styles.input)}
          />
        </label>
        <span data-testid="count">
          {visible.length.toLocaleString('en-US')} of {items.length.toLocaleString('en-US')}
        </span>
      </div>
      {/* data-applied tells the benchmark which filter value the committed rows reflect. */}
      <table data-testid="rows" data-applied={applied} {...stylex.props(styles.table)}>
        <thead>
          <tr>
            <th {...stylex.props(styles.th)}>Name</th>
            <th {...stylex.props(styles.th)}>Company</th>
            <th {...stylex.props(styles.th)}>Role</th>
            <th {...stylex.props(styles.th)}>Country</th>
            <th {...stylex.props(styles.th)}>Status</th>
            <th {...stylex.props(styles.th, styles.num)}>Monthly</th>
            <th {...stylex.props(styles.th)}>Updated</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((item) => (
            <Row key={item.id} item={item} />
          ))}
        </tbody>
      </table>
    </section>
  )
}

function Row({ item }: { item: Item }) {
  return (
    <tr data-testid="row">
      <td {...stylex.props(styles.td)}>
        <Link to="/items/$id" params={{ id: item.id }} {...stylex.props(styles.link)}>
          {item.name}
        </Link>
        <div {...stylex.props(styles.sub)}>{item.email}</div>
      </td>
      <td {...stylex.props(styles.td)}>{item.company}</td>
      <td {...stylex.props(styles.td)}>{item.role}</td>
      <td {...stylex.props(styles.td)}>{item.country}</td>
      <td {...stylex.props(styles.td)}>
        <span {...stylex.props(styles.badge, item.status === 'active' && styles.badgeActive)}>{item.status}</span>
      </td>
      <td {...stylex.props(styles.td, styles.num)}>${item.amount.toLocaleString('en-US')}</td>
      <td {...stylex.props(styles.td)}>{item.updatedAt}</td>
    </tr>
  )
}

const border = 'color-mix(in srgb, currentColor 12%, transparent)'

const styles = stylex.create({
  toolbar: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, flexWrap: 'wrap' },
  title: { fontSize: 22, margin: 0 },
  filter: { display: 'flex', alignItems: 'center', gap: 8, flexGrow: 1 },
  input: {
    flexGrow: 1,
    maxWidth: 420,
    paddingBlock: 6,
    paddingInline: 10,
    fontSize: 15,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: border,
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: {
    textAlign: 'left',
    paddingBlock: 6,
    paddingInline: 8,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: border,
  },
  td: {
    paddingBlock: 6,
    paddingInline: 8,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: border,
    verticalAlign: 'top',
  },
  num: { textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
  link: { color: '#2f6fed', fontWeight: 600, textDecoration: { default: 'none', ':hover': 'underline' } },
  sub: { opacity: 0.7, fontSize: 12 },
  badge: {
    display: 'inline-block',
    paddingBlock: 1,
    paddingInline: 8,
    borderRadius: 999,
    fontSize: 12,
    backgroundColor: 'color-mix(in srgb, currentColor 10%, transparent)',
  },
  badgeActive: { backgroundColor: 'color-mix(in srgb, #1f9d55 22%, transparent)' },
})
