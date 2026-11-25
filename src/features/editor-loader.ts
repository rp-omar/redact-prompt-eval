import { lazy } from 'react'

// One import() shared by React.lazy and the hover/focus/press warm-up, so the
// module cache is warm by the time the editor opens and the chunk is fetched once.
export const loadEditor = () => import('./ItemEditor')
export const ItemEditor = lazy(loadEditor)
