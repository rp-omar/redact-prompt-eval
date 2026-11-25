import { queryOptions } from '@tanstack/react-query'
import type { ActivityEvent, Item, ItemDetail } from '../mock/data'

export type { ActivityEvent, Item, ItemDetail }

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) throw new Error(`${response.status} ${url}`)
  return response.json() as Promise<T>
}

// One queryOptions definition per resource, shared by loaders and components.
// staleTime is not in the prompt: without it Query's default (0) makes the intent
// preload and the navigation each fetch the same resource. See FINDINGS.md F-12.
// STALE=0 builds a diagnostic variant with Query's default (FINDINGS.md V-3).
const STALE_MS = __STALE_MS__

export const itemsQueryOptions = queryOptions({
  queryKey: ['items'],
  queryFn: () => getJson<Item[]>('/api/items'),
  staleTime: STALE_MS,
})

export const itemQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['items', id],
    queryFn: () => getJson<ItemDetail>(`/api/items/${id}`),
    staleTime: STALE_MS,
  })

export const activityQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['items', id, 'activity'],
    queryFn: () => getJson<ActivityEvent[]>(`/api/items/${id}/activity`),
    staleTime: STALE_MS,
  })

export const saveItem = (id: string, patch: Partial<ItemDetail>) =>
  getJson<ItemDetail>(`/api/items/${id}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  })
