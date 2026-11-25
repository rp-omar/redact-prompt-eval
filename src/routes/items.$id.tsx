import * as stylex from '@stylexjs/stylex'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { activityQueryOptions, itemQueryOptions } from '../api'
import { ItemEditor, loadEditor } from '../features/editor-loader'

type Search = { edit?: boolean }

export const Route = createFileRoute('/items/$id')({
  validateSearch: (search: Record<string, unknown>): Search =>
    search.edit === true || search.edit === 'true' || search.edit === 1 ? { edit: true } : {},
  loader: async ({ context, params }) => {
    // Secondary panel: start it, do not block navigation on it.
    void context.queryClient.query(activityQueryOptions(params.id)).catch(() => {})
    // Required data: awaited, in parallel with the route component download.
    await context.queryClient.query(itemQueryOptions(params.id))
  },
  component: ItemPage,
})

function ItemPage() {
  const { id } = Route.useParams()
  const { edit } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: item } = useSuspenseQuery(itemQueryOptions(id))
  const setEditing = (open: boolean) => navigate({ search: open ? { edit: true } : {}, replace: true })

  return (
    <article>
      <Link to="/" {...stylex.props(styles.back)}>
        ← Directory
      </Link>
      <div {...stylex.props(styles.head)}>
        <h1 data-testid="item-name" {...stylex.props(styles.title)}>
          {item.name}
        </h1>
        <button
          type="button"
          data-testid="edit"
          // Warm the editor chunk on deliberate intent; open it on activation.
          onPointerEnter={loadEditor}
          onFocus={loadEditor}
          onPointerDown={loadEditor}
          onClick={() => setEditing(true)}
        >
          Edit
        </button>
      </div>
      <dl {...stylex.props(styles.facts)}>
        <dt>Email</dt>
        <dd>{item.email}</dd>
        <dt>Company</dt>
        <dd>{item.company}</dd>
        <dt>Role</dt>
        <dd>{item.role}</dd>
        <dt>Country</dt>
        <dd>{item.country}</dd>
        <dt>Status</dt>
        <dd data-testid="item-status">{item.status}</dd>
        <dt>Manager</dt>
        <dd>{item.manager}</dd>
        <dt>Notes</dt>
        <dd>{item.notes}</dd>
      </dl>

      <h2 {...stylex.props(styles.subhead)}>Activity</h2>
      <Suspense fallback={<p data-testid="activity-fallback">Loading activity…</p>}>
        <Activity id={id} />
      </Suspense>

      {edit ? (
        <Suspense fallback={null}>
          <ItemEditor item={item} onClose={() => setEditing(false)} />
        </Suspense>
      ) : null}
    </article>
  )
}

function Activity({ id }: { id: string }) {
  const { data: events } = useSuspenseQuery(activityQueryOptions(id))
  return (
    <ul data-testid="activity" {...stylex.props(styles.activity)}>
      {events.map((event) => (
        <li key={event.id}>
          <time dateTime={event.at}>{event.at}</time> · {event.kind} · {event.summary}
        </li>
      ))}
    </ul>
  )
}

const styles = stylex.create({
  back: { color: '#2f6fed', textDecoration: 'none', fontSize: 14 },
  head: { display: 'flex', alignItems: 'center', gap: 16, marginBlock: 12 },
  title: { fontSize: 24, margin: 0 },
  subhead: { fontSize: 16, marginTop: 24 },
  facts: {
    display: 'grid',
    gridTemplateColumns: 'max-content 1fr',
    columnGap: 16,
    rowGap: 6,
    margin: 0,
    fontSize: 14,
  },
  activity: { paddingLeft: 18, fontSize: 14, lineHeight: 1.7 },
})
